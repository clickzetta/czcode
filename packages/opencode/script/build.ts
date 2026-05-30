#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"
import { createRequire } from "module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")
const require = createRequire(import.meta.url)

process.chdir(dir)

await import("./generate.ts")

import { Script } from "@opencode-ai/script"
import pkg from "../package.json"
import rootPkg from "../../../package.json" // czcode_change - resolve catalog: versions // kilocode_change
import { LanceDBRuntime } from "../src/kilocode/lancedb"

// kilocode_change start
// czcode_change start - resolve catalog: version references
function resolveVersion(name: string, version: string): string {
  if (!version.startsWith("catalog:")) return version
  const catalog = (rootPkg as any).workspaces?.catalog ?? {}
  return catalog[name] ?? version
}
function resolveDep(name: string): string {
  const raw = (pkg.dependencies as Record<string, string>)[name] ?? (pkg.devDependencies as Record<string, string>)[name] ?? ""
  return resolveVersion(name, raw)
}
// czcode_change end
// kilocode_change end

// Load migrations from migration directories
const migrationDirs = (
  await fs.promises.readdir(path.join(dir, "migration"), {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory() && /^\d{4}\d{2}\d{2}\d{2}\d{2}\d{2}/.test(entry.name))
  .map((entry) => entry.name)
  .sort()

const migrations = await Promise.all(
  migrationDirs.map(async (name) => {
    const file = path.join(dir, "migration", name, "migration.sql")
    const sql = await Bun.file(file).text()
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(name)
    const timestamp = match
      ? Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4]),
          Number(match[5]),
          Number(match[6]),
        )
      : 0
    return { sql, timestamp, name }
  }),
)
console.log(`Loaded ${migrations.length} migrations`)

const singleFlag = process.argv.includes("--single")
const baselineFlag = process.argv.includes("--baseline")
const skipInstall = process.argv.includes("--skip-install")
const sourcemapsFlag = process.argv.includes("--sourcemaps")
const plugin = createSolidTransformPlugin()
// kilocode_change - packages/app was removed; the web UI embed step is no longer applicable

// kilocode_change start - codebase indexing
async function copyTreeSitterWasms(outputDir: string) {
  const runtimeWasmPath = require.resolve("web-tree-sitter/tree-sitter.wasm")
  const languagePackagePath = require.resolve("tree-sitter-wasms/package.json")
  const languageWasmDir = path.join(path.dirname(languagePackagePath), "out")
  const targetDir = path.join(outputDir, "tree-sitter")

  await fs.promises.mkdir(targetDir, { recursive: true })
  await fs.promises.copyFile(runtimeWasmPath, path.join(targetDir, "tree-sitter.wasm"))

  const languageWasmFiles = (await fs.promises.readdir(languageWasmDir)).filter((file) => file.endsWith(".wasm"))

  await Promise.all(
    languageWasmFiles.map((file) => fs.promises.copyFile(path.join(languageWasmDir, file), path.join(targetDir, file))),
  )

  console.log(`copied ${languageWasmFiles.length + 1} tree-sitter wasm files to ${targetDir}`)
}

// kilocode_change start - upstream's createEmbeddedWebUIBundle is intentionally removed because
// Kilo dropped the packages/app web UI. Kept here as a commented reference so future upstream merges
// can see the deliberate divergence rather than treating a re-add as a clean re-introduction.
// const createEmbeddedWebUIBundle = async () => {
//   console.log(`Building Web UI to embed in the binary`)
//   const appDir = path.join(import.meta.dirname, "../../app")
//   const dist = path.join(appDir, "dist")
//   await $`bun run --cwd ${appDir} build`
//   const files = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: dist })))
//     .map((file) => file.replaceAll("\\", "/"))
//     .filter((file) => !file.endsWith(".map"))
//     .sort()
//   const imports = files.map((file, i) => {
//     const spec = path.relative(dir, path.join(dist, file)).replaceAll("\\", "/")
//     return `import file_${i} from ${JSON.stringify(spec.startsWith(".") ? spec : `./${spec}`)} with { type: "file" };`
//   })
//   const entries = files.map((file, i) => `  ${JSON.stringify(file)}: file_${i},`)
//   return [
//     `// Import all files as file_$i with type: "file"`,
//     ...imports,
//     `// Export with original mappings`,
//     `export default {`,
//     ...entries,
//     `}`,
//   ].join("\n")
// }
// kilocode_change end

