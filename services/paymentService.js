import { httpFetch } from "../lib/http.js";
import { sendHTMLMessage } from "../lib/telegram.js";
import { ACB_API_ENDPOINT } from "../config/constants.js";
import { getSettings, getAdminList } from "../models/settingModel.js";
import { findTransaction, insertTransaction } from "../models/transactionModel.js";
import { updateBalance } from "../models/userModel.js";
import { buildTransferNote } from "./bankService.js";
import { logger } from "../utils/logger.js";
import { getLocale, DEFAULT_LANGUAGE } from "../config/i18n.js";

const processedTransactionCache = new Set();
const MAX_CACHED_TRANSACTIONS = 2000;
const processedUsers = new Map();
const USER_CACHE_TTL = 10 * 60 * 1000;

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toNoticeHtml(text = "") {
  const lines = String(text ?? "").split(/\r?\n/);
  const formatted = lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (index === 0) {
      return `<b>${escapeHtml(trimmed)}</b>`;
    }
    const labelMatch = trimmed.match(/^([^:]{1,42}):\s*(.+)$/u);
    if (labelMatch) {
      return `<b>${escapeHtml(labelMatch[1])}:</b> ${escapeHtml(labelMatch[2])}`;
    }
    return escapeHtml(trimmed);
  });
  return formatted.join("\n");
}

function hasCachedTransaction(tranId) {
  return processedTransactionCache.has(tranId);
}

function cacheTransactionId(tranId) {
  if (!tranId) return;
  processedTransactionCache.add(tranId);
  if (processedTransactionCache.size > MAX_CACHED_TRANSACTIONS) {
    const first = processedTransactionCache.values().next().value;
    if (first) {
      processedTransactionCache.delete(first);
    }
  }
}

function normalizeNote(value = "") {
  return String(value || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function extractUserFromDescription(description = "", baseNormalized) {
  const normalized = normalizeNote(description);
  if (!baseNormalized) {
    const fallback = normalized.match(/\d+/);
    return { normalized, userId: fallback ? parseInt(fallback[0], 10) : null };
  }
  const idx = normalized.indexOf(baseNormalized);
  if (idx === -1) {
    return { normalized, userId: null };
  }
  const rest = normalized.slice(idx + baseNormalized.length);
  const match = rest.match(/^(\d+)/);
  return { normalized, userId: match ? parseInt(match[0], 10) : null };
}

function cacheUserProcessed(userId, tranId) {
  if (!userId || !tranId) return;
  processedUsers.set(userId, { tranId, at: Date.now() });
}

function wasUserProcessed(userId) {
  if (!userId) return null;
  const entry = processedUsers.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.at > USER_CACHE_TTL) {
    processedUsers.delete(userId);
    return null;
  }
  return entry.tranId;
}

async function fetchAcbPayload(settings) {
  if (!settings?.acb_token) {
    return { ok: false, reason: "missing_token" };
  }

  const url = `${ACB_API_ENDPOINT}/${settings.acb_token}`;
  try {
    const res = await httpFetch(url);
    const payload = await res.json();
    if (payload.status !== "success" || !Array.isArray(payload.transactions)) {
      return { ok: false, reason: "invalid_payload", payload };
    }
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, reason: error.message || "fetch_failed" };
  }
}

export async function fetchAcbTransactions(db, limit = 5) {
  const settings = await getSettings(db);
  const result = await fetchAcbPayload(settings);
  if (!result.ok) {
    return result;
  }

  const list = result.payload.transactions || [];
  return {
    ok: true,
    transactions: typeof limit === "number" ? list.slice(0, limit) : list,
    payload: result.payload
  };
}

