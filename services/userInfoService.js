import { getUserById } from "../models/userModel.js";
import { getRecentTransactionsByUser, countTransactionsByUser } from "../models/transactionModel.js";
import { getRecentOrdersByUser, countOrdersByUser } from "../models/orderModel.js";

export async function buildUserSnapshot(db, userId) {
  const user = await getUserById(db, userId);
  if (!user) {
    return null;
  }

  const [transactions, orders, transactionCount, orderCount] = await Promise.all([
    getRecentTransactionsByUser(db, userId, 5),
    getRecentOrdersByUser(db, userId, 5),
    countTransactionsByUser(db, userId),
    countOrdersByUser(db, userId)
  ]);

  return {
    user,
    transactions,
    orders,
    stats: {
      transactionCount,
      orderCount
    }
  };
}

