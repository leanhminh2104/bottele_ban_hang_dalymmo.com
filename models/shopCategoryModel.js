import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.shopCategories;
const SELECT_FIELDS = "id,name,description,is_active,sort_order,created_at,updated_at";

function nowIso() {
  return new Date().toISOString();
}

export async function listShopCategories(db, { activeOnly = false } = {}) {
  let query = db
    .from(TABLE)
    .select(SELECT_FIELDS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data || [];
}

export async function getShopCategoryById(db, id) {
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

export async function createShopCategory(db, { name, description = "" }) {
  const payload = {
    name: String(name || "").trim(),
    description: String(description || "").trim() || null,
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

export async function updateShopCategory(db, id, patch = {}) {
  const next = {
    updated_at: nowIso()
  };

  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    next.name = String(patch.name || "").trim();
  }
  if (Object.prototype.hasOwnProperty.call(patch, "description")) {
    next.description = String(patch.description || "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "is_active")) {
    next.is_active = Boolean(patch.is_active);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "sort_order")) {
    next.sort_order = Number.isFinite(Number(patch.sort_order)) ? Number(patch.sort_order) : 0;
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

export async function deleteShopCategory(db, id) {
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
  return true;
}
