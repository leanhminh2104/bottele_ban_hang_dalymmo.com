import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.shopStock;

function nowIso() {
  return new Date().toISOString();
}

function normalizeCredentialLine(line = "") {
  return String(line || "").trim();
}

export function parseStockLines(rawText = "") {
  return String(rawText || "")
    .split(/\r?\n/)
    .map(normalizeCredentialLine)
    .filter(Boolean);
}

export async function createShopStockItems(db, productId, lines = []) {
  const normalized = Array.from(new Set((lines || []).map(normalizeCredentialLine).filter(Boolean)));
  if (!normalized.length) {
    return { insertedCount: 0 };
  }

  const docs = normalized.map(credential => ({
    product_id: productId,
    credential,
    status: "available",
    created_at: nowIso()
  }));

  const { data, error } = await db
    .from(TABLE)
    .insert(docs)
    .select("id");

  if (error) {
    throw error;
  }

  return { insertedCount: data?.length || 0 };
}

export async function countAvailableShopStock(db, productId) {
  const { count, error } = await db
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("status", "available");

  if (error) {
    throw error;
  }
  return count || 0;
}

export async function allocateShopStock(db, { productId, quantity, orderId, userId }) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 0));
  const { data: candidates, error: selectError } = await db
    .from(TABLE)
    .select("id,credential")
    .eq("product_id", productId)
    .eq("status", "available")
    .order("created_at", { ascending: true })
    .limit(qty);

  if (selectError) {
    throw selectError;
  }

  if (!candidates || candidates.length < qty) {
    return {
      ok: false,
      items: [],
      available: candidates?.length || 0
    };
  }

  const ids = candidates.map(item => item.id);
  const patch = {
    status: "sold",
    order_id: orderId,
    user_id: userId,
    sold_at: nowIso()
  };

  const { data: updated, error: updateError } = await db
    .from(TABLE)
    .update(patch)
    .in("id", ids)
    .eq("status", "available")
    .select("id,credential");

  if (updateError) {
    throw updateError;
  }

  if (!updated || updated.length < qty) {
    if (updated?.length) {
      const updatedIds = updated.map(item => item.id);
      await db
        .from(TABLE)
        .update({ status: "available", order_id: null, user_id: null, sold_at: null })
        .in("id", updatedIds);
    }
    return {
      ok: false,
      items: [],
      available: updated?.length || 0
    };
  }

  return {
    ok: true,
    items: updated
  };
}

export async function releaseAllocatedShopStock(db, stockIds = []) {
  const ids = (stockIds || []).filter(Boolean);
  if (!ids.length) {
    return 0;
  }
  const { data, error } = await db
    .from(TABLE)
    .update({ status: "available", order_id: null, user_id: null, sold_at: null })
    .in("id", ids)
    .select("id");

  if (error) {
    throw error;
  }
  return data?.length || 0;
}

export async function getShopStockByOrder(db, orderId) {
  const { data, error } = await db
    .from(TABLE)
    .select("id,credential")
    .eq("order_id", orderId)
    .order("sold_at", { ascending: true });

  if (error) {
    throw error;
  }
  return data || [];
}
