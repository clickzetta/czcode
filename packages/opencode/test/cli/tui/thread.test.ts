import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { tmpdir } from "../../fixture/fixture"
<<<<<<< HEAD
import * as App from "../../../src/cli/cmd/tui/app"
import { Rpc } from "@/util/rpc"
import { UI } from "../../../src/cli/ui"
import * as Timeout from "../../../src/util/timeout"
import * as Network from "../../../src/cli/network"
import * as Win32 from "../../../src/cli/cmd/tui/win32"
import { TuiConfig } from "../../../src/cli/cmd/tui/config/tui"

const stop = new Error("stop")
const seen = {
  tui: [] as string[],
}

function setup() {
  // Intentionally avoid mock.module() here: Bun keeps module overrides in cache
  // and mock.restore() does not reset mock.module values. If this switches back
  // to module mocks, later suites can see mocked @/config/tui and fail (e.g.
  // plugin-loader tests expecting real TuiConfig.waitForDependencies). See:
  // https://github.com/oven-sh/bun/issues/7823 and #12823.
  spyOn(App, "tui").mockImplementation(async (input) => {
    if (input.directory) seen.tui.push(input.directory)
    throw stop
  })
  spyOn(Rpc, "client").mockImplementation(() => ({
    call: async () => ({ url: "http://127.0.0.1" }) as never,
    on: () => () => {},
  }))
  spyOn(UI, "error").mockImplementation(() => {})
  spyOn(Timeout, "withTimeout").mockImplementation((input) => input)
  spyOn(Network, "resolveNetworkOptions").mockResolvedValue({
    mdns: false,
    port: 0,
    hostname: "127.0.0.1",
    mdnsDomain: "opencode.local",
    cors: [],
  })
  spyOn(Win32, "win32DisableProcessedInput").mockImplementation(() => {})
  spyOn(Win32, "win32InstallCtrlCGuard").mockReturnValue(undefined)
}
||||||| 12f7967ca4
import * as App from "../../../src/cli/cmd/tui/app"
import { Rpc } from "../../../src/util"
import { UI } from "../../../src/cli/ui"
import * as Timeout from "../../../src/util/timeout"
import * as Network from "../../../src/cli/network"
import * as Win32 from "../../../src/cli/cmd/tui/win32"
import { TuiConfig } from "../../../src/cli/cmd/tui/config/tui"

const stop = new Error("stop")
const seen = {
  tui: [] as string[],
}

function setup() {
  // Intentionally avoid mock.module() here: Bun keeps module overrides in cache
  // and mock.restore() does not reset mock.module values. If this switches back
  // to module mocks, later suites can see mocked @/config/tui and fail (e.g.
  // plugin-loader tests expecting real TuiConfig.waitForDependencies). See:
  // https://github.com/oven-sh/bun/issues/7823 and #12823.
  spyOn(App, "tui").mockImplementation(async (input) => {
    if (input.directory) seen.tui.push(input.directory)
    throw stop
  })
  spyOn(Rpc, "client").mockImplementation(() => ({
    call: async () => ({ url: "http://127.0.0.1" }) as never,
    on: () => () => {},
  }))
  spyOn(UI, "error").mockImplementation(() => {})
  spyOn(Timeout, "withTimeout").mockImplementation((input) => input)
  spyOn(Network, "resolveNetworkOptions").mockResolvedValue({
    mdns: false,
    port: 0,
    hostname: "127.0.0.1",
    mdnsDomain: "opencode.local",
    cors: [],
  })
  spyOn(Win32, "win32DisableProcessedInput").mockImplementation(() => {})
  spyOn(Win32, "win32InstallCtrlCGuard").mockReturnValue(undefined)
}
=======
import { resolveThreadDirectory } from "../../../src/cli/cmd/tui/thread"
>>>>>>> yunqiqiliang/opencode-v7.3.0

describe("tui thread", () => {
  async function check(project?: string) {
    await using tmp = await tmpdir({ git: true })
    const link = path.join(path.dirname(tmp.path), path.basename(tmp.path) + "-link")
    const type = process.platform === "win32" ? "junction" : "dir"

    try {
      await fs.symlink(tmp.path, link, type)
      expect(resolveThreadDirectory(project, link, tmp.path)).toBe(tmp.path)
    } finally {
      await fs.rm(link, { recursive: true, force: true }).catch(() => undefined)
    }
  }

  test("uses the real cwd when PWD points at a symlink", async () => {
    await check()
  })

  test("uses the real cwd after resolving a relative project from PWD", async () => {
    await check(".")
  })
})
