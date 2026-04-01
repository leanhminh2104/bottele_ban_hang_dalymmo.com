import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.accounts;

export async function createAccounts(db, docs) {
  if (!Array.isArray(docs) || !docs.length) {
    return { insertedCount: 0 };
  }

  const { data, error } = await db.from(TABLE).insert(docs).select("id");
  if (error) {
    throw error;
  }

  return { insertedCount: data.length };
}

export async function findHoldingAccount(db, userId) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("hold_by", userId)
    .eq("status", "holding")
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function finalizeAccount(db, accountId) {
  const { error } = await db
    .from(TABLE)
    .update({ status: "sold", hold_by: null, hold_expires: null })
    .eq("id", accountId);

  if (error) {
    throw error;
  }
}

export async function releaseExpiredHolds(db, now = new Date()) {
  const { error, data } = await db
    .from(TABLE)
    .update({ status: "available", hold_by: null, hold_expires: null })
    .lt("hold_expires", now.toISOString())
    .eq("status", "holding")
    .select("id");

  if (error) {
    throw error;
  }

  return data?.length || 0;
}

export async function releaseHoldByUser(db, userId) {
  const { error } = await db
    .from(TABLE)
    .update({ status: "available", hold_by: null, hold_expires: null })
    .eq("hold_by", userId)
    .eq("status", "holding");

  if (error) {
    throw error;
  }
}

export async function holdAccountDocument(db, userId, type) {
  const { data, error } = await db.rpc("hold_account", {
    p_user_id: userId,
    p_type: type
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length ? data[0] : null;
}
