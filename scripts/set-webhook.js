import "dotenv/config";
import { setWebhook } from "../lib/telegram.js";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npm run webhook:set <https://your-domain/api/bot>");
    process.exit(1);
  }
  const response = await setWebhook(url);
  console.log(response);
}

main().catch(err => {
  console.error("Failed to set webhook", err);
  process.exit(1);
});