<<<<<<< HEAD
import { Context, Effect, Layer, Schema } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { HttpRouter, HttpServer, HttpServerRequest } from "effect/unstable/http"
import { Bus } from "@/bus"
import { AppRuntime } from "@/effect/app-runtime"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import * as Observability from "@opencode-ai/core/effect/observability"
||||||| 12f7967ca4
import { Effect, Layer, Redacted, Schema } from "effect"
import { HttpApiBuilder, HttpApiMiddleware, HttpApiSecurity } from "effect/unstable/httpapi"
import { HttpRouter, HttpServer, HttpServerRequest } from "effect/unstable/http"
import { AppRuntime } from "@/effect/app-runtime"
import { InstanceRef, WorkspaceRef } from "@/effect/instance-ref"
import { Observability } from "@/effect"
import { Flag } from "@/flag/flag"
=======
import { Context, Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { FetchHttpClient, HttpClient, HttpMiddleware, HttpRouter, HttpServer } from "effect/unstable/http"
import * as Socket from "effect/unstable/socket/Socket"
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { Account } from "@/account/account"
import { Agent } from "@/agent/agent"
import { Auth } from "@/auth"
import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { Command } from "@/command"
import * as Observability from "@opencode-ai/core/effect/observability"
import { File } from "@/file"
import { FileWatcher } from "@/file/watcher"
import { Ripgrep } from "@/file/ripgrep"
import { Format } from "@/format"
import { LSP } from "@/lsp/lsp"
import { MCP } from "@/mcp"
import { Permission } from "@/permission"
import { Installation } from "@/installation"
>>>>>>> yunqiqiliang/opencode-v7.3.0
import { InstanceBootstrap } from "@/project/bootstrap"
<<<<<<< HEAD
import { Instance } from "@/project/instance"
import { Pty } from "@/pty"
import { Session } from "@/session/session"
||||||| 12f7967ca4
import { Instance } from "@/project/instance"
=======
import { InstanceStore } from "@/project/instance-store"
import { Plugin } from "@/plugin"
import { Project } from "@/project/project"
import { ProviderAuth } from "@/provider/auth"
import { ModelsDev } from "@/provider/models"
import { Provider } from "@/provider/provider"
import { Pty } from "@/pty"
import { Question } from "@/question"
import { Session } from "@/session/session"
import { SessionCompaction } from "@/session/compaction"
import { SessionPrompt } from "@/session/prompt"
import { SessionRevert } from "@/session/revert"
import { SessionRunState } from "@/session/run-state"
import { SessionStatus } from "@/session/status"
import { SessionSummary } from "@/session/summary"
import { Todo } from "@/session/todo"
import { SessionShare } from "@/share/session"
import { ShareNext } from "@/share/share-next"
import { Skill } from "@/skill"
import { Snapshot } from "@/snapshot"
import { SyncEvent } from "@/sync"
import { ToolRegistry } from "@/tool/registry"
>>>>>>> yunqiqiliang/opencode-v7.3.0
import { lazy } from "@/util/lazy"
<<<<<<< HEAD
import { Filesystem } from "@/util/filesystem"
import { authorizationLayer } from "./auth"
import { ConfigApi, configHandlers } from "./config"
import { eventRoute } from "./event"
import { FileApi, fileHandlers } from "./file"
import { ExperimentalApi, experimentalHandlers } from "./experimental"
import { InstanceApi, instanceHandlers } from "./instance"
import { McpApi, mcpHandlers } from "./mcp"
import { PermissionApi, permissionHandlers } from "./permission"
import { ProjectApi, projectHandlers } from "./project"
import { PtyApi, ptyConnectRoute, ptyHandlers } from "./pty"
import { ProviderApi, providerHandlers } from "./provider"
import { QuestionApi, questionHandlers } from "./question"
import { SessionApi, sessionHandlers } from "./session"
import { SyncApi, syncHandlers } from "./sync"
import { TuiApi, tuiHandlers } from "./tui"
import { WorkspaceApi, workspaceHandlers } from "./workspace"
import { disposeMiddleware } from "./lifecycle"
import { memoMap } from "@opencode-ai/core/effect/memo-map"
||||||| 12f7967ca4
import { Filesystem } from "@/util"
import { ConfigApi, configHandlers } from "./config"
import { PermissionApi, permissionHandlers } from "./permission"
import { ProjectApi, projectHandlers } from "./project"
import { ProviderApi, providerHandlers } from "./provider"
import { QuestionApi, questionHandlers } from "./question"
import { WorkspaceApi, workspaceHandlers } from "./workspace"
import { memoMap } from "@/effect/memo-map"
=======
import { Vcs } from "@/project/vcs"
import { Worktree } from "@/worktree"
import { Workspace } from "@/control-plane/workspace"
import { isAllowedCorsOrigin, type CorsOptions } from "@/server/cors"
import { serveUIEffect } from "@/server/routes/ui"
import { InstanceHttpApi, RootHttpApi } from "./api"
import { ServerAuthConfig, authorizationLayer, authorizationRouterMiddleware } from "./middleware/authorization"
import { EventApi, eventHandlers } from "./event"
import { configHandlers } from "./handlers/config"
import { controlHandlers } from "./handlers/control"
import { experimentalHandlers } from "./handlers/experimental"
import { fileHandlers } from "./handlers/file"
import { globalHandlers } from "./handlers/global"
import { instanceHandlers } from "./handlers/instance"
import { mcpHandlers } from "./handlers/mcp"
import { permissionHandlers } from "./handlers/permission"
import { projectHandlers } from "./handlers/project"
import { providerHandlers } from "./handlers/provider"
import { ptyConnectRoute, ptyHandlers } from "./handlers/pty"
import { questionHandlers } from "./handlers/question"
import { sessionHandlers } from "./handlers/session"
import { syncHandlers } from "./handlers/sync"
import { tuiHandlers } from "./handlers/tui"
import { workspaceHandlers } from "./handlers/workspace"
import { instanceContextLayer, instanceRouterMiddleware } from "./middleware/instance-context"
import { workspaceRouterMiddleware, workspaceRoutingLayer } from "./middleware/workspace-routing"
import { disposeMiddleware } from "./lifecycle"
import { memoMap } from "@opencode-ai/core/effect/memo-map"
import * as ServerBackend from "@/server/backend"
>>>>>>> yunqiqiliang/opencode-v7.3.0

export const context = Context.makeUnsafe<unknown>(new Map())

const runtime = HttpRouter.middleware()(
  Effect.succeed((effect) =>
    Effect.gen(function* () {
      const selected = ServerBackend.select()
      yield* Effect.annotateCurrentSpan(ServerBackend.attributes(ServerBackend.force(selected, "effect-httpapi")))
      return yield* effect
    }),
  ),
).layer

<<<<<<< HEAD
export const context = Context.empty() as Context.Context<unknown>

function decode(input: string) {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
||||||| 12f7967ca4
function decode(input: string) {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
=======
const cors = (corsOptions?: CorsOptions) =>
  HttpRouter.middleware(
    HttpMiddleware.cors({
      allowedOrigins: (origin) => isAllowedCorsOrigin(origin, corsOptions),
      maxAge: 86_400,
    }),
    { global: true },
  )

const rootApiRoutes = HttpApiBuilder.layer(RootHttpApi).pipe(Layer.provide([controlHandlers, globalHandlers]))
const instanceRouterLayer = authorizationRouterMiddleware
  .combine(instanceRouterMiddleware)
  .combine(workspaceRouterMiddleware)
  .layer.pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal), Layer.provide(ServerAuthConfig.defaultLayer))
const eventApiRoutes = HttpApiBuilder.layer(EventApi).pipe(
  Layer.provide(eventHandlers),
  Layer.provide(instanceRouterLayer),
)
const instanceApiRoutes = HttpApiBuilder.layer(InstanceHttpApi).pipe(
  Layer.provide([
    configHandlers,
    experimentalHandlers,
    fileHandlers,
    instanceHandlers,
    mcpHandlers,
    projectHandlers,
    ptyHandlers,
    questionHandlers,
    permissionHandlers,
    providerHandlers,
    sessionHandlers,
    syncHandlers,
    tuiHandlers,
    workspaceHandlers,
  ]),
)

const rawInstanceRoutes = Layer.mergeAll(ptyConnectRoute).pipe(Layer.provide(instanceRouterLayer))
const instanceRoutes = Layer.mergeAll(rawInstanceRoutes, instanceApiRoutes).pipe(
  Layer.provide([
    authorizationLayer.pipe(Layer.provide(ServerAuthConfig.defaultLayer)),
    workspaceRoutingLayer.pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal)),
    instanceContextLayer,
  ]),
)

