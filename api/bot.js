import "../config/loadEnv.js";
import { connectDB } from "../lib/db.js";
import { sendHTMLMessage, sendMessage, sendPhoto } from "../lib/telegram.js";
import { holdAccount } from "../services/holdService.js";
import { ensureUser, getBalance } from "../services/buyService.js";
import { getUserById, updateBalance as updateUserBalance, listRecentUsers } from "../models/userModel.js";
import { importAccounts } from "../services/importService.js";
import {
  updateAcbToken,
  addAdmin,
  removeAdmin,
  getSettings,
  getAdminList,
  setPendingPrompt,
  getPendingPrompt,
  clearPendingPrompt,
  updateBankField
} from "../models/settingModel.js";
import {
  mainMenu,
  adminMenu,
  adminSettingsMenu,
  personalMenu,
  languageMenu,
  autoBankMenu,
  acbTokenMenu,
  bankSettingsMenu,
  customerInfoMenu,
  manualAdjustActionMenu,
  cancelMenu,
  setupMenu,
  adminManageMenu,
  adminRemoveMenu,
  topupActionMenu
} from "../utils/keyboard.js";
import { DEFAULT_LANGUAGE, detectLanguageSelection, getLanguageName, getLocale } from "../config/i18n.js";
import { DEFAULT_ACCOUNT_TYPE } from "../config/constants.js";
import { parseCommand, extractUserId } from "../utils/parser.js";
import { logger } from "../utils/logger.js";
import { buildCpuMessage, buildPingMessage, buildRestartMessage } from "../services/adminActionService.js";
import { updateLanguage } from "../models/userModel.js";
import { fetchAcbTransactions, processManualTopup } from "../services/paymentService.js";
import { buildUserSnapshot } from "../services/userInfoService.js";
import { validateBankSettings, buildTransferNote, buildVietQrUrl } from "../services/bankService.js";
import { insertTransaction } from "../models/transactionModel.js";
import { checkSchemaReady, bootstrapDatabase, isRelationMissing } from "../services/setupService.js";
import { handleShopFlow } from "../services/shopFlowService.js";

const PROMPT_TYPES = {
  setAcbToken: "setAcbToken",
  bankField: "bankField",
  userInfo: "userInfo",
  manualAdjust: "manualAdjust",
  addAdmin: "addAdmin",
  removeAdmin: "removeAdmin"
};

const TOPUP_KEYWORDS = ["nạp tiền", "nap tien", "top up", "topup"];

const PERSONAL_INFO_COMMANDS = ["/info", "/me", "/thongtin"];
const PERSONAL_BALANCE_HISTORY_COMMANDS = ["/biendong", "/balancehistory", "/lichsusodu"];
const PERSONAL_ORDER_HISTORY_COMMANDS = ["/lsdonhang", "/orders", "/lichsudonhang"];
const PERSONAL_INFO_KEYWORDS = ["info", "thong tin", "thông tin"];
const PERSONAL_BALANCE_HISTORY_KEYWORDS = ["biến động số dư", "bien dong so du"];
const PERSONAL_ORDER_HISTORY_KEYWORDS = ["lịch sử đơn hàng", "lich su don hang"];

const ENV_ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID, 10) : null;

function normalize(text = "") {
  return text.trim().toLowerCase();
}

function parseAmount(text = "") {
  const numbers = text.replace(/[^\d]/g, "");
  if (!numbers) return null;
  const value = parseInt(numbers, 10);
  return Number.isNaN(value) ? null : value;
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMoney(locale, amount = 0) {
  const formatter = new Intl.NumberFormat(locale?.code === "en" ? "en-US" : "vi-VN");
  const numeric = Number(amount);
  return `${formatter.format(Number.isFinite(numeric) ? numeric : 0)}\u20AB`;
}

function formatDate(locale, value) {
  const formatter = new Intl.DateTimeFormat(locale?.code === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  });
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatter.format(new Date());
  }
  return formatter.format(date);
}

function extractTimeFromText(value = "") {
  const match = String(value || "").match(/([01]\d|2[0-3]):[0-5]\d:[0-5]\d/);
  return match ? match[0] : null;
}

function resolveTransactionTime(tran = {}) {
  return tran.transactionTime || tran.time || extractTimeFromText(tran.description || "") || null;
}

function buildPersonalInfoHtml(snapshot, locale) {
  const { user } = snapshot;
  const isVi = locale?.code !== "en";
  const title = isVi ? "Thông tin cá nhân" : "Personal info";
  const nameLabel = isVi ? "Tên" : "Name";
  const balanceLabel = isVi ? "Số dư" : "Balance";
  const botLangLabel = isVi ? "Ngôn ngữ bot" : "Bot language";
  const tgLangLabel = isVi ? "Ngôn ngữ Telegram" : "Telegram language";
  const createdLabel = isVi ? "Tạo lúc" : "Created";
  const activeLabel = isVi ? "Hoạt động gần nhất" : "Last seen";

  const fullName = user.full_name || (isVi ? "(chưa có)" : "(not set)");
  const username = user.username ? `@${user.username}` : isVi ? "(chưa có)" : "(not set)";
  const tgLang = user.telegram_language || (isVi ? "(không rõ)" : "(unknown)");
  return [
    `<b>${title}</b>`,
    `<b>ID:</b> ${escapeHtml(user.user_id)}`,
    `<b>${nameLabel}:</b> ${escapeHtml(fullName)}`,
    `<b>Username:</b> ${escapeHtml(username)}`,
    `<b>${balanceLabel}:</b> ${escapeHtml(formatMoney(locale, user.balance || 0))}`,
    `<b>${botLangLabel}:</b> ${escapeHtml((user.language || DEFAULT_LANGUAGE).toUpperCase())}`,
    `<b>${tgLangLabel}:</b> ${escapeHtml(tgLang)}`,
    `<b>${createdLabel}:</b> ${escapeHtml(formatDate(locale, user.created_at))}`,
    `<b>${activeLabel}:</b> ${escapeHtml(formatDate(locale, user.last_seen_at))}`
  ].join("\n");
}

