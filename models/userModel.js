import { COLLECTIONS } from "../config/constants.js";
import { DEFAULT_LANGUAGE } from "../config/i18n.js";

const TABLE = COLLECTIONS.users;

export const USER_UI_STATES = {
  TOPUP_PENDING: "topup_pending"
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeUser(record) {
  if (!record) return record;
  return {
    ...record,
    language: record.language || DEFAULT_LANGUAGE,
    last_seen_at: record.last_seen_at || record.created_at || nowIso()
  };
}

function buildProfilePatch(profile = {}) {
  const patch = {};
  if (profile.full_name) {
    patch.full_name = profile.full_name;
  }
  if (profile.username) {
    patch.username = profile.username;
  }
  if (profile.first_name) {
    patch.first_name = profile.first_name;
  }
  if (profile.last_name) {
    patch.last_name = profile.last_name;
  }
  if (profile.telegram_language) {
    patch.telegram_language = profile.telegram_language;
  }
  return patch;
}

export async function getOrCreateUser(db, userId, profile = {}) {
  const profilePatch = buildProfilePatch(profile);
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeUser(data);
  }

  const now = nowIso();
  const doc = {
    user_id: userId,
    balance: 0,
    language: DEFAULT_LANGUAGE,
    created_at: now,
    last_seen_at: now,
    ui_state: null,
    ui_state_payload: null,
    ...profilePatch
  };

  const { data: inserted, error: insertError } = await db
    .from(TABLE)
    .insert(doc)
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return normalizeUser(inserted);
}

export async function updateBalance(db, userId, amount) {
  const current = await getOrCreateUser(db, userId);
  const newBalance = (current.balance || 0) + amount;

  const { data, error } = await db
    .from(TABLE)
    .update({ balance: newBalance, last_seen_at: nowIso() })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function setBalance(db, userId, amount) {
  const { data, error } = await db
    .from(TABLE)
    .update({ balance: amount, last_seen_at: nowIso() })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function getUserById(db, userId) {
  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function updateLanguage(db, userId, language) {
  const { data, error } = await db
    .from(TABLE)
    .update({ language, last_seen_at: nowIso() })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function recordUserVisit(db, userId, profile = {}) {
  const patch = { last_seen_at: nowIso(), ...buildProfilePatch(profile) };
  const { data, error } = await db
    .from(TABLE)
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function setUserUiState(db, userId, state, payload = null) {
  await getOrCreateUser(db, userId);
  const patch = {
    ui_state: state || null,
    ui_state_payload: payload || null,
    last_seen_at: nowIso()
  };
  const { data, error } = await db
    .from(TABLE)
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeUser(data);
}

export async function clearUserUiState(db, userId) {
  return setUserUiState(db, userId, null, null);
}

export async function getUsersByIds(db, userIds = []) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (!ids.length) {
    return [];
  }

  const { data, error } = await db
    .from(TABLE)
    .select("*")
    .in("user_id", ids);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeUser);
}

export async function listRecentUsers(db, limit = 20) {
  const maxRows = Math.max(1, Math.min(100, Number(limit) || 20));
  const { data, error } = await db
    .from(TABLE)
    .select("user_id,full_name,username,language,balance,created_at,last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(maxRows);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeUser);
}

export async function listAllUserIds(db, batchSize = 1000) {
  const size = Math.max(100, Math.min(5000, Number(batchSize) || 1000));
  const ids = [];
  let from = 0;

  while (true) {
    const to = from + size - 1;
    const { data, error } = await db
      .from(TABLE)
      .select("user_id")
      .order("user_id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows = data || [];
    rows.forEach(row => {
      if (row?.user_id) {
        ids.push(row.user_id);
      }
    });

    if (rows.length < size) {
      break;
    }
    from += size;
  }

  return Array.from(new Set(ids));
}

