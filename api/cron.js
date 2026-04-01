import "../config/loadEnv.js";
import { connectDB } from "../lib/db.js";
import { checkPayment } from "../services/paymentService.js";
import { releaseExpiredHolds } from "../services/holdService.js";
import { expirePendingInvoiceOrders } from "../services/shopFlowService.js";
import { logger } from "../utils/logger.js";

export default async function handler(req, res) {
  const key = req.query.key || req.headers["x-cron-key"];
  if (!key || key !== process.env.CRON_KEY) {
    return res.status(403).send("Không được phép");
  }

  const db = await connectDB();
  try {
    await releaseExpiredHolds(db);
    await checkPayment(db);
    const expiredSummary = await expirePendingInvoiceOrders({ db, notifyUsers: true });
    res.status(200).json({
      ok: true,
      expiredInvoices: expiredSummary.expiredCount,
      notifiedUsers: expiredSummary.notifiedCount
    });
  } catch (error) {
    logger.error("Cron thất bại", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
}
