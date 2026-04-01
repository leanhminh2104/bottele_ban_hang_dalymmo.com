import "dotenv/config";
import { readFile } from "node:fs/promises";
import { connectDB, disconnectDB } from "../lib/db.js";
import { importAccounts } from "../services/importService.js";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run import:accounts <path-to-txt>");
    process.exit(1);
  }
  const db = await connectDB();
  const text = await readFile(filePath, "utf8");
  const result = await importAccounts(db, text);
  console.log(`Inserted ${result.insertedCount} accounts`);
  await disconnectDB();
}

main().catch(err => {
  console.error("Import failed", err);
  process.exit(1);
});