const uiRoute = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const fs = yield* AppFileSystem.Service
    const client = yield* HttpClient.HttpClient
    yield* router.add("*", "/*", (request) => serveUIEffect(request, { fs, client }))
  }),
).pipe(Layer.provide(authorizationRouterMiddleware.layer.pipe(Layer.provide(ServerAuthConfig.defaultLayer))))

export function createRoutes(corsOptions?: CorsOptions) {
  return Layer.mergeAll(rootApiRoutes, eventApiRoutes, instanceRoutes, uiRoute).pipe(
    Layer.provide([
      cors(corsOptions),
      runtime,
      Account.defaultLayer,
      Agent.defaultLayer,
      Auth.defaultLayer,
      Command.defaultLayer,
      Config.defaultLayer,
      File.defaultLayer,
      FileWatcher.defaultLayer,
      Format.defaultLayer,
      LSP.defaultLayer,
      Installation.defaultLayer,
      InstanceBootstrap.defaultLayer,
      InstanceStore.defaultLayer,
      MCP.defaultLayer,
      ModelsDev.defaultLayer,
      Permission.defaultLayer,
      Plugin.defaultLayer,
      Project.defaultLayer,
      ProviderAuth.defaultLayer,
      Provider.defaultLayer,
      Pty.defaultLayer,
      Question.defaultLayer,
      Ripgrep.defaultLayer,
      Session.defaultLayer,
      SessionCompaction.defaultLayer,
      SessionPrompt.defaultLayer,
      SessionRevert.defaultLayer,
      SessionShare.defaultLayer,
      SessionRunState.defaultLayer,
      SessionStatus.defaultLayer,
      SessionSummary.defaultLayer,
      ShareNext.defaultLayer,
      Snapshot.defaultLayer,
      SyncEvent.defaultLayer,
      Skill.defaultLayer,
      Todo.defaultLayer,
      ToolRegistry.defaultLayer,
      Vcs.defaultLayer,
      Workspace.defaultLayer,
      Worktree.defaultLayer,
      Bus.layer,
      AppFileSystem.defaultLayer,
      FetchHttpClient.layer,
      HttpServer.layerServices,
    ]),
    Layer.provideMerge(Observability.layer),
  )
>>>>>>> yunqiqiliang/opencode-v7.3.0
}

