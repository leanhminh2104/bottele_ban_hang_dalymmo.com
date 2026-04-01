import dotenv from "dotenv";
import fs from "fs";
import path from "path";

if (!process.env.__BOT_ENV_LOADED) {
  process.env.__BOT_ENV_LOADED = "true";

  const rootDir = process.cwd();
  const envFiles = [
    { file: ".env", override: false },
    { file: ".env.local", override: true }
  ];

  for (const { file, override } of envFiles) {
    const fullPath = path.resolve(rootDir, file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override });
    }
  }
}
