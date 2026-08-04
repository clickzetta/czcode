import { describe, expect, test } from "bun:test"
import path from "path"
import { Session as SessionNs } from "@/session/session"
import { EventV2Bridge } from "@/event-v2-bridge"
import * as Log from "@opencode-ai/core/util/log"
import { provide as withInstanceProvide } from "../../../src/kilocode/instance"
import { AppRuntime } from "../../../src/effect/app-runtime"
import { RuntimeFlags } from "../../../src/effect/runtime-flags"
import { Effect } from "effect"
import { tmpdir } from "../../fixture/fixture"
import type { SessionID } from "../../../src/session/schema"

const projectRoot = path.join(__dirname, "../../..")
void Log.init({ print: false })

function create(input?: SessionNs.CreateInput) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.create(input)))
}

function get(id: SessionID) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.get(id)))
}

function remove(id: SessionID) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.remove(id)))
}

describe("session.created event", () => {
  test("should emit session.created event when session is created", async () => {
    await withInstanceProvide({
      directory: projectRoot,
      fn: async () => {
        let eventReceived = false
        let receivedInfo: SessionNs.Info | undefined

        const title = `created-event-${Date.now()}`
        const unsub = await AppRuntime.runPromise(
          EventV2Bridge.Service.use((events) =>
            events.listen((event) => {
              if (event.type !== SessionNs.Event.Created.type) return Effect.void
              const info = (event.data as typeof SessionNs.Event.Created.data.Type).info as SessionNs.Info
              if (info.title !== title) return Effect.void
              eventReceived = true
              receivedInfo = info
              return Effect.void
            }),
          ),
        )

        const info = await create({ title })
        await new Promise((resolve) => setTimeout(resolve, 100))
        await AppRuntime.runPromise(unsub)

        expect(eventReceived).toBe(true)
        expect(receivedInfo).toBeDefined()
        expect(receivedInfo?.id).toBe(info.id)
        expect(receivedInfo?.projectID).toBe(info.projectID)
        expect(receivedInfo?.directory).toBe(info.directory)
        expect(receivedInfo?.path).toBe(info.path)
        expect(receivedInfo?.title).toBe(info.title)

        await remove(info.id)
      },
    })
  })

  test("session.created event should be emitted before session.updated", async () => {
    const previous = process.env.KILO_EXPERIMENTAL_WORKSPACES
    delete process.env.KILO_EXPERIMENTAL_WORKSPACES
    try {
      await withInstanceProvide({
        directory: projectRoot,
        fn: async () => {
          const flags = AppRuntime.runSync(Effect.service(RuntimeFlags.Service))
          const enabled = flags.experimentalWorkspaces
          Object.assign(flags, { experimentalWorkspaces: false })
          const events: string[] = []
          const title = `event-order-${Date.now()}`

          const unsub = await AppRuntime.runPromise(
            EventV2Bridge.Service.use((source) =>
              source.listen((event) => {
                if (
                  event.type === SessionNs.Event.Created.type &&
                  (event.data as typeof SessionNs.Event.Created.data.Type).info.title === title
                )
                  events.push("created")
                if (
                  event.type === SessionNs.Event.Updated.type &&
                  (event.data as typeof SessionNs.Event.Updated.data.Type).info.title === title
                )
                  events.push("updated")
                return Effect.void
              }),
            ),
          )

          const info = await create({ title })
          await new Promise((resolve) => setTimeout(resolve, 100))
          await AppRuntime.runPromise(unsub)

          expect(events).toContain("created")
          expect(events).toContain("updated")
          expect(events.indexOf("created")).toBeLessThan(events.indexOf("updated"))

          await remove(info.id)
          Object.assign(flags, { experimentalWorkspaces: enabled })
        },
      })
    } finally {
      if (previous === undefined) delete process.env.KILO_EXPERIMENTAL_WORKSPACES
      else process.env.KILO_EXPERIMENTAL_WORKSPACES = previous
    }
  })
})

describe("Session", () => {
  test("remove works without an instance", async () => {
    await using tmp = await tmpdir({ git: true })

    const info = await withInstanceProvide({
      directory: tmp.path,
      fn: () => create({ title: "remove-without-instance" }),
    })

    await expect(async () => {
      await remove(info.id)
    }).not.toThrow()

    let missing = false
    await get(info.id).catch(() => {
      missing = true
    })

    expect(missing).toBe(true)
  })
})