async function processTransactions(db, transactions, settings, { targetUserId = null } = {}) {
  const baseNote = (settings.topup_note || "NAP").trim().toUpperCase();
  const baseNormalized = normalizeNote(baseNote);
  let hasMatch = false;
  let credited = false;
  
  for (const tran of transactions) {
    const tranId = tran.transactionID || tran.transId || tran.id;
    if (!tranId || hasCachedTransaction(tranId)) {
      continue;
    }

    const type = String(tran.type || "IN").toUpperCase();
    if (type === "OUT") {
      cacheTransactionId(tranId);
      continue;
    }

    const exists = await findTransaction(db, tranId);
    if (exists) {
      cacheTransactionId(tranId);
      continue;
    }

    const { normalized, userId } = extractUserFromDescription(tran.description || "", baseNormalized);
    if (!userId) {
      logger.warn("Bỏ qua giao dịch vì không tìm thấy mã người dùng hợp lệ", { tranId, description: tran.description });
      cacheTransactionId(tranId);
      continue;
    }

    if (targetUserId && userId !== targetUserId) {
      continue;
    }

    const expectedToken = `${baseNormalized}${userId}`;
    if (expectedToken && !normalized.includes(expectedToken)) {
      logger.warn("Bỏ qua giao dịch vì nội dung chuyển khoản không khớp định dạng", {
        tranId,
        description: tran.description
      });
      cacheTransactionId(tranId);
      continue;
    }

    const amount = Number(tran.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      logger.warn("Bỏ qua giao dịch có số tiền không hợp lệ", tran);
      cacheTransactionId(tranId);
      continue;
    }

    hasMatch = true;
    const updatedUser = await updateBalance(db, userId, amount);

    try {
      await insertTransaction(db, {
        tran_id: tranId,
        amount,
        user_id: userId,
        description: tran.description || null,
        source: "auto_bank"
      });
    } catch (error) {
      if (error?.message?.includes("duplicate key value")) {
        logger.warn("Bỏ qua giao dịch vì đã tồn tại", { tranId });
        cacheTransactionId(tranId);
        continue;
      }
      throw error;
    }

    cacheTransactionId(tranId);
    credited = true;
    cacheUserProcessed(userId, tranId);
    await notifyTopup({
      user: updatedUser,
      amount,
      tran: {
        id: tranId,
        description: tran.description || "",
        transactionDate: tran.transactionDate || tran.created_at || null
      },
      settings
    });

    if (targetUserId) {
      break;
    }
  }

  return { hasMatch, credited };
}

export async function checkPayment(db) {
  const settings = await getSettings(db);
  const { ok, payload, reason } = await fetchAcbPayload(settings);
  if (!ok) {
    logger.warn("Không thể kiểm tra thanh toán ACB", reason);
    return;
  }

  await processTransactions(db, payload.transactions, settings);
}

export async function processManualTopup(db, settings, user) {
  const expectedNote = buildTransferNote(settings, user.user_id);
  const { ok, payload, reason } = await fetchAcbPayload(settings);
  if (!ok) {
    return { ok: false, reason };
  }

  const result = await processTransactions(db, payload.transactions, settings, {
    targetUserId: user.user_id
  });

  return {
    ok: true,
    note: expectedNote,
    found: result.hasMatch,
    credited: result.credited
  };
}

async function notifyTopup({ user, amount, tran, settings }) {
  const messagePayload = {
    amount,
    tranId: tran?.id,
    description: tran?.description,
    transactionDate: tran?.transactionDate
  };

  try {
    const locale = getLocale(user?.language || DEFAULT_LANGUAGE);
    await sendHTMLMessage(user.user_id, toNoticeHtml(locale.texts.autoTopupSuccess(messagePayload)));
  } catch (error) {
    logger.error("Không gửi được thông báo nạp tiền cho người dùng", error.message);
  }

  const admins = getAdminList(settings);
  if (!admins.length) {
    return;
  }

  const defaultLocale = getLocale(DEFAULT_LANGUAGE);
  const adminPayload = {
    ...messagePayload,
    userId: user.user_id
  };
  const text = defaultLocale.texts.autoTopupNotifyAdmin(adminPayload);
  await Promise.all(
    admins.map(adminId =>
      sendHTMLMessage(adminId, toNoticeHtml(text)).catch(err => logger.error("Không gửi được thông báo admin", err.message))
    )
  );
}

export async function testAcbConnection(db) {
  const result = await fetchAcbTransactions(db, 5);
  if (!result.ok) {
    return result;
  }
  return { ok: true, count: result.transactions.length, transactions: result.transactions };
}