function buildBalanceChangesHtml(snapshot, locale) {
  const isVi = locale?.code !== "en";
  const title = isVi ? "Biến động số dư gần đây" : "Recent balance changes";
  const emptyText = isVi ? "Chưa có giao dịch nạp/trừ số dư." : "No balance transactions yet.";
  const totalLabel = isVi ? "Tổng giao dịch" : "Total transactions";
  const items = snapshot.transactions || [];
  const totalCount = snapshot.stats?.transactionCount || items.length;
  const lines = [`<b>${title}</b>`, `<b>${totalLabel}:</b> ${totalCount}`];
  if (!items.length) {
    lines.push(emptyText);
    return lines.join("\n");
  }

  items.forEach((tran, idx) => {
    const amount = Number(tran.amount || 0);
    const sign = amount >= 0 ? "+" : "-";
    const tranId = tran.tran_id || tran.id || "N/A";
    const date = formatDate(locale, tran.created_at);
    lines.push(
      `\n<b>${idx + 1}.</b> ${escapeHtml(tranId)}\n${sign}<b>${escapeHtml(
        formatMoney(locale, Math.abs(amount))
      )}</b> • ${escapeHtml(date)}`
    );
  });
  return lines.join("\n");
}

function buildOrderHistoryHtml(snapshot, locale) {
  const isVi = locale?.code !== "en";
  const title = isVi ? "Lịch sử đơn hàng gần đây" : "Recent orders";
  const emptyText = isVi ? "Bạn chưa có đơn hàng nào." : "You do not have any orders yet.";
  const totalLabel = isVi ? "Tổng đơn hàng" : "Total orders";
  const accountLabel = isVi ? "Tài khoản" : "Account";
  const timeLabel = isVi ? "Thời gian" : "Time";
  const items = snapshot.orders || [];
  const lines = [`<b>${title}</b>`, `<b>${totalLabel}:</b> ${snapshot.stats?.orderCount || 0}`];
  if (!items.length) {
    lines.push(emptyText);
    return lines.join("\n");
  }

  items.forEach((order, idx) => {
    const date = formatDate(locale, order.created_at);
    const status = order.status || (isVi ? "không rõ" : "unknown");
    const accountId = order.account_id || "";
    const shortAccountId = accountId ? `${String(accountId).slice(0, 8)}...` : isVi ? "N/A" : "N/A";
    lines.push(
      `\n<b>${idx + 1}.</b> <b>${escapeHtml(status.toUpperCase())}</b>\n<b>ID:</b> ${escapeHtml(
        order.id
      )}\n<b>${accountLabel}:</b> ${escapeHtml(shortAccountId)}\n<b>${timeLabel}:</b> ${escapeHtml(
        date
      )}`
    );
  });
  return lines.join("\n");
}

function buildAutoBankHistoryHtml(locale, transactions = []) {
  const isVi = locale?.code !== "en";
  const title = isVi ? "Lịch sử giao dịch gần nhất" : "Latest transactions";
  const footer = isVi ? "Chỉ hiển thị tối đa 5 giao dịch mới nhất từ API." : "Showing at most 5 recent transactions from API.";
  const emptyText = isVi ? "API chưa trả về giao dịch nào." : "The API did not return any transactions.";
  const unknownDate = isVi ? "(không rõ ngày)" : "(unknown date)";
  const timeLabel = isVi ? "Giờ" : "Time";
  const unknownDescription = isVi ? "(không có mô tả)" : "(no description)";
  const maxDescriptionLength = 64;

  const lines = [`<b>📜 ${escapeHtml(title)} (${transactions.length})</b>`];

  if (!transactions.length) {
    lines.push(emptyText, "", `<i>${escapeHtml(footer)}</i>`);
    return lines.join("\n");
  }

  transactions.forEach((tran, idx) => {
    const tranId = tran.transactionID || tran.id || "N/A";
    const isOut = String(tran.type || "IN").toUpperCase() === "OUT";
    const type = isOut ? (isVi ? "Tiền ra" : "Debit") : isVi ? "Tiền vào" : "Credit";
    const typeIcon = isOut ? "🔻" : "🔺";
    const amount = formatMoney(locale, tran.amount || 0);
    const date = tran.transactionDate || unknownDate;
    const transferTime = resolveTransactionTime(tran);
    const normalizedDescription = String(tran.description || unknownDescription).replace(/\s+/g, " ").trim();
    const shortDescription =
      normalizedDescription.length > maxDescriptionLength
        ? `${normalizedDescription.slice(0, maxDescriptionLength - 3)}...`
        : normalizedDescription;

    lines.push(
      "",
      `<b>${idx + 1}. #${escapeHtml(tranId)}</b> ${typeIcon} ${escapeHtml(type)} • <b>${escapeHtml(amount)}</b>`,
      transferTime
        ? `🗓 ${escapeHtml(date)} • <b>${timeLabel}:</b> ${escapeHtml(transferTime)}`
        : `🗓 ${escapeHtml(date)}`,
      `📝 ${escapeHtml(shortDescription)}`
    );

  });

  lines.push("", `<i>${escapeHtml(footer)}</i>`);
  return lines.join("\n");
}

