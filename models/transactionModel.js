import { COLLECTIONS } from "../config/constants.js";

const TABLE = COLLECTIONS.transactions;

export async function findTransaction(db, tranId) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("tran_id", tranId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function insertTransaction(db, doc) {
  const payload = {
    ...doc,
    created_at: doc.created_at || new Date().toISOString()
  };

  const { error } = await db.from(TABLE).insert(payload);
  if (error) {
    throw error;
  }
}

export async function getRecentTransactionsByUser(db, userId, limit = 5) {
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

export async function countTransactionsByUser(db, userId) {
  const { count, error } = await db
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count || 0;
}

