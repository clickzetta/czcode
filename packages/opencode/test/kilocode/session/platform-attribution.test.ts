import { describe, expect, test } from "bun:test"
import path from "path"
import * as Log from "@opencode-ai/core/util/log"
import { Session as SessionNs } from "@/session/session"
import { Effect } from "effect"
import { AppRuntime } from "../../../src/effect/app-runtime"
import { EventV2Bridge } from "@/event-v2-bridge"
import { KiloSession } from "../../../src/kilocode/session"
import { provide as withInstanceProvide } from "../../../src/kilocode/instance"
import { MessageV2 } from "../../../src/session/message-v2"
import { MessageID, PartID, type SessionID } from "../../../src/session/schema"

const projectRoot = path.join(__dirname, "../../..")
void Log.init({ print: false })

function create(input?: SessionNs.CreateInput) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.create(input)))
}

function remove(id: SessionID) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.remove(id)))
}

function updateMessage<T extends MessageV2.Info>(msg: T) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.updateMessage(msg)))
}

function updatePart<T extends MessageV2.Part>(part: T) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.updatePart(part)))
}

describe("session platform attribution", () => {
  test("child sessions inherit the root platform override", async () => {
    await withInstanceProvide({
      directory: projectRoot,
      fn: async () => {
        const root = await create({ platform: "agent-manager" })
        const child = await create({ parentID: root.id, title: "child" })
        const attr = KiloSession.attribution(child.id)

        expect(KiloSession.getPlatformOverride(root.id)).toBe("agent-manager")
        expect(KiloSession.getPlatformOverride(child.id)).toBe("agent-manager")
        expect(KiloSession.resolvePlatform(child.id)).toBe("agent-manager")
        expect(attr.rootID).toBe(root.id)
        expect(attr.feature).toBe("agent-manager")

        await remove(root.id)
      },
    })
  })

  test("child sessions expose parent and root lineage", async () => {
    await withInstanceProvide({
      directory: projectRoot,
      fn: async () => {
        const root = await create({})
        const child = await create({ parentID: root.id, title: "child" })
        const leaf = await create({ parentID: child.id, title: "leaf" })

        expect(KiloSession.resolveParent(root.id)).toBeUndefined()
        expect(KiloSession.resolveParent(child.id)).toBe(root.id)
        expect(KiloSession.resolveParent(leaf.id)).toBe(child.id)
        expect(KiloSession.resolveRoot(leaf.id)).toBe(root.id)

        await remove(root.id)
      },
    })
  })
})

describe("step-finish token propagation via Bus event", () => {
  test(
    "non-zero tokens propagate through PartUpdated event",
    async () => {
      await withInstanceProvide({
        directory: projectRoot,
        fn: async () => {
          const info = await create({})

          const messageID = MessageID.ascending()
          await updateMessage({
            id: messageID,
            sessionID: info.id,
            role: "user",
            time: { created: Date.now() },
            agent: "user",
            model: { providerID: "test", modelID: "test" },
            tools: {},
            mode: "",
          } as unknown as MessageV2.Info)

          let received: MessageV2.Part | undefined
          const unsub = await AppRuntime.runPromise(
            EventV2Bridge.Service.use((events) =>
              events.listen((event) => {
                if (event.type === MessageV2.Event.PartUpdated.type)
                  received = (event.data as typeof MessageV2.Event.PartUpdated.data.Type).part as MessageV2.Part
                return Effect.void
              }),
            ),
          )

          const tokens = {
            total: 1500,
            input: 500,
            output: 800,
            reasoning: 200,
            cache: { read: 100, write: 50 },
          }

          const part = {
            id: PartID.ascending(),
            messageID,
            sessionID: info.id,
            type: "step-finish" as const,
            reason: "stop",
            cost: 0.005,
            tokens,
          }

          await updatePart(part)
          await new Promise((resolve) => setTimeout(resolve, 100))

          expect(received).toBeDefined()
          expect(received!.type).toBe("step-finish")
          const finish = received as MessageV2.StepFinishPart
          expect(finish.tokens.input).toBe(500)
          expect(finish.tokens.output).toBe(800)
          expect(finish.tokens.reasoning).toBe(200)
          expect(finish.tokens.total).toBe(1500)
          expect(finish.tokens.cache.read).toBe(100)
          expect(finish.tokens.cache.write).toBe(50)
          expect(finish.cost).toBe(0.005)
          expect(received).not.toBe(part)

          await AppRuntime.runPromise(unsub)
          await remove(info.id)
        },
      })
    },
    { timeout: 30000 },
  )
})