async function runBootstrap(chatId, locale, { skipSuccessMessage = false } = {}) {
  try {
    await bootstrapDatabase();
    if (chatId && !skipSuccessMessage) {
      await sendMessage(chatId, locale.texts.setupSuccess);
    }
  } catch (error) {
    logger.error("Khởi tạo schema thất bại", error);
    if (chatId) {
      await sendMessage(chatId, locale.texts.setupFailed(error.message || "UNKNOWN"));
    }
    return false;
  }
  return true;
}

async function handleSchemaSetupState({ chatId, locale, isAdminUser, normalizedText, text }) {
  if (!isAdminUser) {
    await sendMessage(chatId, locale.texts.setupNeedAdmin);
    return;
  }

  const { buttons } = locale;
  const normalized = normalizedText || "";
  const wantsBootstrap =
    normalized === "/setup" ||
    normalized === "/init" ||
    normalized === "/initdb" ||
    text === buttons.setupInit ||
    text === buttons.setupManual;

  if (!wantsBootstrap) {
    await sendMessage(chatId, locale.texts.setupMissing, setupMenu(locale));
    return;
  }

  await sendMessage(chatId, locale.texts.setupManualStart);
  await runBootstrap(chatId, locale);
}

async function handleStart(chatId, locale, isAdminUser) {
  await sendMessage(chatId, locale.texts.greeting, isAdminUser ? adminMenu(locale) : mainMenu(locale));
}

async function handleBuy(db, chatId, locale) {
  const account = await holdAccount(db, chatId, DEFAULT_ACCOUNT_TYPE);
  if (!account) {
    await sendMessage(chatId, locale.texts.holdFailed);
    return;
  }
  await sendMessage(chatId, locale.texts.holdSuccess);
}

async function handleBalance(db, chatId, locale) {
  const balance = await getBalance(db, chatId);
  await sendHTMLMessage(chatId, `<b>${escapeHtml(locale.texts.balance(balance))}</b>`, personalMenu(locale));
}

async function handlePersonalInfo(db, chatId, locale) {
  const snapshot = await buildUserSnapshot(db, chatId);
  if (!snapshot) {
    await sendMessage(chatId, locale.texts.autoBankUserInfoNotFound(chatId), personalMenu(locale));
    return;
  }
  await sendHTMLMessage(chatId, buildPersonalInfoHtml(snapshot, locale), personalMenu(locale));
}

async function handlePersonalBalanceChanges(db, chatId, locale) {
  const snapshot = await buildUserSnapshot(db, chatId);
  if (!snapshot) {
    await sendMessage(chatId, locale.texts.autoBankUserInfoNotFound(chatId), personalMenu(locale));
    return;
  }
  await sendHTMLMessage(chatId, buildBalanceChangesHtml(snapshot, locale), personalMenu(locale));
}

async function handlePersonalOrderHistory(db, chatId, locale) {
  const snapshot = await buildUserSnapshot(db, chatId);
  if (!snapshot) {
    await sendMessage(chatId, locale.texts.autoBankUserInfoNotFound(chatId), personalMenu(locale));
    return;
  }
  await sendHTMLMessage(chatId, buildOrderHistoryHtml(snapshot, locale), personalMenu(locale));
}

async function handleImport(db, chatId, text, locale) {
  const [, ...lines] = text.split(/\r?\n/);
  const payload = lines.join("\n").trim();
  if (!payload) {
    await sendMessage(chatId, locale.texts.importGuide);
    return;
  }
  const result = await importAccounts(db, payload);
  await sendMessage(chatId, locale.texts.importDone(result.insertedCount));
}

async function sendLanguageMenu(chatId, locale) {
  await sendMessage(chatId, locale.texts.languageMenuTitle, languageMenu(locale));
}

async function changeLanguage(db, chatId, targetCode, currentCode, isAdminUser) {
  const currentLocale = getLocale(currentCode);
  if (!targetCode) {
    await sendLanguageMenu(chatId, currentLocale);
    return currentLocale;
  }
  if (targetCode === currentCode) {
    await sendMessage(chatId, currentLocale.texts.languageSame(getLanguageName(targetCode)));
    return currentLocale;
  }
  await updateLanguage(db, chatId, targetCode);
  const newLocale = getLocale(targetCode);
  await sendMessage(
    chatId,
    newLocale.texts.languageUpdated(newLocale.name),
    isAdminUser ? adminSettingsMenu(newLocale) : personalMenu(newLocale)
  );
  return newLocale;
}

async function showAutoBankStatus(chatId, locale, settings) {
  await sendMessage(chatId, locale.texts.autoBankStatus(settings), autoBankMenu(locale));
}

async function showAcbTokenMenu(chatId, locale, settings) {
  await sendMessage(chatId, locale.texts.acbTokenMenuStatus(settings), acbTokenMenu(locale));
}

async function handleAutoBankHistory(db, chatId, locale) {
  const result = await fetchAcbTransactions(db, 5);
  if (!result.ok) {
    if (result.reason === "missing_token") {
      await sendMessage(chatId, locale.texts.autoBankMissingToken, autoBankMenu(locale));
    } else {
      await sendMessage(chatId, locale.texts.autoBankTestFailed(result.reason), autoBankMenu(locale));
    }
    return;
  }

  const html = buildAutoBankHistoryHtml(locale, result.transactions || []);
  await sendHTMLMessage(chatId, html, autoBankMenu(locale));
}

