import crypto from "crypto";
import { sendMessage, sendPhoto, getTelegramFile, downloadTelegramFile } from "../lib/telegram.js";
import {
  listShopCategories,
  getShopCategoryById,
  createShopCategory,
  updateShopCategory,
  deleteShopCategory
} from "../models/shopCategoryModel.js";
import {
  listShopProducts,
  getShopProductById,
  getShopProductsByIds,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct
} from "../models/shopProductModel.js";
import {
  parseStockLines,
  createShopStockItems,
  countAvailableShopStock,
  allocateShopStock,
  releaseAllocatedShopStock
} from "../models/shopStockModel.js";
import {
  createShopOrder,
  getOrderById,
  updateOrder,
  listUserShopOrders,
  listRecentShopOrders,
  listWarrantyRequestedOrders,
  listExpiredPendingInvoiceOrders
} from "../models/orderModel.js";
import { updateBalance, setUserUiState, clearUserUiState, getUsersByIds, listAllUserIds } from "../models/userModel.js";
import { getAdminList } from "../models/settingModel.js";
import { fetchAcbTransactions } from "./paymentService.js";
import { findTransaction, insertTransaction } from "../models/transactionModel.js";
import { validateBankSettings } from "./bankService.js";
import { logger } from "../utils/logger.js";

export const SHOP_ADMIN_BUTTON = "📦 Quản lý hàng hóa";

const BTN = {
  user: {
    myOrders: "🧾 Đơn của tôi",
    backMain: "⬅️ Về menu chính",
    backCategories: "⬅️ Về mục mẹ",
    backProducts: "⬅️ Về server",
    qtyOther: "✍️ Số lượng khác",
    payBalance: "💰 Thanh toán số dư",
    payInvoice: "🏦 Thanh toán hóa đơn",
    confirmYes: "✅ Xác nhận",
    confirmNo: "❌ Không",
    invoiceCheck: "✅ Tôi đã thanh toán đơn này",
    warrantyRequest: "🛡 Yêu cầu bảo hành",
    backToOrders: "⬅️ Về đơn hàng"
  },
  admin: {
    orderHistory: "📜 Lịch sử đơn hàng",
    warranty: "🛡 Bảo hành dịch vụ",
    categories: "📁 Quản lý mục mẹ",
    products: "🖥 Quản lý server",
    stockImport: "📥 Nhập hàng",
    backMain: "⬅️ Quay lại",
    add: "➕ Thêm",
    edit: "✏️ Sửa",
    remove: "🗑 Xóa",
    toggleStatus: "🔁 Bật/Tắt",
    importManual: "⌨️ Nhập thủ công",
    importFile: "📄 Nhập file .txt",
    warrantyApprove: "✅ Bảo hành",
    warrantyReject: "❌ Từ chối"
  }
};

const SHOP_STATES = {
  chooseCategory: "shop_choose_category",
  chooseProduct: "shop_choose_product",
  chooseQty: "shop_choose_qty",
  inputQty: "shop_input_qty",
  choosePayment: "shop_choose_payment",
  confirmBalance: "shop_confirm_balance",
  confirmInvoice: "shop_confirm_invoice",
  invoicePending: "shop_invoice_pending",
  userOrders: "shop_user_orders",
  userOrderDetail: "shop_user_order_detail",
  warrantyConfirm: "shop_warranty_confirm",
  adminHome: "shop_admin_home",
  adminOrderList: "shop_admin_order_list",
  adminOrderDetail: "shop_admin_order_detail",
  adminWarrantyList: "shop_admin_warranty_list",
  adminWarrantyDetail: "shop_admin_warranty_detail",
  adminWarrantyRejectInput: "shop_admin_warranty_reject_input",
  adminCategoryMenu: "shop_admin_category_menu",
  adminCategoryAddInput: "shop_admin_category_add_input",
  adminCategoryEditPick: "shop_admin_category_edit_pick",
  adminCategoryEditInput: "shop_admin_category_edit_input",
  adminCategoryDeletePick: "shop_admin_category_delete_pick",
  adminCategoryDeleteConfirm: "shop_admin_category_delete_confirm",
  adminProductMenu: "shop_admin_product_menu",
  adminProductAddPickCategory: "shop_admin_product_add_pick_category",
  adminProductAddInput: "shop_admin_product_add_input",
  adminProductEditPick: "shop_admin_product_edit_pick",
  adminProductEditInput: "shop_admin_product_edit_input",
  adminProductDeletePick: "shop_admin_product_delete_pick",
  adminProductDeleteConfirm: "shop_admin_product_delete_confirm",
  adminProductTogglePick: "shop_admin_product_toggle_pick",
  adminImportMenu: "shop_admin_import_menu",
  adminImportManualPick: "shop_admin_import_manual_pick",
  adminImportManualInput: "shop_admin_import_manual_input",
  adminImportFilePick: "shop_admin_import_file_pick",
  adminImportFileWait: "shop_admin_import_file_wait"
};

const QTY_BUTTONS = ["1", "2", "3", "4"];
const INVOICE_AUTO_CANCEL_MS = 60 * 60 * 1000;
const BROADCAST_CHUNK_SIZE = 25;

function shortId(id = "") {
  return String(id || "").slice(0, 8);
}

function toMoney(value = 0) {
  const amount = Number(value);
  return `${new Intl.NumberFormat("vi-VN").format(Number.isFinite(amount) ? amount : 0)}₫`;
}

function buildKeyboard(rows = []) {
  return {
    keyboard: rows.map(row => (row || []).filter(Boolean).map(text => ({ text }))).filter(row => row.length),
    resize_keyboard: true
  };
}

function defaultMenuKeyboard(isAdminUser, locale) {
  const buttons = locale?.buttons || {};
  if (isAdminUser) {
    return buildKeyboard([
      [buttons.buy || "🛒 Mua tài khoản", buttons.topup || "💳 Nạp tiền"],
      [buttons.import || "⚡ Nhập hàng nhanh", buttons.personal || "👤 Cá nhân"],
      [buttons.shopManage || SHOP_ADMIN_BUTTON, buttons.settings || "🛠 Trang quản trị"]
    ]);
  }
  return buildKeyboard([
    [buttons.buy || "🛒 Mua tài khoản"],
    [buttons.topup || "💳 Nạp tiền"],
    [buttons.personal || "👤 Cá nhân"]
  ]);
}

function chunkByTwo(items = []) {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

function categoryButton(category) {
  return `📁 ${shortId(category.id)} | ${category.name}`;
}

function productButton(product) {
  const prefix = product.warranty_enabled && Number(product.warranty_days) > 0 ? "[BH] " : "";
  return `🖥 ${shortId(product.id)} | ${prefix}${product.name}`;
}

function orderButton(order, productName = "") {
  return `🧾 ${shortId(order.id)} | ${productName || "N/A"} | ${buildOrderStatusLabel(order)}`;
}

function parseShortButtonId(text = "", prefix = "") {
  if (!text.startsWith(`${prefix} `)) return null;
  const body = text.slice(prefix.length + 1);
  const short = body.split("|")[0]?.trim();
  if (!/^[a-f0-9]{8}$/i.test(short || "")) return null;
  return short.toLowerCase();
}

function resolveByShortId(items = [], idKey = "id", short = "") {
  if (!short) return null;
  const normalized = short.toLowerCase();
  return items.find(item => String(item?.[idKey] || "").toLowerCase().startsWith(normalized)) || null;
}

function normalizeDescription(text = "") {
  return String(text || "").replace(/\s+/g, "").toUpperCase();
}

function ensurePositiveInt(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const next = Math.floor(value);
  return next > 0 ? next : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toIsoBeforeNow(ms = 0) {
  return new Date(Date.now() - Math.max(0, Number(ms) || 0)).toISOString();
}

function buildOrderStatusLabel(order = {}) {
  if (order.status === "done" && order.payment_status === "paid") return "Đã giao";
  if (order.status === "awaiting_payment") return "Chờ thanh toán";
  if (order.status === "cancelled" || order.status === "canceled") return "Đã hủy";
  if (order.payment_status === "expired") return "Quá hạn";
  if (order.status === "failed") return "Thất bại";
  return order.status || "Đang xử lý";
}

function buildWarrantyStatusLabel(order = {}) {
  if (!order.warranty_enabled) return "Không bảo hành";
  const map = { active: "Đang bảo hành", requested: "Chờ xử lý", approved: "Đã bảo hành", rejected: "Từ chối", none: "Không áp dụng" };
  return map[order.warranty_status] || order.warranty_status || "Chưa có";
}

function parseCategoryInput(text = "") {
  const [nameRaw, ...descParts] = String(text || "").split("|");
  const name = String(nameRaw || "").trim();
  if (!name) return null;
  return { name, description: descParts.join("|").trim() };
}

function parseProductInput(text = "") {
  const [nameRaw, descRaw = "", priceRaw = "", warrantyRaw = "0"] = String(text || "").split("|");
  const name = String(nameRaw || "").trim();
  if (!name) return null;
  const price = ensurePositiveInt(String(priceRaw || "").replace(/[^\d]/g, "")) || 0;
  const warrantyDays = ensurePositiveInt(String(warrantyRaw || "").replace(/[^\d]/g, "")) || 0;
  return { name, description: String(descRaw || "").trim(), price, warrantyEnabled: warrantyDays > 0, warrantyDays };
}

function buildOrderTransferNote(settings = {}, user = {}, orderId = "") {
  const base = String(settings.topup_note || "NAP").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6) || "NAP";
  const userPart = String(user.user_id || "").replace(/[^\d]/g, "").slice(-4).padStart(4, "0");
  const namePart = String(user.username || user.full_name || "USR").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3).padEnd(3, "X");
  const timePart = Date.now().toString(36).toUpperCase().slice(-5);
  const orderPart = shortId(orderId).toUpperCase();
  const randomPart = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base}${userPart}${namePart}${timePart}${orderPart}${randomPart}`.slice(0, 32);
}

function buildVietQrByCustomNote(settings = {}, note, amount) {
  if (!settings.bank_code || !settings.account_number) return null;
  const bankCode = String(settings.bank_code).trim().toUpperCase();
  const accountNumber = String(settings.account_number).replace(/\s+/g, "");
  if (!bankCode || !accountNumber) return null;
  const params = new URLSearchParams();
  params.set("addInfo", String(note || "").trim());
  if (settings.account_name) params.set("accountName", settings.account_name);
  if (Number(amount) > 0) params.set("amount", String(Math.floor(Number(amount))));
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?${params.toString()}`;
}

