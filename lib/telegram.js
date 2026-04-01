import { httpFetch } from "./http.js";
import { logger } from "../utils/logger.js";

function parseIntEnv(value, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (normalized < min || normalized > max) return fallback;
  return normalized;
}

function normalizeApiBase(url) {
  if (!url) return "https://api.telegram.org";
  return String(url).replace(/\/+$/, "");
}

const token = process.env.TOKEN;
const TELEGRAM_API_BASE = normalizeApiBase(process.env.TELEGRAM_API_BASE);
const API_BASE = token ? `${TELEGRAM_API_BASE}/bot${token}` : null;
const TELEGRAM_TIMEOUT_MS = parseIntEnv(process.env.TELEGRAM_TIMEOUT_MS, 16000, { min: 1000, max: 120000 });
const TELEGRAM_MAX_RETRIES = parseIntEnv(process.env.TELEGRAM_MAX_RETRIES, 3, { min: 0, max: 10 });
const TELEGRAM_RETRY_BASE_MS = parseIntEnv(process.env.TELEGRAM_RETRY_BASE_MS, 600, { min: 100, max: 30000 });
const TELEGRAM_RETRY_MAX_MS = parseIntEnv(process.env.TELEGRAM_RETRY_MAX_MS, 5000, { min: 200, max: 120000 });

if (!API_BASE) {
  logger.warn("TOKEN env is missing. Telegram calls will fail until it is set.");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorCode(error) {
  return (
    error?.code ||
    error?.cause?.code ||
    (Array.isArray(error?.cause?.errors) && error.cause.errors.length ? error.cause.errors[0]?.code : null)
  );
}

function isRetryableTelegramError(error) {
  const code = String(getErrorCode(error) || "").toUpperCase();
  const name = String(error?.name || "").toUpperCase();
  const message = `${error?.message || ""} ${error?.cause?.message || ""}`.toUpperCase();
  const retryableCodes = [
    "ETIMEDOUT",
    "ECONNRESET",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ECONNREFUSED",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET"
  ];
  if (retryableCodes.includes(code)) return true;
  if (name === "ABORTERROR" || code === "ABORT_ERR") return true;
  return /TIMEOUT|TIMED OUT|NETWORK/.test(message);
}

function calcRetryDelay(attempt) {
  const exponential = TELEGRAM_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempt));
  const jitterMs = Math.floor(Math.random() * 150);
  return Math.min(TELEGRAM_RETRY_MAX_MS, exponential + jitterMs);
}

function formatTelegramFetchError(error) {
  const code = getErrorCode(error);
  const message = error?.message || "fetch failed";
  return code ? `${message} (${code})` : message;
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkifyInline(value = "") {
  const text = String(value ?? "");
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  let output = "";
  let lastIndex = 0;
  let match = urlRegex.exec(text);

  while (match) {
    const [url] = match;
    const start = match.index;
    output += escapeHtml(text.slice(lastIndex, start));
    output += `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
    lastIndex = start + url.length;
    match = urlRegex.exec(text);
  }

  output += escapeHtml(text.slice(lastIndex));
  return output;
}

function formatInlineValue(value = "") {
  return linkifyInline(value);
}

function isSensitiveLabel(label = "") {
  const normalized = String(label).trim().toLowerCase();
  return /(token|secret|key|password|mat khau|mật khẩu)/i.test(normalized);
}

function isNoteLabel(label = "") {
  const normalized = String(label).trim().toLowerCase();
  return /^(luu y|lưu ý|ghi chu|ghi chú|note)$/i.test(normalized);
}

function looksLikeHtml(text = "") {
  return /<\/?[a-z][\s\S]*>/i.test(String(text ?? ""));
}

function beautifyHtmlLine(line = "") {
  if (!line) return "";
  const trimmed = line.trim();
  if (!trimmed) return "";

  if (/^(https?:\/\/|tg:\/\/)/i.test(trimmed)) {
    return `<a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a>`;
  }

  const bulletMatch = trimmed.match(/^([\u2022\-]\s+)(.+)$/u);
  const prefix = bulletMatch ? bulletMatch[1] : "";
  const content = bulletMatch ? bulletMatch[2] : trimmed;
  const indexMatch = content.match(/^(\d+)\.\s+(.+)$/u);
  const amountMatch = content.match(/^([+-][\d.,]+(?:[.,]\d+)?\s*(?:\u20AB|VND|vnd)?)\s*[\u2022·]\s*(.+)$/u);
  const labelMatch = content.match(/^([^:]{1,42}):\s*(.+)$/u);
  const sectionMatch = content.match(/^(.+):$/u);

  if (indexMatch) {
    return `${escapeHtml(prefix)}<b>${escapeHtml(indexMatch[1])}.</b> ${formatInlineValue(indexMatch[2])}`;
  }

  if (amountMatch) {
    return `${escapeHtml(prefix)}<b>${escapeHtml(amountMatch[1])}</b> \u2022 ${formatInlineValue(amountMatch[2])}`;
  }

  if (labelMatch && !/^https?/i.test(labelMatch[1])) {
    const label = labelMatch[1].trim();
    const rawValue = labelMatch[2].trim();
    let formattedValue = formatInlineValue(rawValue);
    if (isSensitiveLabel(label) && rawValue) {
      formattedValue = `<tg-spoiler>${escapeHtml(rawValue)}</tg-spoiler>`;
    }
    if (isNoteLabel(label)) {
      return `${escapeHtml(prefix)}<i>${escapeHtml(label)}:</i> ${formattedValue}`;
    }
    return `${escapeHtml(prefix)}<b>${escapeHtml(label)}:</b> ${formattedValue}`;
  }

  if (sectionMatch) {
    return `${escapeHtml(prefix)}<b>${escapeHtml(sectionMatch[1])}:</b>`;
  }

  return `${escapeHtml(prefix)}${formatInlineValue(content)}`;
}

function buildHtmlMessageText(text = "", rawHtml = false) {
  if (rawHtml || looksLikeHtml(text)) {
    return String(text ?? "");
  }
  const lines = String(text ?? "").split(/\r?\n/);
  const formattedLines = [];
  let inCodeBlock = false;
  let codeLang = "";

  for (const line of lines) {
    const fence = line.trim().match(/^```([a-z0-9_-]+)?$/i);
    if (fence) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = fence[1] || "";
        const languageAttr = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
        formattedLines.push(`<pre><code${languageAttr}>`);
      } else {
        formattedLines.push("</code></pre>");
        inCodeBlock = false;
        codeLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      formattedLines.push(escapeHtml(line));
      continue;
    }

    formattedLines.push(beautifyHtmlLine(line));
  }

  if (inCodeBlock) {
    formattedLines.push("</code></pre>");
  }

  const firstContentIndex = formattedLines.findIndex(line => line.trim().length > 0);
  if (firstContentIndex !== -1 && !/<\/?[a-z][\s\S]*>/i.test(formattedLines[firstContentIndex])) {
    formattedLines[firstContentIndex] = `<b>${formattedLines[firstContentIndex]}</b>`;
  }

  return formattedLines.join("\n");
}