async function handleTopup(chatId, locale, settings, user) {
  const validation = validateBankSettings(settings);
  if (!validation.ready) {
    await sendMessage(chatId, locale.texts.depositMissingBankInfo);
    return;
  }
  const userId = user?.user_id || chatId;
  const note = buildTransferNote(settings, userId);
  const infoText = locale.texts.depositGuide({
    bankName: settings.bank_name,
    bankCode: settings.bank_code,
    accountName: settings.account_name,
    accountNumber: settings.account_number,
    note,
    minAmount: settings.min_topup,
    user
  });
  const qrUrl = buildVietQrUrl(settings, userId, null);
  if (qrUrl) {
    await sendPhoto(chatId, qrUrl, infoText, topupActionMenu(locale));
  } else {
    await sendMessage(chatId, `${infoText}\n${locale.texts.depositQrUnavailable}`, topupActionMenu(locale));
  }
}

async function startAutoBankTokenPrompt(db, chatId, locale) {
  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.setAcbToken });
  await sendMessage(chatId, `${locale.texts.setAcbHint}\n${locale.texts.promptCancelHint}`, cancelMenu(locale));
}

async function startBankFieldPrompt(db, chatId, locale, field, label) {
  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.bankField, field, label });
  await sendMessage(chatId, `${locale.texts.bankFieldPrompt(label)}\n${locale.texts.promptCancelHint}`, cancelMenu(locale));
}

async function startAddAdminPrompt(db, chatId, locale) {
  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.addAdmin });
  await sendMessage(chatId, `${locale.texts.addAdminHint}\n${locale.texts.promptCancelHint}`, cancelMenu(locale));
}

async function startRemoveAdminPrompt(db, chatId, locale, settings) {
  const removableIds = (settings?.admin_ids || []).filter(id => id && id !== ENV_ADMIN_ID);
  if (!removableIds.length) {
    await sendMessage(chatId, locale.texts.adminRemoveEmpty, adminManageMenu(locale));
    return;
  }

  const adminEntries = await Promise.all(
    removableIds.map(async id => {
      try {
        const user = await getUserById(db, id);
        return { id, user };
      } catch (error) {
        logger.warn("Không lấy được thông tin admin", { id, error: error.message });
        return { id, user: null };
      }
    })
  );

  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.removeAdmin, choices: removableIds });
  await sendMessage(chatId, locale.texts.adminRemoveIntro, adminRemoveMenu(locale, adminEntries));
}

async function handleManualCron(db, chatId, locale, settings, user, isAdminUser) {
  const fallbackMenu = isAdminUser ? adminMenu(locale) : mainMenu(locale);
  const note = buildTransferNote(settings, user?.user_id || chatId);
  try {
    await sendMessage(chatId, locale.texts.manualCronStart);
    const result = await processManualTopup(db, settings, user);
    if (!result.ok) {
      await sendMessage(chatId, locale.texts.manualCronNoMatch(note), topupActionMenu(locale));
      return;
    }
    if (!result.found || !result.credited) {
      await sendMessage(chatId, locale.texts.manualCronNoMatch(result.note || note), topupActionMenu(locale));
      return;
    }
    await sendMessage(chatId, locale.texts.manualCronDone, fallbackMenu);
  } catch (error) {
    logger.error("Manual cron trigger failed", error);
    await sendMessage(chatId, locale.texts.manualCronFailed(error.message), topupActionMenu(locale));
  }
}

async function handleTopupSupport(chatId, locale, settings, user, adminIds = []) {
  const note = buildTransferNote(settings, user?.user_id || chatId);
  await sendMessage(chatId, locale.texts.topupSupportAck, topupActionMenu(locale));

  const admins = adminIds.length ? adminIds : getAdminList(settings);
  if (!admins.length) {
    return;
  }

  const supportMessage = locale.texts.topupSupportNotify({
    user: user || { user_id: chatId },
    note
  });
  await Promise.all(
    admins.map(adminId =>
      sendMessage(adminId, supportMessage).catch(error =>
        logger.error("Không gửi được yêu cầu hỗ trợ tới admin", { adminId, error: error.message })
      )
    )
  );
}

function isTopupActionText(text, buttons) {
  return text === buttons.topupConfirm || text === buttons.topupSupport || text === buttons.topupBack;
}

function isTopupContext(text, normalizedText, buttons) {
  return TOPUP_KEYWORDS.includes(normalizedText) || text === buttons.topup || isTopupActionText(text, buttons);
}

function resolveTopupMenu(settings, locale, isAdminUser, text, normalizedText, buttons) {
  if (!validateBankSettings(settings).ready) {
    return isAdminUser ? adminMenu(locale) : mainMenu(locale);
  }
  if (isTopupContext(text, normalizedText, buttons)) {
    return topupActionMenu(locale);
  }
  return isAdminUser ? adminMenu(locale) : mainMenu(locale);
}

async function sendAdminList(db, chatId, locale, settings) {
  const adminIds = getAdminList(settings);
  if (!adminIds.length) {
    await sendMessage(chatId, locale.texts.adminListEmpty, adminManageMenu(locale));
    return;
  }
  const adminEntries = await Promise.all(
    adminIds.map(async id => {
      try {
        const user = await getUserById(db, id);
        return { id, user };
      } catch (error) {
        logger.warn("Không lấy được thông tin admin", { id, error: error.message });
        return { id, user: null };
      }
    })
  );

  const lines = [locale.texts.adminListTitle(adminIds.length)];
  adminEntries.forEach(({ id, user }, index) =>
    lines.push(
      locale.texts.adminListItem({ index: index + 1, id, isDefault: ENV_ADMIN_ID === id, user })
    )
  );
  await sendMessage(chatId, lines.join("\n"), adminManageMenu(locale));
}

async function startUserInfoPrompt(db, chatId, locale) {
  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.userInfo });
  await sendMessage(chatId, `${locale.texts.autoBankUserInfoPrompt}\n${locale.texts.promptCancelHint}`, cancelMenu(locale));
}