<<<<<<< HEAD
const instance = HttpRouter.middleware()(
  Effect.gen(function* () {
    return (effect) =>
      Effect.gen(function* () {
        const query = yield* HttpServerRequest.schemaSearchParams(Query)
        const headers = yield* HttpServerRequest.schemaHeaders(Headers)
        const raw = query.directory || headers["x-kilo-directory"] || process.cwd()
        const workspace = query.workspace || undefined
        const ctx = yield* Effect.promise(() =>
          Instance.provide({
            directory: Filesystem.resolve(decode(raw)),
            init: () => AppRuntime.runPromise(InstanceBootstrap),
            fn: () => Instance.current,
          }),
        )

        const next = workspace ? effect.pipe(Effect.provideService(WorkspaceRef, workspace)) : effect
        return yield* next.pipe(Effect.provideService(InstanceRef, ctx))
      })
  }),
).layer

export const routes = Layer.mergeAll(
  eventRoute,
  ptyConnectRoute,
  HttpApiBuilder.layer(ConfigApi).pipe(Layer.provide(configHandlers)),
  HttpApiBuilder.layer(ExperimentalApi).pipe(Layer.provide(experimentalHandlers)),
  HttpApiBuilder.layer(FileApi).pipe(Layer.provide(fileHandlers)),
  HttpApiBuilder.layer(InstanceApi).pipe(Layer.provide(instanceHandlers)),
  HttpApiBuilder.layer(McpApi).pipe(Layer.provide(mcpHandlers)),
  HttpApiBuilder.layer(ProjectApi).pipe(Layer.provide(projectHandlers)),
  HttpApiBuilder.layer(PtyApi).pipe(Layer.provide(ptyHandlers), Layer.provide(Pty.defaultLayer)),
  HttpApiBuilder.layer(QuestionApi).pipe(Layer.provide(questionHandlers)),
  HttpApiBuilder.layer(PermissionApi).pipe(Layer.provide(permissionHandlers)),
  HttpApiBuilder.layer(ProviderApi).pipe(Layer.provide(providerHandlers)),
  HttpApiBuilder.layer(SessionApi).pipe(Layer.provide(sessionHandlers)),
  HttpApiBuilder.layer(SyncApi).pipe(Layer.provide(syncHandlers)),
  HttpApiBuilder.layer(TuiApi).pipe(
    Layer.provide(tuiHandlers),
    Layer.provide(Session.defaultLayer),
    Layer.provide(Bus.layer),
  ),
  HttpApiBuilder.layer(WorkspaceApi).pipe(Layer.provide(workspaceHandlers)),
).pipe(
  Layer.provide(authorizationLayer),
  Layer.provide(instance),
  Layer.provide(HttpServer.layerServices),
  Layer.provideMerge(Observability.layer),
)

