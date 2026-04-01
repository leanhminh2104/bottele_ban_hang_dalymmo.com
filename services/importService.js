import { createAccounts } from "../models/accountModel.js";

export async function importAccounts(db, text, type = "netflix") {
  if (!text) return { insertedCount: 0 };
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const docs = lines.map(line => {
    const [email, password] = line.split("|").map(part => part.trim());
    return {
      type,
      email,
      password,
      status: "available",
      created_at: new Date().toISOString()
    };
  });
  if (!docs.length) return { insertedCount: 0 };
  const result = await createAccounts(db, docs);
  return { insertedCount: result.insertedCount };
}
