import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.orders;

export async function createOrder(db, { userId, accountId, status = "pending" }) {
  const payload = {
    user_id: userId,
    account_id: accountId,
    status,
    created_at: new Date().toISOString()
  };

  const { error } = await db.from(TABLE).insert(payload);
  if (error) {
    throw error;
  }
}

export async function updateOrderStatus(db, orderId, status) {
  const { error } = await db
    .from(TABLE)
    .update({ status })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

export async function getRecentOrdersByUser(db, userId, limit = 5) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function countOrdersByUser(db, userId) {
  const { count, error } = await db
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function createShopOrder(
  db,
  {
    userId,
    productId,
    quantity,
    unitPrice,
    totalAmount,
    paymentMethod,
    paymentStatus = "pending",
    transferNote = null,
    status = "pending",
    warrantyEnabled = false,
    warrantyDays = 0,
    metadata = {}
  }
) {
  const payload = {
    user_id: userId,
    product_id: productId,
    quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
    unit_price: Math.max(0, Math.floor(Number(unitPrice) || 0)),
    total_amount: Math.max(0, Math.floor(Number(totalAmount) || 0)),
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    transfer_note: transferNote,
    status,
    warranty_enabled: Boolean(warrantyEnabled),
    warranty_days: Math.max(0, Math.floor(Number(warrantyDays) || 0)),
    metadata: metadata || {},
    created_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from(TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function getOrderById(db, orderId) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function updateOrder(db, orderId, patch = {}) {
  const payload = {
    ...patch
  };

  const { data, error } = await db
    .from(TABLE)
    .update(payload)
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function listUserShopOrders(db, userId, limit = 20) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function listRecentShopOrders(db, limit = 30) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .not("product_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function listWarrantyRequestedOrders(db, limit = 30) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("warranty_status", "requested")
    .order("warranty_requested_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function listExpiredPendingInvoiceOrders(db, olderThanIso, limit = 200) {
  const maxRows = Math.max(1, Number(limit) || 200);
  let query = db
    .from(TABLE)
    .select("*")
    .eq("payment_method", "invoice")
    .eq("payment_status", "pending")
    .eq("status", "awaiting_payment")
    .order("created_at", { ascending: true })
    .limit(maxRows);

  if (olderThanIso) {
    query = query.lt("created_at", olderThanIso);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
}