async function sendCustomerInfoMenu(chatId, locale) {
  await sendMessage(chatId, locale.texts.customerInfoIntro, customerInfoMenu(locale));
}

async function sendRecentCustomerList(db, chatId, locale, limit = 20) {
  const users = await listRecentUsers(db, limit);
  if (!users.length) {
    await sendMessage(chatId, locale.texts.customerInfoListEmpty, customerInfoMenu(locale));
    return;
  }

  const lines = [locale.texts.customerInfoListTitle(users.length)];
  users.forEach((customer, index) => {
    lines.push(locale.texts.customerInfoListItem({ index: index + 1, user: customer }));
  });

  await sendMessage(chatId, lines.join("\n"), customerInfoMenu(locale));
}

function resolvePromptBackMenu(prompt, locale) {
  if (!prompt) return autoBankMenu(locale);
  if (prompt.type === PROMPT_TYPES.setAcbToken) {
    return acbTokenMenu(locale);
  }
  if (prompt.type === PROMPT_TYPES.userInfo) {
    return customerInfoMenu(locale);
  }
  return autoBankMenu(locale);
}

async function startManualAdjustPrompt(db, chatId, locale) {
  await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.manualAdjust, step: "awaitUser" });
  await sendMessage(chatId, `${locale.texts.manualAdjustAskUser}\n${locale.texts.promptCancelHint}`, cancelMenu(locale));
}

async function notifyAdmins(adminIds, message) {
  await Promise.all(
    adminIds.map(id => sendMessage(id, message).catch(error => logger.error("Không gửi được thông báo admin", error.message)))
  );
}

