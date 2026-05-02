// czcode_change - new file
/**
 * Shared .env loader for czcode TUI plugins.
 *
 * Compiled binaries don't auto-load .env like bun dev does.
 * This module loads .env from process.cwd() at import time,
 * with a guard to avoid double-parsing.
 */
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

if (!process.env.__CZCODE_DOTENV_LOADED) {
  const envPath = join(process.cwd(), ".env")
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq === -1) continue
        let key = trimmed.slice(0, eq).trim()
        if (key.startsWith("export ")) key = key.slice(7).trim()
        let val = trimmed.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1)
        if (!process.env[key]) process.env[key] = val
      }
    } catch {}
  }
  process.env.__CZCODE_DOTENV_LOADED = "1"
}
