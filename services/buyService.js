import { getOrCreateUser, updateBalance, getUserById, recordUserVisit } from "../models/userModel.js";
import { createOrder } from "../models/orderModel.js";
import { finalizeAccount } from "../models/accountModel.js";

const DEFAULT_PRICE = parseInt(process.env.ACCOUNT_PRICE || "0", 10) || 0;

export async function ensureUser(db, userId, profile = {}) {
  const user = await getOrCreateUser(db, userId, profile);
  await recordUserVisit(db, userId, profile);
  return user;
}

export async function getBalance(db, userId) {
  const user = await getUserById(db, userId);
  return user?.balance || 0;
}

export async function chargeUser(db, userId, amount = DEFAULT_PRICE) {
  if (amount <= 0) {
    return;
  }

  const user = await getUserById(db, userId);
  if (!user || user.balance < amount) {
    throw new Error("Insufficient balance");
  }

  await updateBalance(db, userId, -amount);
}

export async function completeOrder(db, userId, account) {
  await finalizeAccount(db, account.id);
  await createOrder(db, {
    userId,
    accountId: account.id,
    status: "done"
  });
  return {
    email: account.email,
    password: account.password
  };
}