async function sendCategoriesMenu({ db, chatId, isAdminUser }) {
  const categories = await listShopCategories(db, { activeOnly: true });
  if (!categories.length) {
    await sendMessage(chatId, "Hiện chưa có mục mẹ nào để mua.", defaultMenuKeyboard(isAdminUser));
    await clearUserUiState(db, chatId);
    return;
  }
  const lines = ["📁 Danh sách mục mẹ:"];
  categories.forEach((category, index) => {
    lines.push(`${index + 1}. [${shortId(category.id)}] ${category.name}`);
    if (category.description) lines.push(`   ${category.description}`);
  });
  const keyboard = buildKeyboard([...chunkByTwo(categories.map(categoryButton)), [BTN.user.myOrders], [BTN.user.backMain]]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
  await setUserUiState(db, chatId, SHOP_STATES.chooseCategory, {});
}

async function sendProductsMenu({ db, chatId, categoryId, isAdminUser }) {
  const category = await getShopCategoryById(db, categoryId);
  if (!category) {
    await sendMessage(chatId, "Không tìm thấy mục mẹ.");
    await sendCategoriesMenu({ db, chatId, isAdminUser });
    return;
  }
  const products = await listShopProducts(db, { categoryId, activeOnly: true });
  if (!products.length) {
    await sendMessage(chatId, `Mục "${category.name}" chưa có server nào.`);
    await sendCategoriesMenu({ db, chatId, isAdminUser });
    return;
  }
  const stockCounts = await Promise.all(products.map(item => countAvailableShopStock(db, item.id)));
  const lines = [`🖥 Server trong mục "${category.name}":`];
  products.forEach((product, index) => {
    const bh = product.warranty_enabled && Number(product.warranty_days) > 0 ? ` [BH ${product.warranty_days} ngày]` : "";
    lines.push(`${index + 1}. [${shortId(product.id)}] ${bh}${product.name}`);
    lines.push(`   Giá: ${toMoney(product.price)} • Kho: ${stockCounts[index]}`);
    if (product.description) lines.push(`   ${product.description}`);
  });
  const keyboard = buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.user.backCategories], [BTN.user.myOrders, BTN.user.backMain]]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
  await setUserUiState(db, chatId, SHOP_STATES.chooseProduct, { categoryId });
}