async function processPendingPrompt({
  db,
  chatId,
  text,
  prompt,
  locale,
  settings,
  adminIds
}) {
  const trimmed = text.trim();
  switch (prompt.type) {
    case PROMPT_TYPES.setAcbToken: {
      if (!trimmed) {
        await sendMessage(chatId, locale.texts.setAcbHint, cancelMenu(locale));
        return { handled: true, settings };
      }
      await updateAcbToken(db, trimmed);
      await clearPendingPrompt(db, chatId);
      const newSettings = await getSettings(db);
      await sendMessage(chatId, locale.texts.setAcbSuccess, acbTokenMenu(locale));
      return { handled: true, settings: newSettings };
    }
    case PROMPT_TYPES.bankField: {
      if (!trimmed) {
        await sendMessage(chatId, locale.texts.bankFieldPrompt(prompt.label), cancelMenu(locale));
        return { handled: true, settings };
      }
      if (prompt.field === "min_topup") {
        const amount = parseAmount(trimmed);
        if (amount === null) {
          await sendMessage(chatId, locale.texts.manualAdjustInvalidAmount, cancelMenu(locale));
          return { handled: true, settings };
        }
        await updateBankField(db, prompt.field, amount);
      } else {
        await updateBankField(db, prompt.field, trimmed);
      }
      await clearPendingPrompt(db, chatId);
      const newSettings = await getSettings(db);
      await sendMessage(chatId, locale.texts.bankFieldUpdated(prompt.label), bankSettingsMenu(locale));
      return { handled: true, settings: newSettings };
    }
    case PROMPT_TYPES.userInfo: {
      const userId = extractUserId(trimmed);
      if (!userId) {
        await sendMessage(chatId, locale.texts.autoBankUserInfoNotFound(trimmed), cancelMenu(locale));
        return { handled: true, settings };
      }
      const snapshot = await buildUserSnapshot(db, userId);
      if (!snapshot) {
        await sendMessage(chatId, locale.texts.autoBankUserInfoNotFound(userId), cancelMenu(locale));
        return { handled: true, settings };
      }
      await clearPendingPrompt(db, chatId);
      await sendMessage(chatId, locale.texts.autoBankUserInfoResult(snapshot), customerInfoMenu(locale));
      return { handled: true, settings };
    }
    case PROMPT_TYPES.manualAdjust: {
      const step = prompt.step || "awaitUser";
      if (step === "awaitUser") {
        const userId = extractUserId(trimmed);
        if (!userId) {
          await sendMessage(chatId, locale.texts.manualAdjustUserNotFound(trimmed), cancelMenu(locale));
          return { handled: true, settings };
        }
        const target = await getUserById(db, userId);
        if (!target) {
          await sendMessage(chatId, locale.texts.manualAdjustUserNotFound(userId), cancelMenu(locale));
          return { handled: true, settings };
        }
        await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.manualAdjust, step: "awaitAction", targetId: userId });
        await sendMessage(chatId, locale.texts.manualAdjustShowUser({ user: target, balance: target.balance || 0 }), manualAdjustActionMenu(locale));
        return { handled: true, settings };
      }
      if (step === "awaitAction") {
        let action = null;
        if (trimmed === locale.buttons.manualAdd) action = "add";
        if (trimmed === locale.buttons.manualSubtract) action = "subtract";
        if (!action) {
          await sendMessage(chatId, locale.texts.manualAdjustCancelled, autoBankMenu(locale));
          await clearPendingPrompt(db, chatId);
          return { handled: true, settings };
        }
        await setPendingPrompt(db, chatId, { type: PROMPT_TYPES.manualAdjust, step: "awaitAmount", targetId: prompt.targetId, action });
        await sendMessage(
          chatId,
          `${locale.texts.manualAdjustAskAmount(locale.texts.manualAdjustActionLabels[action])}\n${locale.texts.promptCancelHint}`,
          cancelMenu(locale)
        );
        return { handled: true, settings };
      }
      if (step === "awaitAmount") {
        const amount = parseAmount(trimmed);
        if (amount === null || amount <= 0) {
          await sendMessage(chatId, locale.texts.manualAdjustInvalidAmount, cancelMenu(locale));
          return { handled: true, settings };
        }
        const delta = prompt.action === "add" ? amount : -amount;
        const updatedUser = await updateUserBalance(db, prompt.targetId, delta);
        const tranId = `manual-${Date.now()}-${prompt.targetId}`;
        await insertTransaction(db, { tran_id: tranId, amount: delta, user_id: prompt.targetId });
        await clearPendingPrompt(db, chatId);
        await sendMessage(chatId, locale.texts.manualAdjustDone({ delta, balance: updatedUser.balance || 0 }), autoBankMenu(locale));
        const userLocale = getLocale(updatedUser.language || DEFAULT_LANGUAGE);
        await sendMessage(prompt.targetId, userLocale.texts.manualAdjustNotifyUser({ delta, balance: updatedUser.balance || 0 }));
        if (adminIds?.length) {
          await notifyAdmins(adminIds, locale.texts.manualAdjustNotifyAdmin({
            adminId: chatId,
            targetId: prompt.targetId,
            delta,
            balance: updatedUser.balance || 0
          }));
        }
        return { handled: true, settings };
      }
      return { handled: true, settings };
    }
    case PROMPT_TYPES.addAdmin: {
      const userId = parseInt(trimmed, 10);
      if (!Number.isFinite(userId) || userId <= 0) {
        await sendMessage(chatId, locale.texts.addAdminHint, cancelMenu(locale));
        return { handled: true, settings };
      }
      await addAdmin(db, userId);
      await clearPendingPrompt(db, chatId);
      const newSettings = await getSettings(db);
      await sendMessage(chatId, locale.texts.addAdminSuccess(userId), adminManageMenu(locale));
      return { handled: true, settings: newSettings };
    }
    case PROMPT_TYPES.removeAdmin: {
      const userId = extractUserId(trimmed);
      if (!userId || !prompt.choices?.includes(userId)) {
        await sendMessage(chatId, locale.texts.adminRemoveIntro, adminManageMenu(locale));
        return { handled: true, settings };
      }
      if (ENV_ADMIN_ID && userId === ENV_ADMIN_ID) {
        await sendMessage(chatId, locale.texts.adminRemoveDefault(userId), adminManageMenu(locale));
        return { handled: true, settings };
      }
      const removed = await removeAdmin(db, userId);
      await clearPendingPrompt(db, chatId);
      if (!removed) {
        await sendMessage(chatId, locale.texts.adminRemoveFailed(userId), adminManageMenu(locale));
        return { handled: true, settings };
      }
      const newSettings = await getSettings(db);
      await sendMessage(chatId, locale.texts.adminRemoveSuccess(userId), adminManageMenu(locale));
      return { handled: true, settings: newSettings };
    }
    default:
      return { handled: false, settings };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("OK");
    }

    const body = req.body;
    const message = body?.message || body?.edited_message;
    const text = message?.text || "";
    const document = message?.document || null;
    const chatId = message?.chat?.id;
    if (!chatId || (!text && !document)) {
      return res.status(200).json({ ok: true });
    }

    const normalizedText = normalize(text);
    const languageSelectionFromMessage = detectLanguageSelection(text);
    let locale = getLocale(languageSelectionFromMessage || DEFAULT_LANGUAGE);
    let buttons = locale.buttons;
    const requestStart = Date.now();
    const db = await connectDB();
    const schemaState = await checkSchemaReady(db);

    let settings = null;
    const adminSet = new Set();

    if (schemaState.ready) {
      settings = await getSettings(db);
      getAdminList(settings).forEach(id => adminSet.add(id));
    } else if (schemaState.reason?.table !== "settings") {
      try {
        const partialSettings = await getSettings(db);
        settings = partialSettings;
        getAdminList(partialSettings).forEach(id => adminSet.add(id));
      } catch (settingsError) {
        logger.warn("Không thể tải settings khi schema thiếu", settingsError.message);
      }
    }

    if (ENV_ADMIN_ID) {
      adminSet.add(ENV_ADMIN_ID);
    }

    let adminIds = Array.from(adminSet);
    let isAdminUser = adminSet.has(chatId);

    if (!schemaState.ready) {
      await handleSchemaSetupState({
        chatId,
        locale,
        isAdminUser,
        normalizedText,
        text
      });
      return res.status(200).json({ ok: true });
    }

    if (!settings) {
      settings = await getSettings(db);
      getAdminList(settings).forEach(id => adminSet.add(id));
    }
    adminIds = Array.from(adminSet);
    isAdminUser = adminSet.has(chatId);

    const profile = {
      first_name: message?.from?.first_name || null,
      last_name: message?.from?.last_name || null,
      full_name: [message?.from?.first_name, message?.from?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
      username: message?.from?.username || null,
      telegram_language: message?.from?.language_code || null
    };
    const user = await ensureUser(db, chatId, profile);
    const userLanguage = user?.language || DEFAULT_LANGUAGE;
    locale = getLocale(userLanguage);
    buttons = locale.buttons;

    const detectedLanguage = languageSelectionFromMessage;
    if (detectedLanguage) {
      await changeLanguage(db, chatId, detectedLanguage, userLanguage, isAdminUser);
      return res.status(200).json({ ok: true });
    }

    const pendingPrompt = isAdminUser ? await getPendingPrompt(db, chatId) : null;
    const isCancelInput = normalizedText === "/cancel" || text === buttons.cancel;
    if (pendingPrompt) {
      if (isCancelInput) {
        await clearPendingPrompt(db, chatId);
        const backMenu = resolvePromptBackMenu(pendingPrompt, locale);
        await sendMessage(chatId, locale.texts.promptCancelled, backMenu);
        return res.status(200).json({ ok: true });
      }
      const promptResult = await processPendingPrompt({
        db,
        chatId,
        text,
        prompt: pendingPrompt,
        locale,
        settings,
        adminIds
      });
      if (promptResult.settings) {
        settings = promptResult.settings;
      }
      if (promptResult.handled) {
        return res.status(200).json({ ok: true });
      }
    } else if (isCancelInput) {
      await sendMessage(chatId, locale.texts.promptCancelled, isAdminUser ? adminMenu(locale) : mainMenu(locale));
      return res.status(200).json({ ok: true });
    }

    const shopResult = await handleShopFlow({
      db,
      chatId,
      text,
      document,
      user,
      settings,
      isAdminUser,
      locale
    });
    if (shopResult?.handled) {
      return res.status(200).json({ ok: true });
    }

    if (!text && document) {
      return res.status(200).json({ ok: true });
    }

    const command = parseCommand(text);
    if (command) {
      if (["/language", "/lang"].includes(command.command)) {
        const desired = command.args?.[0]?.toLowerCase();
        const target = detectLanguageSelection(desired || "");
        locale = await changeLanguage(db, chatId, target, userLanguage, isAdminUser);
        return res.status(200).json({ ok: true });
      }

      if (command.command === "/nap") {
        await handleTopup(chatId, locale, settings, user);
        return res.status(200).json({ ok: true });
      }

      if (["/setup", "/init", "/initdb"].includes(command.command)) {
        await sendMessage(chatId, locale.texts.setupAlreadyReady);
        return res.status(200).json({ ok: true });
      }

      if (PERSONAL_INFO_COMMANDS.includes(command.command)) {
        await handlePersonalInfo(db, chatId, locale);
        return res.status(200).json({ ok: true });
      }

      if (PERSONAL_BALANCE_HISTORY_COMMANDS.includes(command.command)) {
        await handlePersonalBalanceChanges(db, chatId, locale);
        return res.status(200).json({ ok: true });
      }

      if (PERSONAL_ORDER_HISTORY_COMMANDS.includes(command.command)) {
        await handlePersonalOrderHistory(db, chatId, locale);
        return res.status(200).json({ ok: true });
      }

      const adminOnlyCommands = ["/import", "/setacb", "/addadmin", "/settings", "/ping", "/restart", "/cpu"];
      if (!isAdminUser && adminOnlyCommands.includes(command.command)) {
        logger.warn("Người dùng không có quyền thực thi lệnh", { chatId, command: command.command });
        await sendMessage(chatId, locale.texts.noPermission);
        return res.status(200).json({ ok: true });
      }

      switch (command.command) {
        case "/start":
          await handleStart(chatId, locale, isAdminUser);
          break;
        case "/import":
          await handleImport(db, chatId, text, locale);
          break;
        case "/setacb":
          if (!command.args?.[0]) {
            await sendMessage(chatId, locale.texts.setAcbHint);
            break;
          }
          await updateAcbToken(db, command.args[0]);
          settings = await getSettings(db);
          await sendMessage(chatId, locale.texts.setAcbSuccess);
          break;
        case "/addadmin":
          if (!command.args?.[0]) {
            await sendMessage(chatId, locale.texts.addAdminHint);
            break;
          }
          await addAdmin(db, parseInt(command.args[0], 10));
          settings = await getSettings(db);
          await sendMessage(chatId, locale.texts.addAdminSuccess(command.args[0]));
          break;
        case "/settings":
          await sendMessage(chatId, locale.texts.settingsSummary(settings));
          break;
        case "/ping":
          await sendMessage(chatId, buildPingMessage(locale, requestStart));
          break;
        case "/restart":
          await sendMessage(chatId, buildRestartMessage(locale));
          break;
        case "/cpu":
          await sendMessage(chatId, buildCpuMessage(locale));
          break;
        default:
          await sendMessage(chatId, locale.texts.unknown);
      }
      return res.status(200).json({ ok: true });
    }

    if (TOPUP_KEYWORDS.includes(normalizedText)) {
      await handleTopup(chatId, locale, settings, user);
      return res.status(200).json({ ok: true });
    }

    if (PERSONAL_INFO_KEYWORDS.includes(normalizedText)) {
      await handlePersonalInfo(db, chatId, locale);
      return res.status(200).json({ ok: true });
    }

    if (PERSONAL_BALANCE_HISTORY_KEYWORDS.includes(normalizedText)) {
      await handlePersonalBalanceChanges(db, chatId, locale);
      return res.status(200).json({ ok: true });
    }

    if (PERSONAL_ORDER_HISTORY_KEYWORDS.includes(normalizedText)) {
      await handlePersonalOrderHistory(db, chatId, locale);
      return res.status(200).json({ ok: true });
    }

    switch (text) {
      case buttons.buy:
        await handleBuy(db, chatId, locale);
        break;
      case buttons.personal:
        await sendMessage(chatId, locale.texts.personalIntro, personalMenu(locale));
        break;
      case buttons.balance:
        await handleBalance(db, chatId, locale);
        break;
      case buttons.personalInfo:
        await handlePersonalInfo(db, chatId, locale);
        break;
      case buttons.personalBalanceChanges:
        await handlePersonalBalanceChanges(db, chatId, locale);
        break;
      case buttons.personalOrderHistory:
        await handlePersonalOrderHistory(db, chatId, locale);
        break;
      case buttons.personalBack:
        await sendMessage(chatId, locale.texts.backToMenu, isAdminUser ? adminMenu(locale) : mainMenu(locale));
        break;
      case buttons.topup:
        await handleTopup(chatId, locale, settings, user);
        break;
      case buttons.topupConfirm:
        await handleManualCron(db, chatId, locale, settings, user, isAdminUser);
        break;
      case buttons.topupSupport:
        await handleTopupSupport(chatId, locale, settings, user, adminIds);
        break;
      case buttons.topupBack:
        await sendMessage(chatId, locale.texts.backToMenu, isAdminUser ? adminMenu(locale) : mainMenu(locale));
        break;
      case buttons.import:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.importGuide);
        }
        break;
      case buttons.settings:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminMenuIntro, adminSettingsMenu(locale));
        }
        break;
      case buttons.settingsBack:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.settingsClosed, adminMenu(locale));
        }
        break;
      case buttons.language:
        await sendLanguageMenu(chatId, locale);
        break;
      case buttons.languageBack:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminMenuIntro, adminSettingsMenu(locale));
        } else {
          await sendMessage(chatId, locale.texts.personalIntro, personalMenu(locale));
        }
        break;
      case buttons.ping:
        if (isAdminUser) {
          await sendMessage(chatId, buildPingMessage(locale, requestStart));
        }
        break;
      case buttons.cpu:
        if (isAdminUser) {
          await sendMessage(chatId, buildCpuMessage(locale));
        }
        break;
      case buttons.autoBank:
        if (isAdminUser) {
          await showAutoBankStatus(chatId, locale, settings);
        }
        break;
      case buttons.autoBankSet:
        if (isAdminUser) {
          await showAcbTokenMenu(chatId, locale, settings);
        }
        break;
      case buttons.autoBankTokenEdit:
        if (isAdminUser) {
          await startAutoBankTokenPrompt(db, chatId, locale);
        }
        break;
      case buttons.autoBankTokenDelete:
        if (isAdminUser) {
          await updateAcbToken(db, null);
          settings = await getSettings(db);
          await sendMessage(chatId, locale.texts.acbTokenDeleteSuccess, acbTokenMenu(locale));
        }
        break;
      case buttons.autoBankTokenBack:
        if (isAdminUser) {
          await showAutoBankStatus(chatId, locale, settings);
        }
        break;
      case buttons.autoBankHistory:
        if (isAdminUser) {
          await handleAutoBankHistory(db, chatId, locale);
        }
        break;
      case buttons.autoBankUserInfo:
        if (isAdminUser) {
          await sendCustomerInfoMenu(chatId, locale);
        }
        break;
      case buttons.customerInfoList:
        if (isAdminUser) {
          await sendRecentCustomerList(db, chatId, locale, 20);
        }
        break;
      case buttons.customerInfoCheckById:
        if (isAdminUser) {
          await startUserInfoPrompt(db, chatId, locale);
        }
        break;
      case buttons.customerInfoBack:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminMenuIntro, adminSettingsMenu(locale));
        }
        break;
      case buttons.autoBankBankInfo:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.bankConfigIntro(settings), bankSettingsMenu(locale));
        }
        break;
      case buttons.bankFieldBank:
        if (isAdminUser) {
          await startBankFieldPrompt(db, chatId, locale, "bank_code", buttons.bankFieldBank);
        }
        break;
      case buttons.bankFieldAccountName:
        if (isAdminUser) {
          await startBankFieldPrompt(db, chatId, locale, "account_name", buttons.bankFieldAccountName);
        }
        break;
      case buttons.bankFieldAccountNumber:
        if (isAdminUser) {
          await startBankFieldPrompt(db, chatId, locale, "account_number", buttons.bankFieldAccountNumber);
        }
        break;
      case buttons.bankFieldMinAmount:
        if (isAdminUser) {
          await startBankFieldPrompt(db, chatId, locale, "min_topup", buttons.bankFieldMinAmount);
        }
        break;
      case buttons.bankFieldNote:
        if (isAdminUser) {
          await startBankFieldPrompt(db, chatId, locale, "topup_note", buttons.bankFieldNote);
        }
        break;
      case buttons.bankSettingsBack:
        if (isAdminUser) {
          await showAutoBankStatus(chatId, locale, settings);
        }
        break;
      case buttons.autoBankManualAdjust:
        if (isAdminUser) {
          await startManualAdjustPrompt(db, chatId, locale);
        }
        break;
      case buttons.setupInit:
      case buttons.setupManual:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.setupAlreadyReady);
        }
        break;
      case buttons.autoBankBack:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminMenuIntro, adminSettingsMenu(locale));
        }
        break;
      case buttons.adminManage:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminManageIntro, adminManageMenu(locale));
        }
        break;
      case buttons.adminAdd:
        if (isAdminUser) {
          await startAddAdminPrompt(db, chatId, locale);
        }
        break;
      case buttons.adminRemove:
        if (isAdminUser) {
          await startRemoveAdminPrompt(db, chatId, locale, settings);
        }
        break;
      case buttons.adminList:
        if (isAdminUser) {
          await sendAdminList(db, chatId, locale, settings);
        }
        break;
      case buttons.adminManageBack:
        if (isAdminUser) {
          await sendMessage(chatId, locale.texts.adminMenuIntro, adminSettingsMenu(locale));
        }
        break;
      default:
        await sendMessage(chatId, locale.texts.buyGuide);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("Bot gặp lỗi không xử lý được", error);
    console.error("Lỗi bot:", error);
    try {
      if (isRelationMissing(error)) {
        const fallbackLocale = locale || getLocale(DEFAULT_LANGUAGE);
        if (chatId) {
          await sendMessage(chatId, fallbackLocale.texts.setupMissing, setupMenu(fallbackLocale));
        }
      }
    } catch (bootstrapError) {
      logger.error("Tự động khởi tạo schema thất bại", bootstrapError);
    }
    return res.status(500).json({ ok: false, error: "bot_handler_failed" });
  }
}

