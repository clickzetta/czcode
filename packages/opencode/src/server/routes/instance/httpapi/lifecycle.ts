<<<<<<< HEAD
import { Instance, type InstanceContext } from "@/project/instance"
import { Effect } from "effect"
import { HttpEffect, HttpMiddleware, HttpServerRequest } from "effect/unstable/http"

const disposeAfterResponse = new WeakMap<object, InstanceContext>()
const reloadAfterResponse = new WeakMap<object, InstanceContext & { next: Parameters<typeof Instance.reload>[0] }>()

export const markInstanceForDisposal = (ctx: InstanceContext) =>
  HttpEffect.appendPreResponseHandler((request, response) =>
    Effect.sync(() => {
      disposeAfterResponse.set(request.source, ctx)
      return response
    }),
  )

export const markInstanceForReload = (ctx: InstanceContext, next: Parameters<typeof Instance.reload>[0]) =>
  HttpEffect.appendPreResponseHandler((request, response) =>
    Effect.sync(() => {
      reloadAfterResponse.set(request.source, { ...ctx, next })
      return response
    }),
  )

export const disposeMiddleware: HttpMiddleware.HttpMiddleware = (effect) =>
  Effect.gen(function* () {
    const response = yield* effect
    const request = yield* HttpServerRequest.HttpServerRequest
    const reload = reloadAfterResponse.get(request.source)
    if (reload) {
      reloadAfterResponse.delete(request.source)
      yield* Effect.promise(() => Instance.restore(reload, () => Instance.reload(reload.next)))
      return response
    }

    const ctx = disposeAfterResponse.get(request.source)
    if (!ctx) return response
    disposeAfterResponse.delete(request.source)
    yield* Effect.promise(() => Instance.restore(ctx, () => Instance.dispose()))
||||||| 12f7967ca4
=======
import { EffectBridge } from "@/effect/bridge"
import type { InstanceContext } from "@/project/instance"
import { InstanceStore } from "@/project/instance-store"
import { Effect } from "effect"
import { HttpEffect, HttpMiddleware, HttpServerRequest } from "effect/unstable/http"

type MarkedInstance = {
  ctx: InstanceContext
  store: InstanceStore.Interface
  bridge: EffectBridge.Shape
}

// Disposal is requested by an endpoint handler, but must run from the outer
// server middleware after the response has been produced. The original Request
// object is the stable handoff key between those two phases.
const disposeAfterResponse = new WeakMap<object, MarkedInstance>()

const mark = (ctx: InstanceContext) =>
  Effect.gen(function* () {
    return { ctx, store: yield* InstanceStore.Service, bridge: yield* EffectBridge.make() }
  })

export const markInstanceForDisposal = (ctx: InstanceContext) =>
  Effect.gen(function* () {
    const marked = yield* mark(ctx)
    return yield* HttpEffect.appendPreResponseHandler((request, response) =>
      Effect.sync(() => {
        // The response is sent before disposeMiddleware performs the teardown.
        disposeAfterResponse.set(request.source, marked)
        return response
      }),
    )
  })

export const markInstanceForReload = (ctx: InstanceContext, next: InstanceStore.LoadInput) =>
  Effect.gen(function* () {
    const marked = yield* mark(ctx)
    return yield* HttpEffect.appendPreResponseHandler((_request, response) =>
      Effect.as(Effect.uninterruptible(marked.bridge.run(marked.store.reload(next))), response),
    )
  })

export const disposeMiddleware: HttpMiddleware.HttpMiddleware = (effect) =>
  Effect.gen(function* () {
    const response = yield* effect
    const request = yield* HttpServerRequest.HttpServerRequest
    const marked = disposeAfterResponse.get(request.source)
    if (!marked) return response
    disposeAfterResponse.delete(request.source)
    yield* Effect.uninterruptible(marked.bridge.run(marked.store.dispose(marked.ctx)))
>>>>>>> yunqiqiliang/opencode-v7.3.0
    return response
  })
