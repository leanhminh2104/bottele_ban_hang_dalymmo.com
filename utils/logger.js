function formatMessage(level, message) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}`;
}

function serializeMeta(meta) {
  if (!meta) return "";
  if (typeof meta === "string") return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

export const logger = {
  info(message, meta) {
    console.log(formatMessage("INFO", message), serializeMeta(meta));
  },
  warn(message, meta) {
    console.warn(formatMessage("WARN", message), serializeMeta(meta));
  },
  error(message, meta) {
    console.error(formatMessage("ERROR", message), serializeMeta(meta));
  },
  debug(message, meta) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatMessage("DEBUG", message), serializeMeta(meta));
    }
  }
};