async function callTelegram(method, payload) {
  if (!API_BASE) {
    return {
      ok: false,
      error_code: -1,
      description: "TOKEN is not configured"
    };
  }

  const retries = TELEGRAM_MAX_RETRIES;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS) : null;

    try {
      const response = await httpFetch(`${API_BASE}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller?.signal
      });

      const data = await response.json();
      if (attempt > 0) {
        logger.info(`Telegram API ${method} recovered after retry`, {
          attempts: attempt + 1
        });
      }
      if (!data.ok) {
        logger.error(`Telegram API ${method} failed`, data);
      }
      return data;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && isRetryableTelegramError(error);
      if (canRetry) {
        const waitMs = calcRetryDelay(attempt);
        logger.warn(`Telegram API ${method} retrying`, {
          attempt: attempt + 1,
          waitMs,
          error: formatTelegramFetchError(error)
        });
        await sleep(waitMs);
        continue;
      }

      logger.error(`Telegram API ${method} fetch failed`, {
        error: formatTelegramFetchError(error)
      });
      return {
        ok: false,
        error_code: -1,
        description: formatTelegramFetchError(error)
      };
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  return {
    ok: false,
    error_code: -1,
    description: formatTelegramFetchError(lastError)
  };
}

export function sendMessage(chatId, text, keyboard = null, options = {}) {
  const parseMode = options.parse_mode || "HTML";
  const payload = {
    chat_id: chatId,
    text: parseMode === "HTML" ? buildHtmlMessageText(text, Boolean(options.raw_html)) : String(text ?? ""),
    parse_mode: parseMode
  };
  const replyMarkup = keyboard ?? options.reply_markup;
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return callTelegram("sendMessage", payload);
}

export function sendHTMLMessage(chatId, text, keyboard = null) {
  return sendMessage(chatId, text, keyboard, {
    parse_mode: "HTML",
    raw_html: true
  });
}

export function sendPhoto(chatId, photoUrl, caption = "", keyboard = null, options = {}) {
  const parseMode = options.parse_mode || "HTML";
  const payload = {
    chat_id: chatId,
    photo: photoUrl,
    caption: parseMode === "HTML" ? buildHtmlMessageText(caption, Boolean(options.raw_html)) : String(caption ?? ""),
    parse_mode: parseMode
  };
  if (keyboard) {
    payload.reply_markup = keyboard;
  }
  return callTelegram("sendPhoto", payload);
}

export function answerCallbackQuery(callbackQueryId, text) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: Boolean(text)
  });
}

export function setWebhook(url) {
  return callTelegram("setWebhook", { url });
}

export function getTelegramFile(fileId) {
  return callTelegram("getFile", { file_id: fileId });
}

export async function downloadTelegramFile(filePath) {
  if (!token) {
    throw new Error("TOKEN is not configured");
  }
  if (!filePath) {
    throw new Error("filePath is required");
  }
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await httpFetch(url);
  if (!response.ok) {
    throw new Error(`Cannot download Telegram file: HTTP ${response.status}`);
  }
  return response.text();
}

