import { describe, expect } from "bun:test"
import { Session as SessionNs } from "@/session/session"
import { Database } from "@opencode-ai/core/database/database"
import { SessionProjector } from "@opencode-ai/core/session/projector"
import { CrossSpawnSpawner } from "@opencode-ai/core/cross-spawn-spawner"
import { Deferred, Effect, Layer } from "effect"
import { testInstanceStoreLayer } from "../../fixture/fixture"
import { testEffect } from "../../lib/effect"
import { Storage } from "@/storage/storage"
import { RuntimeFlags } from "@/effect/runtime-flags"
import { BackgroundJob } from "@/background/job"
import { EventV2Bridge } from "@/event-v2-bridge"
import { KiloSession } from "../../../src/kilocode/session"
import { MessageV2 } from "../../../src/session/message-v2"
import { MessageID, PartID } from "../../../src/session/schema"

const it = testEffect(
  Layer.mergeAll(
    SessionNs.layer.pipe(
      Layer.provide(Storage.defaultLayer),
      Layer.provide(Database.defaultLayer),
      Layer.provideMerge(EventV2Bridge.defaultLayer),
      Layer.provide(SessionProjector.defaultLayer),
      Layer.provide(RuntimeFlags.layer({ experimentalWorkspaces: false })),
      Layer.provide(BackgroundJob.defaultLayer),
    ),
    CrossSpawnSpawner.defaultLayer,
    testInstanceStoreLayer,
  ),
)

const awaitDeferred = <T>(deferred: Deferred.Deferred<T>, message: string) =>
  Effect.race(
    Deferred.await(deferred),
    Effect.sleep("2 seconds").pipe(Effect.flatMap(() => Effect.fail(new Error(message)))),
  )

describe("session platform attribution", () => {
  it.instance("child sessions inherit the root platform override", () =>
    Effect.gen(function* () {
      const session = yield* SessionNs.Service
      const root = yield* session.create({ platform: "agent-manager" })
      const child = yield* session.create({ parentID: root.id, title: "child" })
      const attr = KiloSession.attribution(child.id)

      expect(KiloSession.getPlatformOverride(root.id)).toBe("agent-manager")
      expect(KiloSession.getPlatformOverride(child.id)).toBe("agent-manager")
      expect(KiloSession.resolvePlatform(child.id)).toBe("agent-manager")
      expect(attr.rootID).toBe(root.id)
      expect(attr.feature).toBe("agent-manager")

      yield* session.remove(root.id)
    }),
  )

  it.instance("child sessions expose parent and root lineage", () =>
    Effect.gen(function* () {
      const session = yield* SessionNs.Service
      const root = yield* session.create({})
      const child = yield* session.create({ parentID: root.id, title: "child" })
      const leaf = yield* session.create({ parentID: child.id, title: "leaf" })

      expect(KiloSession.resolveParent(root.id)).toBeUndefined()
      expect(KiloSession.resolveParent(child.id)).toBe(root.id)
      expect(KiloSession.resolveParent(leaf.id)).toBe(child.id)
      expect(KiloSession.resolveRoot(leaf.id)).toBe(root.id)

      yield* session.remove(root.id)
    }),
  )
})

describe("step-finish token propagation via Bus event", () => {
  it.instance(
    "non-zero tokens propagate through PartUpdated event",
    () =>
      Effect.gen(function* () {
        const session = yield* SessionNs.Service
        const events = yield* EventV2Bridge.Service
        const info = yield* session.create({})

        const messageID = MessageID.ascending()
        yield* session.updateMessage({
          id: messageID,
          sessionID: info.id,
          role: "user",
          time: { created: Date.now() },
          agent: "user",
          model: { providerID: "test", modelID: "test" },
          tools: {},
          mode: "",
        } as unknown as MessageV2.Info)

        const received = yield* Deferred.make<MessageV2.Part>()
        const unsub = yield* events.listen((event) => {
          if (event.type === MessageV2.Event.PartUpdated.type)
            Deferred.doneUnsafe(
              received,
              Effect.succeed((event.data as typeof MessageV2.Event.PartUpdated.data.Type).part as MessageV2.Part),
            )
          return Effect.void
        })
        yield* Effect.addFinalizer(() => unsub)

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

        yield* session.updatePart(part)
        const receivedPart = yield* awaitDeferred(received, "timed out waiting for message.part.updated")

        expect(receivedPart.type).toBe("step-finish")
        const finish = receivedPart as MessageV2.StepFinishPart
        expect(finish.tokens.input).toBe(500)
        expect(finish.tokens.output).toBe(800)
        expect(finish.tokens.reasoning).toBe(200)
        expect(finish.tokens.total).toBe(1500)
        expect(finish.tokens.cache.read).toBe(100)
        expect(finish.tokens.cache.write).toBe(50)
        expect(finish.cost).toBe(0.005)
        expect(receivedPart).not.toBe(part)

        yield* session.remove(info.id)
      }),
    { timeout: 30000 },
  )
})
