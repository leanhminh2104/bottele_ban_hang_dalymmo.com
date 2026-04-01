import {
  holdAccountDocument,
  releaseExpiredHolds as releaseExpiredHoldDocs,
  releaseHoldByUser as releaseHoldDocsByUser
} from "../models/accountModel.js";
import { logger } from "../utils/logger.js";

export async function holdAccount(db, userId, type) {
  const acc = await holdAccountDocument(db, userId, type);
  if (!acc) {
    logger.info("Hiện không còn tài khoản khả dụng", { userId, type });
    return null;
  }
  return acc;
}

export function releaseExpiredHolds(db) {
  return releaseExpiredHoldDocs(db);
}

export function releaseHoldByUser(db, userId) {
  return releaseHoldDocsByUser(db, userId);
}