export const webHandler = lazy(() =>
||||||| 12f7967ca4
class Unauthorized extends Schema.TaggedErrorClass<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

class Authorization extends HttpApiMiddleware.Service<Authorization>()("@opencode/ExperimentalHttpApiAuthorization", {
  error: Unauthorized,
  security: {
    basic: HttpApiSecurity.basic,
  },
}) {}

const normalize = HttpRouter.middleware()(
  Effect.gen(function* () {
    return (effect) =>
      Effect.gen(function* () {
        const query = yield* HttpServerRequest.schemaSearchParams(Query)
        if (!query.auth_token) return yield* effect
        const req = yield* HttpServerRequest.HttpServerRequest
        const next = req.modify({
          headers: {
            ...req.headers,
            authorization: `Basic ${query.auth_token}`,
          },
        })
        return yield* effect.pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, next))
      })
  }),
).layer

const auth = Layer.succeed(
  Authorization,
  Authorization.of({
    basic: (effect, { credential }) =>
      Effect.gen(function* () {
        if (!Flag.KILO_SERVER_PASSWORD) return yield* effect

        const user = Flag.KILO_SERVER_USERNAME ?? "opencode"
        if (credential.username !== user) {
          return yield* new Unauthorized({ message: "Unauthorized" })
        }
        if (Redacted.value(credential.password) !== Flag.KILO_SERVER_PASSWORD) {
          return yield* new Unauthorized({ message: "Unauthorized" })
        }
        return yield* effect
      }),
  }),
)

const instance = HttpRouter.middleware()(
  Effect.gen(function* () {
    return (effect) =>
      Effect.gen(function* () {
        const query = yield* HttpServerRequest.schemaSearchParams(Query)
        const headers = yield* HttpServerRequest.schemaHeaders(Headers)
        const raw = query.directory || headers["x-kilo-directory"] || process.cwd()
        const workspace = query.workspace || undefined
        const ctx = yield* Effect.promise(() =>
          Instance.provide({
            directory: Filesystem.resolve(decode(raw)),
            init: () => AppRuntime.runPromise(InstanceBootstrap),
            fn: () => Instance.current,
          }),
        )

        const next = workspace ? effect.pipe(Effect.provideService(WorkspaceRef, workspace)) : effect
        return yield* next.pipe(Effect.provideService(InstanceRef, ctx))
      })
  }),
).layer

const QuestionSecured = QuestionApi.middleware(Authorization)
const PermissionSecured = PermissionApi.middleware(Authorization)
const ProjectSecured = ProjectApi.middleware(Authorization)
const ProviderSecured = ProviderApi.middleware(Authorization)
const ConfigSecured = ConfigApi.middleware(Authorization)
const WorkspaceSecured = WorkspaceApi.middleware(Authorization)

export const routes = Layer.mergeAll(
  HttpApiBuilder.layer(ConfigSecured).pipe(Layer.provide(configHandlers)),
  HttpApiBuilder.layer(ProjectSecured).pipe(Layer.provide(projectHandlers)),
  HttpApiBuilder.layer(QuestionSecured).pipe(Layer.provide(questionHandlers)),
  HttpApiBuilder.layer(PermissionSecured).pipe(Layer.provide(permissionHandlers)),
  HttpApiBuilder.layer(ProviderSecured).pipe(Layer.provide(providerHandlers)),
  HttpApiBuilder.layer(WorkspaceSecured).pipe(Layer.provide(workspaceHandlers)),
).pipe(
  Layer.provide(auth),
  Layer.provide(normalize),
  Layer.provide(instance),
  Layer.provide(HttpServer.layerServices),
  Layer.provideMerge(Observability.layer),
)

export const webHandler = lazy(() =>
=======
export const routes = createRoutes()

const defaultWebHandler = lazy(() =>
>>>>>>> yunqiqiliang/opencode-v7.3.0
  HttpRouter.toWebHandler(routes, {
    memoMap,
    middleware: disposeMiddleware,
  }),
)

export function webHandler(corsOptions?: CorsOptions) {
  if (!corsOptions?.cors?.length) return defaultWebHandler()
  return HttpRouter.toWebHandler(createRoutes(corsOptions), {
    // Server-level CORS options are dynamic; don't reuse the default route layer memoized without them.
    memoMap: Layer.makeMemoMapUnsafe(),
    middleware: disposeMiddleware,
  })
}

export * as ExperimentalHttpApiServer from "./server"
