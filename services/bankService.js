const REQUIRED_FIELDS = ["bank_code", "account_name", "account_number", "topup_note"];

export const BANK_FIELD_MAP = {
  bank_code: "bank_code",
  bank_name: "bank_name",
  account_name: "account_name",
  account_number: "account_number",
  min_topup: "min_topup",
  topup_note: "topup_note"
};

export function sanitizeBankValue(field, value) {
  if (value === undefined || value === null) return value;
  const trimmed = typeof value === "string" ? value.trim() : value;
  switch (field) {
    case BANK_FIELD_MAP.bank_code:
      return String(trimmed || "").toUpperCase();
    case BANK_FIELD_MAP.account_number:
      return String(trimmed || "").replace(/\s+/g, "");
    case BANK_FIELD_MAP.min_topup:
      return Number(trimmed) || 0;
    default:
      return trimmed;
  }
}

export function validateBankSettings(settings = {}) {
  const missing = REQUIRED_FIELDS.filter(field => {
    if (field === "topup_note") {
      return !settings.topup_note;
    }
    return !settings[field];
  });
  return {
    ready: missing.length === 0,
    missing
  };
}

export function buildTransferNote(settings = {}, userId) {
  const base = (settings.topup_note || "NAP").trim().toUpperCase();
  return `${base}${userId || ""}`.trim();
}

export function buildVietQrUrl(settings = {}, userId, amount) {
  const { ready } = validateBankSettings(settings);
  if (!ready) {
    return null;
  }

  const bankCode = sanitizeBankValue(BANK_FIELD_MAP.bank_code, settings.bank_code || "ACB");
  const accountNumber = sanitizeBankValue(BANK_FIELD_MAP.account_number, settings.account_number);
  if (!bankCode || !accountNumber) {
    return null;
  }

  const template = "compact";
  const params = new URLSearchParams();
  const note = buildTransferNote(settings, userId);
  params.set("addInfo", note);
  if (settings.account_name) {
    params.set("accountName", settings.account_name);
  }
  if (amount && Number(amount) > 0) {
    params.set("amount", String(Math.floor(Number(amount))));
  }

  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?${params.toString()}`;
}
