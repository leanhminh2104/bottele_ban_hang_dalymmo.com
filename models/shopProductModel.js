import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.shopProducts;
const SELECT_FIELDS =
  "id,category_id,name,description,price,warranty_enabled,warranty_days,is_active,sort_order,created_at,updated_at";

function nowIso() {
  return new Date().toISOString();
}

function normalizePrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.floor(numeric);
}

function normalizeWarrantyDays(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.floor(numeric);
}

export async function listShopProducts(db, { categoryId = null, activeOnly = false } = {}) {
  let query = db
    .from(TABLE)
    .select(SELECT_FIELDS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
}

export async function getShopProductById(db, id) {
  const { data, error } = await db
    .from(TABLE)
    .select(SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function getShopProductsByIds(db, ids = []) {
  const uniq = Array.from(new Set((ids || []).filter(Boolean)));
  if (!uniq.length) {
    return [];
  }

  const { data, error } = await db
    .from(TABLE)
    .select(SELECT_FIELDS)
    .in("id", uniq);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function createShopProduct(
  db,
  { categoryId, name, description = "", price = 0, warrantyEnabled = false, warrantyDays = 0 }
) {
  const normalizedDays = normalizeWarrantyDays(warrantyDays);
  const payload = {
    category_id: categoryId,
    name: String(name || "").trim(),
    description: String(description || "").trim() || null,
    price: normalizePrice(price),
    warranty_enabled: Boolean(warrantyEnabled) && normalizedDays > 0,
    warranty_days: Boolean(warrantyEnabled) ? normalizedDays : 0,
    is_active: true,
    updated_at: nowIso()
  };

  const { data, error } = await db
    .from(TABLE)
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function updateShopProduct(db, id, patch = {}) {
  const next = {
    updated_at: nowIso()
  };

  if (Object.prototype.hasOwnProperty.call(patch, "categoryId")) {
    next.category_id = patch.categoryId;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    next.name = String(patch.name || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(patch, "description")) {
    next.description = String(patch.description || "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "price")) {
    next.price = normalizePrice(patch.price);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "is_active")) {
    next.is_active = Boolean(patch.is_active);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "sort_order")) {
    next.sort_order = Number.isFinite(Number(patch.sort_order)) ? Number(patch.sort_order) : 0;
  }
  if (
    Object.prototype.hasOwnProperty.call(patch, "warrantyEnabled") ||
    Object.prototype.hasOwnProperty.call(patch, "warrantyDays")
  ) {
    const enabled = Object.prototype.hasOwnProperty.call(patch, "warrantyEnabled")
      ? Boolean(patch.warrantyEnabled)
      : undefined;
    const days = Object.prototype.hasOwnProperty.call(patch, "warrantyDays")
      ? normalizeWarrantyDays(patch.warrantyDays)
      : undefined;

    if (enabled !== undefined) {
      next.warranty_enabled = enabled && (days === undefined ? true : days > 0);
    }
    if (days !== undefined) {
      next.warranty_days = days;
      if (!days) {
        next.warranty_enabled = false;
      }
    }
  }

  const { data, error } = await db
    .from(TABLE)
    .update(next)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteShopProduct(db, id) {
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
  return true;
}