const allTargets: {
  os: string
  arch: "arm64" | "x64"
  abi?: "musl"
  avx2?: false
}[] = [
  {
    os: "linux",
    arch: "arm64",
  },
  {
    os: "linux",
    arch: "x64",
  },
  {
    os: "linux",
    arch: "x64",
    avx2: false,
  },
  {
    os: "linux",
    arch: "arm64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
  },
  {
    os: "linux",
    arch: "x64",
    abi: "musl",
    avx2: false,
  },
  {
    os: "darwin",
    arch: "arm64",
  },
  {
    os: "darwin",
    arch: "x64",
  },
  {
    os: "darwin",
    arch: "x64",
    avx2: false,
  },
  {
    os: "win32",
    arch: "arm64",
  },
  {
    os: "win32",
    arch: "x64",
  },
  {
    os: "win32",
    arch: "x64",
    avx2: false,
  },
]

const targets = singleFlag
  ? allTargets.filter((item) => {
      if (item.os !== process.platform || item.arch !== process.arch) {
        return false
      }

      // When building for the current platform, prefer a single native binary by default.
      // Baseline binaries require additional Bun artifacts and can be flaky to download.
      if (item.avx2 === false) {
        return baselineFlag
      }

      // also skip abi-specific builds for the same reason
      if (item.abi !== undefined) {
        return false
      }

      return true
    })
  : allTargets

await $`rm -rf dist`

