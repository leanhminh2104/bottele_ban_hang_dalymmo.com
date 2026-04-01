import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.settings;
const defaultAdmin = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID, 10) : null;

function sanitizePrompts(prompts) {
  if (!prompts || typeof prompts !== "object" || Array.isArray(prompts)) {
    return {};
  }
  return prompts;
}

function nowIso() {
  return new Date().toISOString();
}

export async function getSettings(db) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeSettings(data);
  }

  return createDefaultSettings(db);
}

function normalizeSettings(settings) {
  if (!settings) return settings;
  return {
    ...settings,
    admin_ids: settings.admin_ids || (defaultAdmin ? [defaultAdmin] : []),
    pending_prompts: sanitizePrompts(settings.pending_prompts)
  };
}

async function createDefaultSettings(db) {
  const base = {
    admin_ids: defaultAdmin ? [defaultAdmin] : [],
    acb_token: null,
    bank_code: "ACB",
    bank_name: "ACB",
    account_name: null,
    account_number: null,
    min_topup: 10000,
    topup_note: "NAP",
    pending_prompts: {},
    created_at: nowIso()
  };

  const { data, error } = await db.from(TABLE).insert(base).select("*").single();
  if (error) {
    throw error;
  }

  return normalizeSettings(data);
}

async function updateSettings(db, patch) {
  const settings = await getSettings(db);
  const { data, error } = await db
    .from(TABLE)
    .update(patch)
    .eq("id", settings.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeSettings(data);
}

export async function addAdmin(db, userId) {
  const settings = await getSettings(db);
  const adminIds = new Set(settings.admin_ids || []);
  adminIds.add(userId);

  await updateSettings(db, { admin_ids: Array.from(adminIds) });
}

export async function removeAdmin(db, userId) {
  if (defaultAdmin && userId === defaultAdmin) {
    return false;
  }
  const settings = await getSettings(db);
  const adminIds = new Set(settings.admin_ids || []);
  if (!adminIds.has(userId)) {
    return false;
  }
  adminIds.delete(userId);
  await updateSettings(db, { admin_ids: Array.from(adminIds) });
  return true;
}

export async function updateAcbToken(db, token) {
  await updateSettings(db, { acb_token: token });
}

export async function updateBankField(db, field, value) {
  const allowedFields = new Set([
    "bank_code",
    "bank_name",
    "account_name",
    "account_number",
    "min_topup",
    "topup_note"
  ]);
  if (!allowedFields.has(field)) {
    throw new Error("Khng h? tr? c?p nh?t tru?ng " + field);;
  }

  let nextValue = value;
  if (typeof nextValue === "string") {
    nextValue = nextValue.trim();
  }

  if (field === "bank_code") {
    nextValue = String(nextValue || "").toUpperCase();
  }

  if (field === "account_number") {
    nextValue = String(nextValue || "").replace(/\s+/g, "");
  }

  if (field === "min_topup") {
    nextValue = Number(nextValue) || 0;
  }

  await updateSettings(db, { [field]: nextValue });
  return getSettings(db);
}

export async function setPendingPrompt(db, adminId, prompt) {
  const settings = await getSettings(db);
  const prompts = sanitizePrompts(settings.pending_prompts);
  const key = String(adminId);
  const next = {
    ...prompts,
    [key]: {
      ...prompt,
      adminId,
      updated_at: nowIso()
    }
  };
  await updateSettings(db, { pending_prompts: next });
  return next[key];
}

export async function getPendingPrompt(db, adminId) {
  const settings = await getSettings(db);
  const prompts = sanitizePrompts(settings.pending_prompts);
  return prompts[String(adminId)] || null;
}

export async function clearPendingPrompt(db, adminId) {
  const settings = await getSettings(db);
  const prompts = sanitizePrompts(settings.pending_prompts);
  const key = String(adminId);
  if (!prompts[key]) {
    return null;
  }
  const next = { ...prompts };
  delete next[key];
  await updateSettings(db, { pending_prompts: next });
  return true;
}

export async function isAdmin(db, userId) {
  const settings = await getSettings(db);
  const adminIds = new Set(settings.admin_ids || []);
  if (defaultAdmin) {
    adminIds.add(defaultAdmin);
  }
  return adminIds.has(userId);
}

export function getAdminList(settings) {
  const adminIds = new Set(settings?.admin_ids || []);
  if (defaultAdmin) adminIds.add(defaultAdmin);
  return Array.from(adminIds);
}