async function sendQuantityMenu({ db, chatId, productId, categoryId, isAdminUser }) {
  const product = await getShopProductById(db, productId);
  if (!product) {
    await sendMessage(chatId, "Server không tồn tại.");
    await sendProductsMenu({ db, chatId, categoryId, isAdminUser });
    return;
  }
  const stock = await countAvailableShopStock(db, product.id);
  const warrantyText = product.warranty_enabled && Number(product.warranty_days) > 0 ? `Có bảo hành ${product.warranty_days} ngày` : "Không bảo hành";
  const lines = [
    `🧾 Chọn số lượng cho "${product.name}"`,
    `Giá: ${toMoney(product.price)}/tài khoản`,
    `Kho còn: ${stock}`,
    `Bảo hành: ${warrantyText}`,
    product.description ? `Mô tả: ${product.description}` : ""
  ].filter(Boolean);
  const keyboard = buildKeyboard([QTY_BUTTONS, [BTN.user.qtyOther], [BTN.user.backProducts], [BTN.user.myOrders, BTN.user.backMain]]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
  await setUserUiState(db, chatId, SHOP_STATES.chooseQty, { productId, categoryId });
}

async function sendPaymentMenu({ db, chatId, productId, categoryId, quantity }) {
  const product = await getShopProductById(db, productId);
  if (!product) {
    await sendMessage(chatId, "Server không tồn tại.");
    return;
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const total = qty * Number(product.price || 0);
  const stock = await countAvailableShopStock(db, product.id);
  const lines = [`🧮 Thanh toán cho "${product.name}"`, `Số lượng: ${qty}`, `Đơn giá: ${toMoney(product.price)}`, `Tổng tiền: ${toMoney(total)}`, `Kho hiện tại: ${stock}`];
  const keyboard = buildKeyboard([[BTN.user.payBalance, BTN.user.payInvoice], [BTN.user.backProducts], [BTN.user.myOrders, BTN.user.backMain]]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
  await setUserUiState(db, chatId, SHOP_STATES.choosePayment, { productId, categoryId, quantity: qty });
}

function computeWarrantyUntil(days = 0) {
  const dayCount = Math.max(0, Number(days) || 0);
  if (!dayCount) return null;
  const date = new Date();
  date.setDate(date.getDate() + dayCount);
  return date.toISOString();
}

async function placeBalanceOrder({ db, chatId, product, quantity }) {
  const qty = Math.max(1, Number(quantity) || 1);
  const total = qty * Number(product.price || 0);
  const order = await createShopOrder(db, {
    userId: chatId,
    productId: product.id,
    quantity: qty,
    unitPrice: product.price,
    totalAmount: total,
    paymentMethod: "balance",
    paymentStatus: "paid",
    status: "processing",
    warrantyEnabled: Boolean(product.warranty_enabled),
    warrantyDays: Number(product.warranty_days || 0),
    metadata: {}
  });

  const allocation = await allocateShopStock(db, {
    productId: product.id,
    quantity: qty,
    orderId: order.id,
    userId: chatId
  });
  if (!allocation.ok) {
    await updateOrder(db, order.id, { status: "failed", payment_status: "failed", metadata: { reason: "out_of_stock" } });
    return { ok: false, reason: "out_of_stock" };
  }

  const stockIds = allocation.items.map(item => item.id);
  try {
    const updatedUser = await updateBalance(db, chatId, -total);
    const deliveredAt = new Date().toISOString();
    const warrantyEnabled = Boolean(product.warranty_enabled) && Number(product.warranty_days || 0) > 0;
    const doneOrder = await updateOrder(db, order.id, {
      status: "done",
      payment_status: "paid",
      paid_at: deliveredAt,
      delivered_at: deliveredAt,
      delivered_accounts: allocation.items.map(item => item.credential),
      warranty_enabled: warrantyEnabled,
      warranty_days: warrantyEnabled ? Number(product.warranty_days || 0) : 0,
      warranty_until: warrantyEnabled ? computeWarrantyUntil(product.warranty_days) : null,
      warranty_status: warrantyEnabled ? "active" : "none"
    });
    return {
      ok: true,
      order: doneOrder,
      credentials: allocation.items.map(item => item.credential),
      balanceAfter: updatedUser.balance || 0,
      total
    };
  } catch (error) {
    await releaseAllocatedShopStock(db, stockIds);
    await updateOrder(db, order.id, { status: "failed", payment_status: "failed", metadata: { reason: "charge_failed" } });
    throw error;
  }
}

async function createInvoiceOrder({ db, chatId, product, quantity, settings, user }) {
  const qty = Math.max(1, Number(quantity) || 1);
  const total = qty * Number(product.price || 0);
  const expiresAt = new Date(Date.now() + INVOICE_AUTO_CANCEL_MS).toISOString();
  let order = await createShopOrder(db, {
    userId: chatId,
    productId: product.id,
    quantity: qty,
    unitPrice: product.price,
    totalAmount: total,
    paymentMethod: "invoice",
    paymentStatus: "pending",
    status: "awaiting_payment",
    warrantyEnabled: Boolean(product.warranty_enabled),
    warrantyDays: Number(product.warranty_days || 0),
    metadata: { invoice_expires_at: expiresAt, invoice_expire_minutes: 60 }
  });
  const transferNote = buildOrderTransferNote(settings, user, order.id);
  order = await updateOrder(db, order.id, { transfer_note: transferNote });
  return { order, total, transferNote };
}

async function completeInvoiceOrderIfPaid({ db, chatId, order, product }) {
  if (order?.payment_status !== "pending" || order?.status !== "awaiting_payment") {
    return { ok: false, reason: "not_pending" };
  }
  const result = await fetchAcbTransactions(db, 50);
  if (!result.ok) {
    return { ok: false, reason: "check_failed", detail: result.reason };
  }

  const targetAmount = Number(order.total_amount || 0);
  const normalizedNote = normalizeDescription(order.transfer_note || "");
  let matched = null;

  for (const tran of result.transactions || []) {
    const type = String(tran.type || "IN").toUpperCase();
    if (type === "OUT") continue;
    const tranId = tran.transactionID || tran.id || tran.transId;
    if (!tranId) continue;
    const amount = Number(tran.amount || 0);
    if (amount < targetAmount) continue;
    const description = normalizeDescription(tran.description || "");
    if (!description.includes(normalizedNote)) continue;
    matched = { ...tran, tranId };
    break;
  }
  if (!matched) return { ok: false, reason: "not_found" };

  const allocation = await allocateShopStock(db, {
    productId: product.id,
    quantity: order.quantity || 1,
    orderId: order.id,
    userId: chatId
  });
  if (!allocation.ok) return { ok: false, reason: "out_of_stock" };

  const stockIds = allocation.items.map(item => item.id);
  try {
    const now = new Date().toISOString();
    const warrantyEnabled = Boolean(product.warranty_enabled) && Number(product.warranty_days || 0) > 0;
    const updated = await updateOrder(db, order.id, {
      status: "done",
      payment_status: "paid",
      paid_at: now,
      delivered_at: now,
      delivered_accounts: allocation.items.map(item => item.credential),
      warranty_enabled: warrantyEnabled,
      warranty_days: warrantyEnabled ? Number(product.warranty_days || 0) : 0,
      warranty_until: warrantyEnabled ? computeWarrantyUntil(product.warranty_days) : null,
      warranty_status: warrantyEnabled ? "active" : "none",
      metadata: { ...(order.metadata || {}), payment_tran_id: matched.tranId }
    });
    const existed = await findTransaction(db, matched.tranId);
    if (!existed) {
      await insertTransaction(db, {
        tran_id: matched.tranId,
        amount: Number(matched.amount || targetAmount || 0),
        user_id: chatId,
        description: matched.description || null,
        source: "order_invoice"
      });
    }
    return { ok: true, order: updated, credentials: allocation.items.map(item => item.credential) };
  } catch (error) {
    await releaseAllocatedShopStock(db, stockIds);
    throw error;
  }
}

function canRequestWarranty(order) {
  if (!order?.warranty_enabled || !order?.warranty_until) return false;
  const until = new Date(order.warranty_until);
  if (Number.isNaN(until.getTime())) return false;
  if (Date.now() > until.getTime()) return false;
  return (order.warranty_status || "active") !== "requested";
}

async function notifyAdminsForWarranty(settings, text) {
  const adminIds = getAdminList(settings);
  if (!adminIds.length) return;
  await Promise.all(adminIds.map(id => sendMessage(id, text).catch(error => logger.error("Cannot send admin alert", error.message))));
}

async function broadcastMessageToAllUsers(db, messageText) {
  const userIds = await listAllUserIds(db);
  if (!userIds.length) {
    return { total: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < userIds.length; i += BROADCAST_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + BROADCAST_CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map(userId => sendMessage(userId, messageText)));
    results.forEach(result => {
      if (result.status === "fulfilled" && result.value?.ok) sent += 1;
      else failed += 1;
    });
    if (i + BROADCAST_CHUNK_SIZE < userIds.length) {
      await sleep(120);
    }
  }

  return { total: userIds.length, sent, failed };
}

async function broadcastStockImported({ db, productId, insertedCount, stockCount }) {
  if (!productId || Number(insertedCount) <= 0) {
    return { total: 0, sent: 0, failed: 0 };
  }
  const product = await getShopProductById(db, productId);
  const lines = [
    "📢 Cập nhật kho hàng",
    `Server: ${product?.name || "N/A"}`,
    `Số lượng nhập thêm: ${Math.max(0, Number(insertedCount) || 0)}`,
    `Kho hiện tại: ${Math.max(0, Number(stockCount) || 0)}`
  ];
  return broadcastMessageToAllUsers(db, lines.join("\n"));
}

export async function expirePendingInvoiceOrders({ db, notifyUsers = true, limit = 200 } = {}) {
  const cutoffIso = toIsoBeforeNow(INVOICE_AUTO_CANCEL_MS);
  const candidates = await listExpiredPendingInvoiceOrders(db, cutoffIso, limit);
  if (!candidates.length) {
    return { expiredCount: 0, notifiedCount: 0 };
  }

  let notifiedCount = 0;
  for (const order of candidates) {
    const expiredAt = new Date().toISOString();
    await updateOrder(db, order.id, {
      status: "cancelled",
      payment_status: "expired",
      metadata: {
        ...(order.metadata || {}),
        invoice_expired_at: expiredAt,
        invoice_expire_reason: "timeout_1h"
      }
    });

    if (notifyUsers && order?.user_id) {
      const msg = [
        `⏰ Đơn #${shortId(order.id)} đã quá 1 giờ và được hủy tự động.`,
        "Vui lòng tạo đơn mới nếu bạn vẫn muốn mua."
      ].join("\n");
      const sentRes = await sendMessage(order.user_id, msg);
      if (sentRes?.ok) {
        notifiedCount += 1;
      }
    }
  }

  return { expiredCount: candidates.length, notifiedCount };
}

async function sendUserOrderList({ db, chatId }) {
  const orders = await listUserShopOrders(db, chatId, 20);
  if (!orders.length) {
    await sendMessage(chatId, "Bạn chưa có đơn hàng nào.", buildKeyboard([[BTN.user.backCategories], [BTN.user.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.userOrders, {});
    return;
  }
  const products = await getShopProductsByIds(db, orders.map(item => item.product_id).filter(Boolean));
  const productMap = new Map(products.map(item => [item.id, item]));
  const lines = ["🧾 Đơn hàng của bạn:"];
  orders.forEach((order, index) => {
    const product = productMap.get(order.product_id);
    lines.push(
      `${index + 1}. #${shortId(order.id)} • ${product?.name || "N/A"} • SL ${order.quantity || 1} • ${toMoney(order.total_amount || 0)} • ${buildOrderStatusLabel(order)}`
    );
  });
  const keyboard = buildKeyboard([...chunkByTwo(orders.map(order => orderButton(order, productMap.get(order.product_id)?.name || "N/A"))), [BTN.user.backCategories], [BTN.user.backMain]]);
  await sendMessage(chatId, lines.join("\n"), keyboard);
  await setUserUiState(db, chatId, SHOP_STATES.userOrders, {});
}

async function sendUserOrderDetail({ db, chatId, order }) {
  const product = order.product_id ? await getShopProductById(db, order.product_id) : null;
  const lines = [
    `🧾 Chi tiết đơn #${shortId(order.id)}`,
    `Server: ${product?.name || "N/A"}`,
    `Số lượng: ${order.quantity || 1}`,
    `Đơn giá: ${toMoney(order.unit_price || 0)}`,
    `Tổng: ${toMoney(order.total_amount || 0)}`,
    `Thanh toán: ${order.payment_method === "invoice" ? "Hóa đơn" : "Số dư"}`,
    `Trạng thái: ${buildOrderStatusLabel(order)}`,
    `Bảo hành: ${buildWarrantyStatusLabel(order)}`,
    order.transfer_note ? `Nội dung CK: ${order.transfer_note}` : "",
    order.warranty_until ? `Hạn bảo hành: ${new Date(order.warranty_until).toLocaleString("vi-VN")}` : ""
  ].filter(Boolean);
  const rows = [[BTN.user.backToOrders], [BTN.user.backMain]];
  if (canRequestWarranty(order)) rows.unshift([BTN.user.warrantyRequest]);
  await sendMessage(chatId, lines.join("\n"), buildKeyboard(rows));
  await setUserUiState(db, chatId, SHOP_STATES.userOrderDetail, { orderId: order.id });
}

async function sendAdminHome({ db, chatId }) {
  await sendMessage(
    chatId,
    "📦 Quản lý hàng hóa:",
    buildKeyboard([
      [BTN.admin.orderHistory, BTN.admin.warranty],
      [BTN.admin.categories, BTN.admin.products],
      [BTN.admin.stockImport],
      [BTN.admin.backMain]
    ])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminHome, {});
}

async function sendAdminCategoryMenu({ db, chatId }) {
  await sendMessage(
    chatId,
    "📁 Quản lý mục mẹ:\nĐịnh dạng thêm/sửa: Tên|Mô tả",
    buildKeyboard([[BTN.admin.add, BTN.admin.edit], [BTN.admin.remove], [BTN.admin.backMain]])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminCategoryMenu, {});
}

async function sendAdminProductMenu({ db, chatId }) {
  await sendMessage(
    chatId,
    "🖥 Quản lý server:\nĐịnh dạng thêm/sửa: Tên|Mô tả|Giá|Bảo_hành_ngày (0 = tắt BH).",
    buildKeyboard([[BTN.admin.add, BTN.admin.edit], [BTN.admin.remove, BTN.admin.toggleStatus], [BTN.admin.backMain]])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminProductMenu, {});
}

async function sendAdminImportMenu({ db, chatId }) {
  await sendMessage(
    chatId,
    "📥 Nhập hàng:\nMỗi dòng 1 tài khoản.",
    buildKeyboard([[BTN.admin.importManual, BTN.admin.importFile], [BTN.admin.backMain]])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminImportMenu, {});
}

async function sendAdminOrderHistory({ db, chatId }) {
  const orders = await listRecentShopOrders(db, 30);
  if (!orders.length) {
    await sendMessage(chatId, "Chưa có đơn hàng nào.", buildKeyboard([[BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminOrderList, {});
    return;
  }
  const [products, users] = await Promise.all([
    getShopProductsByIds(db, orders.map(item => item.product_id).filter(Boolean)),
    getUsersByIds(db, orders.map(item => item.user_id).filter(Boolean))
  ]);
  const productMap = new Map(products.map(item => [item.id, item]));
  const userMap = new Map(users.map(item => [item.user_id, item]));
  const lines = ["📜 Lịch sử đơn hàng:"];
  orders.forEach((order, index) => {
    const product = productMap.get(order.product_id);
    const user = userMap.get(order.user_id);
    lines.push(
      `${index + 1}. #${shortId(order.id)} • U${order.user_id} (${user?.username ? `@${user.username}` : "N/A"}) • ${product?.name || "N/A"} • SL ${order.quantity || 1} • ${toMoney(order.total_amount || 0)} • ${buildOrderStatusLabel(order)}`
    );
  });
  await sendMessage(
    chatId,
    lines.join("\n"),
    buildKeyboard([...chunkByTwo(orders.map(order => orderButton(order, productMap.get(order.product_id)?.name || "N/A"))), [BTN.admin.backMain]])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminOrderList, {});
}

async function sendAdminWarrantyList({ db, chatId }) {
  const orders = await listWarrantyRequestedOrders(db, 30);
  if (!orders.length) {
    await sendMessage(chatId, "Không có đơn chờ bảo hành.", buildKeyboard([[BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminWarrantyList, {});
    return;
  }
  const products = await getShopProductsByIds(db, orders.map(item => item.product_id).filter(Boolean));
  const productMap = new Map(products.map(item => [item.id, item]));
  const lines = ["🛡 Danh sách đơn cần bảo hành:"];
  orders.forEach((order, index) => {
    lines.push(`${index + 1}. #${shortId(order.id)} • U${order.user_id} • ${productMap.get(order.product_id)?.name || "N/A"} • SL ${order.quantity || 1}`);
  });
  await sendMessage(
    chatId,
    lines.join("\n"),
    buildKeyboard([...chunkByTwo(orders.map(order => orderButton(order, productMap.get(order.product_id)?.name || "N/A"))), [BTN.admin.backMain]])
  );
  await setUserUiState(db, chatId, SHOP_STATES.adminWarrantyList, {});
}

async function sendAdminWarrantyDetail({ db, chatId, order }) {
  const product = order.product_id ? await getShopProductById(db, order.product_id) : null;
  const lines = [
    `🛡 Yêu cầu bảo hành #${shortId(order.id)}`,
    `User: ${order.user_id}`,
    `Server: ${product?.name || "N/A"}`,
    `Số lượng: ${order.quantity || 1}`,
    `Ghi chú khách: ${order.warranty_note || "(không có)"}`
  ];
  await sendMessage(chatId, lines.join("\n"), buildKeyboard([[BTN.admin.warrantyApprove, BTN.admin.warrantyReject], [BTN.admin.backMain]]));
  await setUserUiState(db, chatId, SHOP_STATES.adminWarrantyDetail, { orderId: order.id });
}

async function handleCategorySelection({ db, chatId, text, isAdminUser }) {
  const categories = await listShopCategories(db, { activeOnly: true });
  const selected = resolveByShortId(categories, "id", parseShortButtonId(text, "📁"));
  if (!selected) {
    await sendMessage(chatId, "Bạn cần chọn mục mẹ bằng nút.");
    return true;
  }
  await sendProductsMenu({ db, chatId, categoryId: selected.id, isAdminUser });
  return true;
}

async function handleProductSelection({ db, chatId, text, statePayload, isAdminUser }) {
  const products = await listShopProducts(db, { categoryId: statePayload.categoryId, activeOnly: true });
  const selected = resolveByShortId(products, "id", parseShortButtonId(text, "🖥"));
  if (!selected) {
    await sendMessage(chatId, "Bạn cần chọn server bằng nút.");
    return true;
  }
  await sendQuantityMenu({ db, chatId, productId: selected.id, categoryId: statePayload.categoryId, isAdminUser });
  return true;
}

async function handleStateByText({ db, chatId, text, document, state, payload, settings, user, isAdminUser }) {
  if (state === SHOP_STATES.chooseCategory) {
    if (text === BTN.user.myOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    return handleCategorySelection({ db, chatId, text, isAdminUser });
  }

  if (state === SHOP_STATES.chooseProduct) {
    if (text === BTN.user.backCategories) return sendCategoriesMenu({ db, chatId, isAdminUser }).then(() => true);
    if (text === BTN.user.myOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    return handleProductSelection({ db, chatId, text, statePayload: payload, isAdminUser });
  }

  if (state === SHOP_STATES.chooseQty) {
    if (QTY_BUTTONS.includes(text)) return sendPaymentMenu({ db, chatId, productId: payload.productId, categoryId: payload.categoryId, quantity: Number(text) }).then(() => true);
    if (text === BTN.user.qtyOther) {
      await sendMessage(chatId, "Nhập số lượng mong muốn (số nguyên > 0).", buildKeyboard([[BTN.user.backProducts], [BTN.user.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.inputQty, payload);
      return true;
    }
    if (text === BTN.user.backProducts) return sendProductsMenu({ db, chatId, categoryId: payload.categoryId, isAdminUser }).then(() => true);
    if (text === BTN.user.myOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    await sendMessage(chatId, "Vui lòng chọn số lượng bằng nút.");
    return true;
  }

  if (state === SHOP_STATES.inputQty) {
    if (text === BTN.user.backProducts) return sendQuantityMenu({ db, chatId, productId: payload.productId, categoryId: payload.categoryId, isAdminUser }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    const qty = ensurePositiveInt(String(text || "").replace(/[^\d]/g, ""));
    if (!qty) {
      await sendMessage(chatId, "Số lượng không hợp lệ.");
      return true;
    }
    await sendPaymentMenu({ db, chatId, productId: payload.productId, categoryId: payload.categoryId, quantity: qty });
    return true;
  }

  if (state === SHOP_STATES.choosePayment) {
    if (text === BTN.user.payBalance || text === BTN.user.payInvoice) {
      const product = await getShopProductById(db, payload.productId);
      if (!product) {
        await sendMessage(chatId, "Server không tồn tại.");
        return true;
      }
      const total = Number(product.price || 0) * Number(payload.quantity || 1);
      const payMode = text === BTN.user.payBalance ? SHOP_STATES.confirmBalance : SHOP_STATES.confirmInvoice;
      await sendMessage(
        chatId,
        `Xác nhận mua bằng ${text === BTN.user.payBalance ? "số dư" : "hóa đơn"}?\nServer: ${product.name}\nSL: ${payload.quantity}\nTổng: ${toMoney(total)}`,
        buildKeyboard([[BTN.user.confirmYes, BTN.user.confirmNo], [BTN.user.backProducts]])
      );
      await setUserUiState(db, chatId, payMode, payload);
      return true;
    }
    if (text === BTN.user.backProducts) return sendQuantityMenu({ db, chatId, productId: payload.productId, categoryId: payload.categoryId, isAdminUser }).then(() => true);
    if (text === BTN.user.myOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    await sendMessage(chatId, "Vui lòng chọn phương thức bằng nút.");
    return true;
  }

  if (state === SHOP_STATES.confirmBalance) {
    if (text === BTN.user.confirmNo || text === BTN.user.backProducts) return sendPaymentMenu({ db, chatId, ...payload }).then(() => true);
    if (text !== BTN.user.confirmYes) {
      await sendMessage(chatId, "Chọn xác nhận hoặc quay lại.");
      return true;
    }
    const product = await getShopProductById(db, payload.productId);
    if (!product) {
      await sendMessage(chatId, "Server không tồn tại.");
      return true;
    }
    const stock = await countAvailableShopStock(db, product.id);
    if (stock < Number(payload.quantity || 1)) {
      await sendMessage(chatId, "Kho không đủ.");
      return sendQuantityMenu({ db, chatId, productId: product.id, categoryId: payload.categoryId, isAdminUser }).then(() => true);
    }
    const users = await getUsersByIds(db, [chatId]);
    const balance = users[0]?.balance || 0;
    const total = Number(product.price || 0) * Number(payload.quantity || 1);
    if (balance < total) {
      await sendMessage(chatId, `Số dư không đủ. Hiện có ${toMoney(balance)}, cần ${toMoney(total)}.`);
      return sendPaymentMenu({ db, chatId, ...payload }).then(() => true);
    }
    const result = await placeBalanceOrder({ db, chatId, product, quantity: payload.quantity });
    if (!result.ok) {
      await sendMessage(chatId, "Kho vừa hết, vui lòng thử lại.");
      return true;
    }
    const lines = [`✅ Mua thành công đơn #${shortId(result.order.id)}`, `Server: ${product.name}`, `SL: ${payload.quantity}`, `Đã trừ: ${toMoney(result.total)}`, `Số dư còn: ${toMoney(result.balanceAfter)}`, "", "🔑 Tài khoản giao:"];
    result.credentials.forEach((credential, idx) => lines.push(`${idx + 1}. ${credential}`));
    await sendMessage(chatId, lines.join("\n"), buildKeyboard([[BTN.user.myOrders], [BTN.user.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.userOrders, {});
    return true;
  }

  if (state === SHOP_STATES.confirmInvoice) {
    if (text === BTN.user.confirmNo || text === BTN.user.backProducts) return sendPaymentMenu({ db, chatId, ...payload }).then(() => true);
    if (text !== BTN.user.confirmYes) {
      await sendMessage(chatId, "Chọn xác nhận hoặc quay lại.");
      return true;
    }
    const validation = validateBankSettings(settings);
    if (!validation.ready) {
      await sendMessage(chatId, "Chưa cấu hình đủ thông tin ngân hàng.");
      await clearUserUiState(db, chatId);
      return true;
    }
    const product = await getShopProductById(db, payload.productId);
    if (!product) {
      await sendMessage(chatId, "Server không tồn tại.");
      return true;
    }
    const invoice = await createInvoiceOrder({ db, chatId, product, quantity: payload.quantity, settings, user });
    const qrUrl = buildVietQrByCustomNote(settings, invoice.transferNote, invoice.total);
    const lines = [
      `🧾 Đơn #${shortId(invoice.order.id)} đã tạo`,
      `Server: ${product.name}`,
      `SL: ${payload.quantity}`,
      `Tổng: ${toMoney(invoice.total)}`,
      "Hạn thanh toán: 60 phút",
      `Ngân hàng: ${settings.bank_name || settings.bank_code}`,
      `Chủ TK: ${settings.account_name || "(chưa cài)"}`,
      `Số TK: ${settings.account_number || "(chưa cài)"}`,
      `Nội dung CK: ${invoice.transferNote}`,
      "",
      "Sau khi chuyển khoản, bấm nút xác nhận thanh toán."
    ];
    const keyboard = buildKeyboard([[BTN.user.invoiceCheck], [BTN.user.myOrders, BTN.user.backMain]]);
    if (qrUrl) await sendPhoto(chatId, qrUrl, lines.join("\n"), keyboard);
    else await sendMessage(chatId, lines.join("\n"), keyboard);
    await setUserUiState(db, chatId, SHOP_STATES.invoicePending, { orderId: invoice.order.id });
    return true;
  }

  if (state === SHOP_STATES.invoicePending) {
    if (text === BTN.user.myOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    if (text !== BTN.user.invoiceCheck) {
      await sendMessage(chatId, "Bấm nút xác nhận thanh toán để kiểm tra.");
      return true;
    }
    const order = await getOrderById(db, payload.orderId);
    if (!order || order.user_id !== chatId) {
      await sendMessage(chatId, "Không tìm thấy đơn.");
      return true;
    }
    const orderCreatedMs = Number(new Date(order.created_at).getTime());
    const isTimeoutReached =
      Number.isFinite(orderCreatedMs) &&
      Date.now() - orderCreatedMs >= INVOICE_AUTO_CANCEL_MS &&
      order.payment_status === "pending" &&
      order.status === "awaiting_payment";
    if (isTimeoutReached) {
      const expiredOrder = await updateOrder(db, order.id, {
        status: "cancelled",
        payment_status: "expired",
        metadata: {
          ...(order.metadata || {}),
          invoice_expired_at: new Date().toISOString(),
          invoice_expire_reason: "timeout_1h"
        }
      });
      await sendMessage(chatId, "Đơn hóa đơn đã quá hạn 1 giờ và đã bị hủy.");
      return sendUserOrderDetail({ db, chatId, order: expiredOrder }).then(() => true);
    }
    if (order.payment_status === "paid" || order.status === "done") return sendUserOrderDetail({ db, chatId, order }).then(() => true);
    if (order.payment_status === "expired" || order.status === "cancelled" || order.status === "canceled") {
      await sendMessage(chatId, "Đơn hóa đơn đã quá hạn 1 giờ và đã bị hủy. Vui lòng tạo đơn mới.");
      return sendUserOrderDetail({ db, chatId, order }).then(() => true);
    }
    const product = await getShopProductById(db, order.product_id);
    if (!product) {
      await sendMessage(chatId, "Không tìm thấy server.");
      return true;
    }
    const completed = await completeInvoiceOrderIfPaid({ db, chatId, order, product });
    if (!completed.ok) {
      if (completed.reason === "not_found") await sendMessage(chatId, "Chưa thấy giao dịch khớp nội dung chuyển khoản.");
      else if (completed.reason === "out_of_stock") await sendMessage(chatId, "Đã nhận thanh toán nhưng kho không đủ. Liên hệ admin.");
      else if (completed.reason === "not_pending") await sendMessage(chatId, "Đơn không còn ở trạng thái chờ thanh toán.");
      else await sendMessage(chatId, `Kiểm tra thanh toán thất bại: ${completed.detail || completed.reason}`);
      return true;
    }
    const lines = [`✅ Đã xác nhận đơn #${shortId(completed.order.id)}`, `Server: ${product.name}`, `SL: ${completed.order.quantity || 1}`, "", "🔑 Tài khoản giao:"];
    completed.credentials.forEach((credential, idx) => lines.push(`${idx + 1}. ${credential}`));
    await sendMessage(chatId, lines.join("\n"), buildKeyboard([[BTN.user.myOrders], [BTN.user.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.userOrders, {});
    return true;
  }

  if (state === SHOP_STATES.userOrders) {
    if (text === BTN.user.backCategories) return sendCategoriesMenu({ db, chatId, isAdminUser }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    const orders = await listUserShopOrders(db, chatId, 50);
    const selected = resolveByShortId(orders, "id", parseShortButtonId(text, "🧾"));
    if (!selected) {
      await sendMessage(chatId, "Chọn đơn bằng nút.");
      return true;
    }
    return sendUserOrderDetail({ db, chatId, order: selected }).then(() => true);
  }

  if (state === SHOP_STATES.userOrderDetail) {
    if (text === BTN.user.backToOrders) return sendUserOrderList({ db, chatId }).then(() => true);
    if (text === BTN.user.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã về menu chính.", defaultMenuKeyboard(isAdminUser));
      return true;
    }
    if (text !== BTN.user.warrantyRequest) {
      await sendMessage(chatId, "Chọn thao tác bằng nút.");
      return true;
    }
    const order = await getOrderById(db, payload.orderId);
    if (!order || order.user_id !== chatId || !canRequestWarranty(order)) {
      await sendMessage(chatId, "Đơn không đủ điều kiện bảo hành.");
      return true;
    }
    await sendMessage(chatId, `Xác nhận gửi yêu cầu bảo hành cho đơn #${shortId(order.id)}?`, buildKeyboard([[BTN.user.confirmYes, BTN.user.confirmNo], [BTN.user.backToOrders]]));
    await setUserUiState(db, chatId, SHOP_STATES.warrantyConfirm, { orderId: order.id });
    return true;
  }

  if (state === SHOP_STATES.warrantyConfirm) {
    if (text === BTN.user.confirmNo || text === BTN.user.backToOrders) {
      const order = await getOrderById(db, payload.orderId);
      if (order) return sendUserOrderDetail({ db, chatId, order }).then(() => true);
      return sendUserOrderList({ db, chatId }).then(() => true);
    }
    if (text !== BTN.user.confirmYes) {
      await sendMessage(chatId, "Chọn xác nhận hoặc quay lại.");
      return true;
    }
    const order = await getOrderById(db, payload.orderId);
    if (!order || order.user_id !== chatId || !canRequestWarranty(order)) {
      await sendMessage(chatId, "Đơn không đủ điều kiện bảo hành.");
      return true;
    }
    await updateOrder(db, order.id, { warranty_status: "requested", warranty_requested_at: new Date().toISOString(), warranty_note: "Khách yêu cầu bảo hành" });
    await sendMessage(chatId, `Đã gửi yêu cầu bảo hành cho đơn #${shortId(order.id)}.`);
    await notifyAdminsForWarranty(settings, `🛡 Yêu cầu bảo hành mới\nĐơn: #${shortId(order.id)}\nUser: ${order.user_id}\nVào "${SHOP_ADMIN_BUTTON}" > "${BTN.admin.warranty}" để xử lý.`);
    return sendUserOrderList({ db, chatId }).then(() => true);
  }

  // Admin menus
  if (state === SHOP_STATES.adminHome) {
    if (text === BTN.admin.orderHistory) return sendAdminOrderHistory({ db, chatId }).then(() => true);
    if (text === BTN.admin.warranty) return sendAdminWarrantyList({ db, chatId }).then(() => true);
    if (text === BTN.admin.categories) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    if (text === BTN.admin.products) return sendAdminProductMenu({ db, chatId }).then(() => true);
    if (text === BTN.admin.stockImport) return sendAdminImportMenu({ db, chatId }).then(() => true);
    if (text === BTN.admin.backMain) {
      await clearUserUiState(db, chatId);
      await sendMessage(chatId, "Đã thoát quản lý hàng hóa.", defaultMenuKeyboard(true));
      return true;
    }
    await sendMessage(chatId, "Chọn thao tác bằng nút.");
    return true;
  }

  // Category admin
  if (state === SHOP_STATES.adminCategoryMenu || state === SHOP_STATES.adminCategoryAddInput || state === SHOP_STATES.adminCategoryEditPick || state === SHOP_STATES.adminCategoryEditInput || state === SHOP_STATES.adminCategoryDeletePick || state === SHOP_STATES.adminCategoryDeleteConfirm) {
    return handleAdminCategoryState({ db, chatId, text, state, payload });
  }
  // Product admin
  if (state === SHOP_STATES.adminProductMenu || state === SHOP_STATES.adminProductAddPickCategory || state === SHOP_STATES.adminProductAddInput || state === SHOP_STATES.adminProductEditPick || state === SHOP_STATES.adminProductEditInput || state === SHOP_STATES.adminProductDeletePick || state === SHOP_STATES.adminProductDeleteConfirm || state === SHOP_STATES.adminProductTogglePick) {
    return handleAdminProductState({ db, chatId, text, state, payload });
  }
  // Import admin
  if (state === SHOP_STATES.adminImportMenu || state === SHOP_STATES.adminImportManualPick || state === SHOP_STATES.adminImportManualInput || state === SHOP_STATES.adminImportFilePick || state === SHOP_STATES.adminImportFileWait) {
    return handleAdminImportState({ db, chatId, text, document, state, payload });
  }
  // Order/Warranty admin
  if (state === SHOP_STATES.adminOrderList || state === SHOP_STATES.adminOrderDetail || state === SHOP_STATES.adminWarrantyList || state === SHOP_STATES.adminWarrantyDetail || state === SHOP_STATES.adminWarrantyRejectInput) {
    return handleAdminOrderState({ db, chatId, text, state, payload });
  }

  return false;
}

async function handleAdminCategoryState({ db, chatId, text, state, payload }) {
  if (state === SHOP_STATES.adminCategoryMenu) {
    if (text === BTN.admin.add) {
      await sendMessage(chatId, "Nhập mục mẹ theo định dạng: Tên|Mô tả", buildKeyboard([[BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminCategoryAddInput, {});
      return true;
    }
    if (text === BTN.admin.edit) {
      const categories = await listShopCategories(db);
      await sendMessage(chatId, "Chọn mục mẹ cần sửa:", buildKeyboard([...chunkByTwo(categories.map(categoryButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminCategoryEditPick, {});
      return true;
    }
    if (text === BTN.admin.remove) {
      const categories = await listShopCategories(db);
      await sendMessage(chatId, "Chọn mục mẹ cần xóa:", buildKeyboard([...chunkByTwo(categories.map(categoryButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminCategoryDeletePick, {});
      return true;
    }
    if (text === BTN.admin.backMain) return sendAdminHome({ db, chatId }).then(() => true);
    await sendMessage(chatId, "Chọn thao tác bằng nút.");
    return true;
  }
  if (state === SHOP_STATES.adminCategoryAddInput) {
    if (text === BTN.admin.backMain) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    const parsed = parseCategoryInput(text);
    if (!parsed) {
      await sendMessage(chatId, "Sai định dạng. Dùng: Tên|Mô tả");
      return true;
    }
    const created = await createShopCategory(db, parsed);
    await sendMessage(chatId, `Đã thêm mục mẹ #${shortId(created.id)}: ${created.name}`);
    return sendAdminCategoryMenu({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminCategoryEditPick) {
    if (text === BTN.admin.backMain) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    const categories = await listShopCategories(db);
    const selected = resolveByShortId(categories, "id", parseShortButtonId(text, "📁"));
    if (!selected) {
      await sendMessage(chatId, "Chọn mục mẹ bằng nút.");
      return true;
    }
    await sendMessage(chatId, `Nhập nội dung mới cho "${selected.name}" theo định dạng: Tên|Mô tả`, buildKeyboard([[BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminCategoryEditInput, { categoryId: selected.id });
    return true;
  }
  if (state === SHOP_STATES.adminCategoryEditInput) {
    if (text === BTN.admin.backMain) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    const parsed = parseCategoryInput(text);
    if (!parsed) {
      await sendMessage(chatId, "Sai định dạng. Dùng: Tên|Mô tả");
      return true;
    }
    const updated = await updateShopCategory(db, payload.categoryId, parsed);
    await sendMessage(chatId, `Đã cập nhật mục mẹ #${shortId(updated.id)}: ${updated.name}`);
    return sendAdminCategoryMenu({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminCategoryDeletePick) {
    if (text === BTN.admin.backMain) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    const categories = await listShopCategories(db);
    const selected = resolveByShortId(categories, "id", parseShortButtonId(text, "📁"));
    if (!selected) {
      await sendMessage(chatId, "Chọn mục mẹ bằng nút.");
      return true;
    }
    await sendMessage(chatId, `Xác nhận xóa mục "${selected.name}"?`, buildKeyboard([[BTN.user.confirmYes, BTN.user.confirmNo], [BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminCategoryDeleteConfirm, { categoryId: selected.id });
    return true;
  }
  if (state === SHOP_STATES.adminCategoryDeleteConfirm) {
    if (text === BTN.admin.backMain || text === BTN.user.confirmNo) return sendAdminCategoryMenu({ db, chatId }).then(() => true);
    if (text !== BTN.user.confirmYes) {
      await sendMessage(chatId, "Chọn xác nhận hoặc quay lại.");
      return true;
    }
    await deleteShopCategory(db, payload.categoryId);
    await sendMessage(chatId, "Đã xóa mục mẹ.");
    return sendAdminCategoryMenu({ db, chatId }).then(() => true);
  }
  return true;
}

async function handleAdminProductState({ db, chatId, text, state, payload }) {
  if (state === SHOP_STATES.adminProductMenu) {
    if (text === BTN.admin.add) {
      const categories = await listShopCategories(db);
      if (!categories.length) {
        await sendMessage(chatId, "Cần tạo mục mẹ trước.");
        return true;
      }
      await sendMessage(chatId, "Chọn mục mẹ cho server mới:", buildKeyboard([...chunkByTwo(categories.map(categoryButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductAddPickCategory, {});
      return true;
    }
    if (text === BTN.admin.edit) {
      const products = await listShopProducts(db);
      await sendMessage(chatId, "Chọn server cần sửa:", buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductEditPick, {});
      return true;
    }
    if (text === BTN.admin.remove) {
      const products = await listShopProducts(db);
      await sendMessage(chatId, "Chọn server cần xóa:", buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductDeletePick, {});
      return true;
    }
    if (text === BTN.admin.toggleStatus) {
      const products = await listShopProducts(db);
      await sendMessage(chatId, "Chọn server bật/tắt bảo hành:", buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductTogglePick, {});
      return true;
    }
    if (text === BTN.admin.backMain) return sendAdminHome({ db, chatId }).then(() => true);
    await sendMessage(chatId, "Chọn thao tác bằng nút.");
    return true;
  }
  if (state === SHOP_STATES.adminProductAddPickCategory) {
    if (text === BTN.admin.backMain) return sendAdminProductMenu({ db, chatId }).then(() => true);
    const categories = await listShopCategories(db);
    const selected = resolveByShortId(categories, "id", parseShortButtonId(text, "📁"));
    if (!selected) {
      await sendMessage(chatId, "Chọn mục mẹ bằng nút.");
      return true;
    }
    await sendMessage(chatId, `Nhập server mới cho "${selected.name}" theo định dạng: Tên|Mô tả|Giá|Bảo_hành_ngày`, buildKeyboard([[BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminProductAddInput, { categoryId: selected.id });
    return true;
  }
  if (state === SHOP_STATES.adminProductAddInput || state === SHOP_STATES.adminProductEditInput) {
    if (text === BTN.admin.backMain) return sendAdminProductMenu({ db, chatId }).then(() => true);
    const parsed = parseProductInput(text);
    if (!parsed) {
      await sendMessage(chatId, "Sai định dạng. Dùng: Tên|Mô tả|Giá|Bảo_hành_ngày");
      return true;
    }
    if (state === SHOP_STATES.adminProductAddInput) {
      const created = await createShopProduct(db, { categoryId: payload.categoryId, ...parsed });
      await sendMessage(chatId, `Đã thêm server #${shortId(created.id)}: ${created.name}`);
    } else {
      const updated = await updateShopProduct(db, payload.productId, parsed);
      await sendMessage(chatId, `Đã cập nhật server #${shortId(updated.id)}: ${updated.name}`);
    }
    return sendAdminProductMenu({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminProductEditPick || state === SHOP_STATES.adminProductDeletePick || state === SHOP_STATES.adminProductTogglePick) {
    if (text === BTN.admin.backMain) return sendAdminProductMenu({ db, chatId }).then(() => true);
    const products = await listShopProducts(db);
    const selected = resolveByShortId(products, "id", parseShortButtonId(text, "🖥"));
    if (!selected) {
      await sendMessage(chatId, "Chọn server bằng nút.");
      return true;
    }
    if (state === SHOP_STATES.adminProductEditPick) {
      await sendMessage(chatId, `Nhập nội dung mới cho "${selected.name}": Tên|Mô tả|Giá|Bảo_hành_ngày`, buildKeyboard([[BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductEditInput, { productId: selected.id });
      return true;
    }
    if (state === SHOP_STATES.adminProductDeletePick) {
      await sendMessage(chatId, `Xác nhận xóa "${selected.name}"?`, buildKeyboard([[BTN.user.confirmYes, BTN.user.confirmNo], [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminProductDeleteConfirm, { productId: selected.id });
      return true;
    }
    const enabled = !selected.warranty_enabled;
    const updated = await updateShopProduct(db, selected.id, {
      warrantyEnabled: enabled,
      warrantyDays: enabled ? Math.max(1, Number(selected.warranty_days || 0) || 30) : 0
    });
    await sendMessage(chatId, `Đã ${updated.warranty_enabled ? "bật" : "tắt"} bảo hành cho "${updated.name}" (${updated.warranty_days || 0} ngày).`);
    return sendAdminProductMenu({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminProductDeleteConfirm) {
    if (text === BTN.admin.backMain || text === BTN.user.confirmNo) return sendAdminProductMenu({ db, chatId }).then(() => true);
    if (text !== BTN.user.confirmYes) {
      await sendMessage(chatId, "Chọn xác nhận hoặc quay lại.");
      return true;
    }
    await deleteShopProduct(db, payload.productId);
    await sendMessage(chatId, "Đã xóa server.");
    return sendAdminProductMenu({ db, chatId }).then(() => true);
  }
  return true;
}

async function handleAdminImportState({ db, chatId, text, document, state, payload }) {
  if (state === SHOP_STATES.adminImportMenu) {
    if (text === BTN.admin.importManual) {
      const products = await listShopProducts(db);
      await sendMessage(chatId, "Chọn server cần nhập thủ công:", buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminImportManualPick, {});
      return true;
    }
    if (text === BTN.admin.importFile) {
      const products = await listShopProducts(db);
      await sendMessage(chatId, "Chọn server cần nhập file .txt:", buildKeyboard([...chunkByTwo(products.map(productButton)), [BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminImportFilePick, {});
      return true;
    }
    if (text === BTN.admin.backMain) return sendAdminHome({ db, chatId }).then(() => true);
    await sendMessage(chatId, "Chọn thao tác bằng nút.");
    return true;
  }
  if (state === SHOP_STATES.adminImportManualPick || state === SHOP_STATES.adminImportFilePick) {
    if (text === BTN.admin.backMain) return sendAdminImportMenu({ db, chatId }).then(() => true);
    const products = await listShopProducts(db);
    const selected = resolveByShortId(products, "id", parseShortButtonId(text, "🖥"));
    if (!selected) {
      await sendMessage(chatId, "Chọn server bằng nút.");
      return true;
    }
    if (state === SHOP_STATES.adminImportManualPick) {
      await sendMessage(chatId, `Nhập tài khoản cho "${selected.name}" (mỗi dòng 1 tài khoản).`, buildKeyboard([[BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminImportManualInput, { productId: selected.id });
    } else {
      await sendMessage(chatId, `Gửi file .txt cho "${selected.name}" (mỗi dòng 1 tài khoản).`, buildKeyboard([[BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminImportFileWait, { productId: selected.id });
    }
    return true;
  }
  if (state === SHOP_STATES.adminImportManualInput) {
    if (text === BTN.admin.backMain) return sendAdminImportMenu({ db, chatId }).then(() => true);
    const lines = parseStockLines(text);
    if (!lines.length) {
      await sendMessage(chatId, "Không có dữ liệu hợp lệ.");
      return true;
    }
    const result = await createShopStockItems(db, payload.productId, lines);
    const stock = await countAvailableShopStock(db, payload.productId);
    const broadcast = await broadcastStockImported({
      db,
      productId: payload.productId,
      insertedCount: result.insertedCount,
      stockCount: stock
    });
    await sendMessage(
      chatId,
      `Đã nhập ${result.insertedCount} dòng. Kho hiện tại: ${stock}.\nĐã thông báo: ${broadcast.sent}/${broadcast.total} user.`
    );
    return sendAdminImportMenu({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminImportFileWait) {
    if (text === BTN.admin.backMain) return sendAdminImportMenu({ db, chatId }).then(() => true);
    if (!document?.file_id) {
      await sendMessage(chatId, "Vui lòng gửi file .txt.");
      return true;
    }
    const fileName = String(document.file_name || "").toLowerCase();
    if (fileName && !fileName.endsWith(".txt")) {
      await sendMessage(chatId, "Chỉ nhận file .txt.");
      return true;
    }
    const fileRes = await getTelegramFile(document.file_id);
    if (!fileRes?.ok || !fileRes?.result?.file_path) {
      await sendMessage(chatId, "Không tải được file từ Telegram.");
      return true;
    }
    const content = await downloadTelegramFile(fileRes.result.file_path);
    const lines = parseStockLines(content);
    if (!lines.length) {
      await sendMessage(chatId, "File không có dữ liệu hợp lệ.");
      return true;
    }
    const result = await createShopStockItems(db, payload.productId, lines);
    const stock = await countAvailableShopStock(db, payload.productId);
    const broadcast = await broadcastStockImported({
      db,
      productId: payload.productId,
      insertedCount: result.insertedCount,
      stockCount: stock
    });
    await sendMessage(
      chatId,
      `Đã nhập ${result.insertedCount} dòng từ file. Kho hiện tại: ${stock}.\nĐã thông báo: ${broadcast.sent}/${broadcast.total} user.`
    );
    return sendAdminImportMenu({ db, chatId }).then(() => true);
  }
  return true;
}

async function handleAdminOrderState({ db, chatId, text, state, payload }) {
  if (state === SHOP_STATES.adminOrderList) {
    if (text === BTN.admin.backMain) return sendAdminHome({ db, chatId }).then(() => true);
    const orders = await listRecentShopOrders(db, 50);
    const selected = resolveByShortId(orders, "id", parseShortButtonId(text, "🧾"));
    if (!selected) {
      await sendMessage(chatId, "Chọn đơn bằng nút.");
      return true;
    }
    const product = selected.product_id ? await getShopProductById(db, selected.product_id) : null;
    const lines = [
      `📜 Chi tiết đơn #${shortId(selected.id)}`,
      `User: ${selected.user_id}`,
      `Server: ${product?.name || "N/A"}`,
      `SL: ${selected.quantity || 1}`,
      `Đơn giá: ${toMoney(selected.unit_price || 0)}`,
      `Tổng: ${toMoney(selected.total_amount || 0)}`,
      `Thanh toán: ${selected.payment_method || "N/A"}`,
      `Trạng thái: ${buildOrderStatusLabel(selected)}`,
      `Bảo hành: ${buildWarrantyStatusLabel(selected)}`
    ];
    await sendMessage(chatId, lines.join("\n"), buildKeyboard([[BTN.admin.backMain]]));
    await setUserUiState(db, chatId, SHOP_STATES.adminOrderDetail, { orderId: selected.id });
    return true;
  }
  if (state === SHOP_STATES.adminOrderDetail) {
    if (text === BTN.admin.backMain) return sendAdminOrderHistory({ db, chatId }).then(() => true);
    await sendMessage(chatId, "Bấm quay lại để xem danh sách.");
    return true;
  }
  if (state === SHOP_STATES.adminWarrantyList) {
    if (text === BTN.admin.backMain) return sendAdminHome({ db, chatId }).then(() => true);
    const orders = await listWarrantyRequestedOrders(db, 50);
    const selected = resolveByShortId(orders, "id", parseShortButtonId(text, "🧾"));
    if (!selected) {
      await sendMessage(chatId, "Chọn đơn bằng nút.");
      return true;
    }
    return sendAdminWarrantyDetail({ db, chatId, order: selected }).then(() => true);
  }
  if (state === SHOP_STATES.adminWarrantyDetail) {
    if (text === BTN.admin.backMain) return sendAdminWarrantyList({ db, chatId }).then(() => true);
    const order = await getOrderById(db, payload.orderId);
    if (!order) return sendAdminWarrantyList({ db, chatId }).then(() => true);
    if (text === BTN.admin.warrantyReject) {
      await sendMessage(chatId, "Nhập lý do từ chối bảo hành:", buildKeyboard([[BTN.admin.backMain]]));
      await setUserUiState(db, chatId, SHOP_STATES.adminWarrantyRejectInput, { orderId: order.id });
      return true;
    }
    if (text !== BTN.admin.warrantyApprove) {
      await sendMessage(chatId, "Chọn thao tác bằng nút.");
      return true;
    }
    const product = await getShopProductById(db, order.product_id);
    if (!product) {
      await sendMessage(chatId, "Không tìm thấy server.");
      return true;
    }
    const allocation = await allocateShopStock(db, { productId: product.id, quantity: order.quantity || 1, orderId: order.id, userId: order.user_id });
    if (!allocation.ok) {
      await sendMessage(chatId, "Kho không đủ để cấp bảo hành.");
      return true;
    }
    await updateOrder(db, order.id, {
      warranty_status: "approved",
      warranty_resolved_at: new Date().toISOString(),
      metadata: { ...(order.metadata || {}), warranty_credentials: allocation.items.map(item => item.credential) }
    });
    const msg = [`✅ Bảo hành thành công cho đơn #${shortId(order.id)}`, `Server: ${product.name}`, "🔑 Tài khoản thay thế:"];
    allocation.items.forEach((item, idx) => msg.push(`${idx + 1}. ${item.credential}`));
    await sendMessage(order.user_id, msg.join("\n"));
    await sendMessage(chatId, "Đã cấp bảo hành và gửi tài khoản mới cho khách.");
    return sendAdminWarrantyList({ db, chatId }).then(() => true);
  }
  if (state === SHOP_STATES.adminWarrantyRejectInput) {
    if (text === BTN.admin.backMain) return sendAdminWarrantyList({ db, chatId }).then(() => true);
    const order = await getOrderById(db, payload.orderId);
    if (!order) return sendAdminWarrantyList({ db, chatId }).then(() => true);
    await updateOrder(db, order.id, { warranty_status: "rejected", warranty_resolved_at: new Date().toISOString(), warranty_note: String(text || "").trim() || "Từ chối bảo hành" });
    await sendMessage(order.user_id, `❌ Yêu cầu bảo hành đơn #${shortId(order.id)} đã bị từ chối.\nLý do: ${text}`);
    await sendMessage(chatId, "Đã từ chối yêu cầu bảo hành.");
    return sendAdminWarrantyList({ db, chatId }).then(() => true);
  }
  return true;
}

export async function handleShopFlow({ db, chatId, text, document, user, settings, isAdminUser, locale }) {
  const normalizedText = String(text || "").trim();
  if (isBuyActionText(normalizedText, locale)) {
    await sendCategoriesMenu({ db, chatId, isAdminUser });
    return { handled: true };
  }
  if (isAdminUser && isQuickImportActionText(normalizedText, locale)) {
    await sendAdminImportMenu({ db, chatId });
    return { handled: true };
  }
  if (isAdminUser && isShopManageActionText(normalizedText, locale)) {
    await sendAdminHome({ db, chatId });
    return { handled: true };
  }
  const state = user?.ui_state;
  if (!state) return { handled: false };
  const handled = await handleStateByText({
    db,
    chatId,
    text: normalizedText,
    document,
    state,
    payload: user?.ui_state_payload || {},
    settings,
    user,
    isAdminUser
  });
  return { handled };
}

function normalizeActionKey(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isBuyActionText(text = "", locale) {
  const key = normalizeActionKey(text);
  const candidates = [
    locale?.buttons?.buy,
    "🛒 Mua tài khoản",
    "🛒Mua tài khoản",
    "mua tài khoản",
    "mua tai khoan",
    "buy account"
  ].map(normalizeActionKey);
  return candidates.includes(key) || key.includes("mua tai khoan") || key.includes("buy account");
}

function isShopManageActionText(text = "", locale) {
  const key = normalizeActionKey(text);
  const candidates = [
    locale?.buttons?.shopManage,
    SHOP_ADMIN_BUTTON,
    "quản lý hàng hóa",
    "quan ly hang hoa",
    "product manager"
  ].map(normalizeActionKey);
  return candidates.includes(key) || key.includes("quan ly hang hoa") || key.includes("product manager");
}

function isQuickImportActionText(text = "", locale) {
  const key = normalizeActionKey(text);
  const candidates = [
    locale?.buttons?.import,
    "📥 Nhập hàng",
    "⚡ Nhập hàng nhanh",
    "nhap hang",
    "nhap hang nhanh",
    "📥 Import stock",
    "⚡ Quick import",
    "quick import"
  ].map(normalizeActionKey);
  return candidates.includes(key) || key.includes("nhap hang nhanh") || key.includes("quick import");
}