const binaries: Record<string, string> = {}
if (!skipInstall) {
  // kilocode_change start
  await $`bun install --os="*" --cpu="*" @opentui/core@${resolveDep("@opentui/core")}` // czcode_change
  await $`bun install --os="*" --cpu="*" @parcel/watcher@${resolveDep("@parcel/watcher")}` // czcode_change
  // kilocode_change end
}
for (const item of targets) {
  const name = [
    pkg.name,
    // changing to win32 flags npm for some reason
    item.os === "win32" ? "windows" : item.os,
    item.arch,
    item.avx2 === false ? "baseline" : undefined,
    item.abi === undefined ? undefined : item.abi,
  ]
    .filter(Boolean)
    .join("-")
  console.log(`building ${name}`)
  await $`mkdir -p dist/${name}/bin`

  const localPath = path.resolve(dir, "node_modules/@opentui/core/parser.worker.js")
  const rootPath = path.resolve(dir, "../../node_modules/@opentui/core/parser.worker.js")
  const parserWorker = fs.realpathSync(fs.existsSync(localPath) ? localPath : rootPath)
  const workerPath = "./src/cli/cmd/tui/worker.ts"
  const indexingWorkerPath = "./src/kilocode/indexing-worker.ts" // kilocode_change

  // Use platform-specific bunfs root path based on target OS
  const bunfsRoot = item.os === "win32" ? "B:/~BUN/root/" : "/$bunfs/root/"
  const workerRelativePath = path.relative(dir, parserWorker).replaceAll("\\", "/")

  await Bun.build({
    conditions: ["browser"],
    tsconfig: "./tsconfig.json",
    plugins: [plugin],
    sourcemap: Script.release ? "none" : "external",
    external: ["node-gyp", ...LanceDBRuntime.external],
    format: "esm",
    minify: true,
    splitting: true,
    compile: {
      autoloadBunfig: false,
      autoloadDotenv: false,
      autoloadTsconfig: true,
      autoloadPackageJson: true,
      target: name.replace(pkg.name, "bun") as any,
      outfile: `dist/${name}/bin/czcode`, // czcode_change // kilocode_change
      execArgv: [`--user-agent=kilo/${Script.version}`, "--use-system-ca", "--"],
      windows: {},
    },
    // kilocode_change start - packages/app was removed; no embedded web UI
    files: {},
    entrypoints: ["./src/index.ts", parserWorker, workerPath, indexingWorkerPath],
    // kilocode_change end
    define: {
      KILO_VERSION: `'${Script.version}'`,
      KILO_MIGRATIONS: JSON.stringify(migrations),
      OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + workerRelativePath,
      KILO_WORKER_PATH: workerPath,
      KILO_INDEXING_WORKER_PATH: indexingWorkerPath, // kilocode_change
      KILO_CHANNEL: `'${Script.channel}'`,
      KILO_LIBC: item.os === "linux" ? `'${item.abi ?? "glibc"}'` : "",
      KILO_BUILD_KIND: Script.release ? `'release'` : `'source'`,
    },
  })

  await copyTreeSitterWasms(path.resolve(dir, `dist/${name}/bin`))

  // kilocode_change start - fix Nix-specific ELF interpreter paths for Linux binaries
  if (item.os === "linux") {
    const interpreters: Record<string, string> = {
      x64: "/lib64/ld-linux-x86-64.so.2",
      arm64: "/lib/ld-linux-aarch64.so.1",
      "x64-musl": "/lib/ld-musl-x86_64.so.1",
      "arm64-musl": "/lib/ld-musl-aarch64.so.1",
    }
    const key = item.abi === "musl" ? `${item.arch}-musl` : item.arch
    const interpreter = interpreters[key]
    if (interpreter) {
      try {
        await $`patchelf --set-interpreter ${interpreter} dist/${name}/bin/czcode`
        console.log(`patched interpreter for ${name} -> ${interpreter}`)
      } catch {
        console.warn(`patchelf not available, skipping interpreter fix for ${name}`)
      }
    }
  }
  // kilocode_change end

  // Smoke test: only run if binary is for current platform
  if (item.os === process.platform && item.arch === process.arch && !item.abi) {
    const binaryPath = `dist/${name}/bin/czcode` // czcode_change // kilocode_change
    console.log(`Running smoke test: ${binaryPath} --version`)
    try {
      const versionOutput = await $`${binaryPath} --version`.text()
      console.log(`Smoke test passed: ${versionOutput.trim()}`)
    } catch (e) {
      console.error(`Smoke test failed for ${name}:`, e)
      process.exit(1)
    }
  }

  await $`rm -rf ./dist/${name}/bin/tui`
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version: Script.version,
        os: [item.os],
        cpu: [item.arch],
        repository: {
          type: "git",
          url: "https://github.com/Kilo-Org/kilocode",
        },
      },
      null,
      2,
    ),
  )
  binaries[name] = Script.version
}

if (Script.release) {
  // kilocode_change start
  // czcode_change start — bundle clickzetta-skills into release archives
  console.log("Downloading clickzetta-skills for bundling...")
  const skillsTmp = path.resolve("dist", "_skills_tmp")
  await $`rm -rf ${skillsTmp}`
  await $`git clone --depth 1 --branch dev https://github.com/clickzetta/clickzetta-skills.git ${skillsTmp}`.quiet().nothrow()
  // Remove .git to save space
  await $`rm -rf ${skillsTmp}/.git`

  for (const key of Object.keys(binaries)) {
    const binDir = `dist/${key}/bin`
    await $`cp -r ${skillsTmp} ${binDir}/clickzetta-skills`.quiet().nothrow()
  }
  await $`rm -rf ${skillsTmp}`
  console.log("Bundled clickzetta-skills into all platform archives")
  // czcode_change end
  // kilocode_change end

  const archives: string[] = []
  for (const key of Object.keys(binaries)) {
    const archive = key.replace(pkg.name, "czcode") // czcode_change // kilocode_change
    if (key.includes("linux")) {
      const out = path.resolve("dist", `${archive}.tar.gz`)
      await $`tar -czf ${out} *`.cwd(`dist/${key}/bin`)
      archives.push(out)
    } else {
      const out = path.resolve("dist", `${archive}.zip`)
      await $`zip -r ${out} *`.cwd(`dist/${key}/bin`)
      archives.push(out)
    }
  }
  await $`gh release upload v${Script.version} ${archives} --clobber`
}

export { binaries }
