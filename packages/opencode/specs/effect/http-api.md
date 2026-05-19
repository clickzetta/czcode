# HttpApi migration

Plan for replacing instance Hono route implementations with Effect `HttpApi` while preserving behavior, OpenAPI, and SDK output during the transition.

## End State

- JSON route contracts and handlers live in `src/server/routes/instance/httpapi/*`.
- Route modules own their `HttpApiGroup`, schemas, handlers, and route-level middleware.
- `httpapi/server.ts` only composes groups, instance lookup, observability, and the web handler bridge.
- Hono route implementations are deleted once their `HttpApi` replacements are default, tested, and represented in the SDK/OpenAPI pipeline.
- Streaming, SSE, and websocket routes move later through Effect HTTP primitives or another explicit replacement plan; they do not need to fit `HttpApi` if `HttpApi` is the wrong abstraction.

## Current State

<<<<<<< HEAD
- `KILO_EXPERIMENTAL_HTTPAPI` gates the bridge. Default behavior still uses Hono.
- The bridge mounts selected paths in `server/routes/instance/index.ts` before legacy Hono routes.
- Legacy Hono routes remain for default behavior and for `hono-openapi` SDK generation.
- `HttpApi` auth is independent of Hono auth.
- `Authorization` is attached in each route module, not centrally wrapped in `server.ts`.
- Auth supports Basic auth and the legacy `auth_token` query parameter through `HttpApiSecurity.apiKey`.
- Instance context is provided by `httpapi/server.ts` using `directory`, `workspace`, and `x-kilo-directory`.
- `Observability.layer` is provided in the Effect route layer and deduplicated through the shared `memoMap`.
||||||| 12f7967ca4
This should be treated as a later-stage HTTP boundary migration, not a prerequisite for ongoing service, route-handler, or schema work.
=======
- `KILO_EXPERIMENTAL_HTTPAPI` selects the backend at server startup. Default is still `hono`.
- `server/backend.ts` picks one of `effect-httpapi` or `hono`; `server.ts` builds either a pure Effect `HttpApi` web handler or the legacy Hono app accordingly. The earlier in-Hono "bridge" model has been replaced by this fork-at-startup.
- Legacy Hono routes remain mounted for the `hono` backend and remain the source for `hono-openapi` SDK generation.
- An Effect `HttpApi` OpenAPI surface exists (`OpenApi.fromApi(PublicApi)` in `cli/cmd/generate.ts --httpapi`, `KILO_SDK_OPENAPI=httpapi` in `packages/sdk/js/script/build.ts`) but is opt-in. The default SDK generation is still Hono.
- `httpapi/public.ts` carries the Hono-compat normalization for the Effect-generated OpenAPI surface (auth scheme strip, request-body required flag, optional `null` arms, `BadRequestError` / `NotFoundError` remap, `$ref` self-cycle fix, `auth_token` query injection). Today's Effect-generated SDK is not byte-identical to the Hono-generated SDK — see Phase 4.
- Auth is centrally configured for the Effect backend via Effect `Config` (`refactor: use Effect config for HttpApi authorization`, `Fix HttpApi raw route authorization`) rather than re-attached in each route module.
- Auth supports Basic auth and the legacy `auth_token` query parameter through `HttpApiSecurity.apiKey`.
- Instance context is provided by `httpapi/server.ts` using `directory`, `workspace`, and `x-kilo-directory`.
- `Observability.layer` is provided in the Effect route layer and deduplicated through the shared `memoMap`.
- CORS middleware is wired into both backends (`feat(httpapi): add CORS middleware to instance routes`).
>>>>>>> yunqiqiliang/opencode-v7.3.0

## Migration Rules

- Preserve runtime behavior first. Semantic changes, new error behavior, or route shape changes need separate PRs.
- Migrate one route group, or one coherent subset of a route group, at a time.
- Reuse existing services. Do not re-architect service logic during HTTP boundary migration.
- Effect Schema owns route DTOs. Keep `.zod` only as compatibility for remaining Hono/OpenAPI surfaces.
- Regenerate the SDK after schema or OpenAPI-affecting changes and verify the diff is expected.
- Do not delete a Hono route until the SDK/OpenAPI pipeline no longer depends on its Hono `describeRoute` entry.

## Route Slice Checklist

Use this checklist for each small HttpApi migration PR:

1. Read the legacy Hono route and copy behavior exactly, including default values, headers, operation IDs, response schemas, and status codes.
2. Put the new `HttpApiGroup`, route paths, DTO schemas, and handlers in `src/server/routes/instance/httpapi/*`.
3. Mount the new paths in `src/server/routes/instance/index.ts` only inside the `KILO_EXPERIMENTAL_HTTPAPI` block.
4. Use `InstanceState.context` / `InstanceState.directory` inside HttpApi handlers instead of `Instance.directory`, `Instance.worktree`, or `Instance.project` ALS globals.
5. Reuse existing services directly. If a service returns plain objects, use `Schema.Struct`; use `Schema.Class` only when handlers return actual class instances.
6. Keep legacy Hono routes and `.zod` compatibility in place for SDK/OpenAPI generation.
7. Add tests that hit the Hono-mounted bridge via `InstanceRoutes`, not only the raw `HttpApi` web handler, when the route depends on auth or instance context.
8. Run `bun typecheck` from `packages/opencode`, relevant `bun run test:ci ...` tests from `packages/opencode`, and `./packages/sdk/js/script/build.ts` from the repo root.

## Hono Deletion Checklist

Use this checklist before deleting any Hono route implementation. A route being `bridged` is not enough.

1. `HttpApi` parity is complete for the route path, method, auth behavior, query parameters, request body, response status, response headers, and error status.
2. The route is mounted by default, not only behind `KILO_EXPERIMENTAL_HTTPAPI`.
3. If a fallback flag exists, tests cover both the default `HttpApi` path and the fallback Hono path until the fallback is removed.
4. OpenAPI generation uses the Effect `HttpApi` route as the source for that path.
5. Generated SDK output is unchanged from the Hono-generated contract, or the SDK diff is intentionally reviewed and accepted.
6. The legacy Hono `describeRoute`, validator, and handler for that path are removed.
7. Any duplicate Zod-only DTOs are deleted or kept only as `.zod` compatibility on the canonical Effect Schema.
8. Bridge tests exist for auth, instance selection, success response, and route-specific side effects.
9. Mutation routes prove persisted side effects and cleanup behavior in tests. If the mutation disposes/reloads the active instance, disposal happens through an explicit post-response lifecycle hook rather than inline handler teardown.
10. Streaming, SSE, websocket, and UI bridge routes have a specific non-Hono replacement plan. Do not force them through `HttpApi` if raw Effect HTTP is a better fit.

Hono can be removed from the instance server only after all mounted Hono route groups meet this checklist and `server/routes/instance/index.ts` no longer depends on Hono routing for default behavior.

## Experimental Read Slice Guidance

For the experimental route group, port read-only JSON routes before mutations:

- Good first batch: `GET /console`, `GET /console/orgs`, `GET /tool/ids`, `GET /resource`.
- Consider `GET /worktree` only if the handler uses `InstanceState.context` instead of `Instance.project`.
- Defer `POST /console/switch`, worktree create/remove/reset, and `GET /session` to separate PRs because they mutate state or have broader pagination/session behavior.
- Preserve response headers such as pagination cursors if a route is ported.
- If SDK generation changes, explain whether it is a semantic contract change or a generator-equivalent type normalization.

## Schema Notes

- Use `Schema.Struct(...).annotate({ identifier })` for named OpenAPI refs when handlers return plain objects.
- Use `Schema.Class` only when the handler returns real class instances or the constructor requirement is intentional.
- Keep nested anonymous shapes as `Schema.Struct` unless a named SDK type is useful.
- Avoid parallel hand-written Zod and Effect definitions for the same route boundary.

## Phases

### 1. Stabilize The Bridge

Before porting more routes, cover the bridge behavior that every route depends on.

- Add tests that hit the Hono-mounted `HttpApi` bridge, not just `HttpApiBuilder.layer` directly.
- Cover auth disabled, Basic auth success, `auth_token` success, missing credentials, and bad credentials.
- Cover `directory` and `x-kilo-directory` instance selection.
- Verify generated SDK output remains unchanged for non-SDK work.
- Fix or remove any implemented-but-unmounted `HttpApi` groups.

### 2. Complete The Inventory

Create a route inventory from the actual Hono registrations and classify each route.

Statuses:

- `bridged`: served through the `HttpApi` bridge when the flag is on.
- `implemented`: `HttpApi` group exists but is not mounted through Hono.
- `next`: good JSON candidate for near-term porting.
- `later`: portable, but needs schema/service cleanup first.
- `special`: SSE, websocket, streaming, or UI bridge behavior that likely needs raw Effect HTTP rather than `HttpApi`.

### 3. Finish JSON Route Parity

Port remaining JSON routes in small batches.

Good near-term candidates:

- top-level reads: `GET /path`, `GET /vcs`, `GET /vcs/diff`, `GET /command`, `GET /agent`, `GET /skill`, `GET /lsp`, `GET /formatter`
- simple mutations: `POST /instance/dispose`
- experimental JSON reads: console, tool, worktree list, resource list
- deferred JSON mutations: workspace/worktree create/remove/reset, file search, MCP auth flows

Keep large or stateful groups for later:

- `session`
- `sync`
- process-level experimental routes

### 4. Move OpenAPI And SDK Generation

Hono routes cannot be deleted while `hono-openapi` is the source of SDK generation.

<<<<<<< HEAD
Required before route deletion:
||||||| 12f7967ca4
The current server composition, middleware, and docs flow are Hono-centered today. That suggests a parallel or incremental adoption plan is safer than a flag day rewrite.
=======
Status: the Effect `HttpApi` OpenAPI surface is **implemented and opt-in** (`bun dev generate --httpapi`, `KILO_SDK_OPENAPI=httpapi`). Default SDK generation still uses Hono. `httpapi/public.ts` applies the Hono-compat normalization layer to the Effect output. Diff against the Hono-generated spec still shows real gaps that must be closed before the SDK can flip:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- Generate the public OpenAPI surface from Effect `HttpApi` for ported routes.
- Keep operation IDs, schemas, status codes, and SDK type names stable unless the change is intentional.
- Compare generated SDK output against `dev` for every route group deletion.
- Remove Hono OpenAPI stubs only after Effect OpenAPI is the SDK source for those paths.
||||||| 12f7967ca4
## Recommended strategy
=======
- Branded-type `pattern` constraints on ID schemas are not propagated to the Effect output (~169 missing).
- Per-property `description` annotations are not propagated through `Schema.Struct` to the Effect output (~107 missing).
- `Event.*` and `SyncEvent.*` component names use dotted form in Hono and PascalCase in Effect (~50 differences, breaks SDK type names).
- Effect's component deduper emits numbered duplicates (`Session9`, `SyncEvent.session.updated.11`) that need a name-collision fix.
- Cosmetic-only diffs (`additionalProperties: false`, `const` vs `enum`, MAX_SAFE_INTEGER `maximum`, `propertyNames`) can be normalized in `public.ts` if they would otherwise change SDK output.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
### 5. Make HttpApi Default For JSON Routes
||||||| 12f7967ca4
### 1. Finish the prerequisites first
=======
Required before route deletion:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
After JSON parity and SDK generation are covered:
||||||| 12f7967ca4
- continue route-handler effectification in `server/routes/instance/*.ts`
- continue schema migration toward Effect Schema-first DTOs and errors
- keep removing service facades
=======
- Close the diff above so Effect-generated SDK output matches the Hono-generated SDK output for every retained path.
- Keep operation IDs, schemas, status codes, and SDK type names stable unless the change is intentional.
- Flip `packages/sdk/js/script/build.ts` default to `httpapi` and regenerate.
- Compare generated SDK output against `dev` for every route group deletion.
- Remove Hono OpenAPI stubs only after Effect OpenAPI is the SDK source for those paths.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- Flip the bridge default for ported JSON routes.
- Keep a short-lived fallback flag for the old Hono implementation.
- Run the same tests against both the default and fallback path during rollout.
- Stop adding new Hono handlers for JSON routes once the default flips.
||||||| 12f7967ca4
### 2. Start with one parallel group
=======
V2 cleanup once SDK compatibility no longer needs the legacy Hono contract:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
### 6. Delete Hono Route Implementations
||||||| 12f7967ca4
Introduce one small `HttpApi` group for plain JSON endpoints only. Good initial candidates are the least stateful endpoints in:
=======
- Remove `public.ts` compatibility transforms that hide honest `HttpApi` metadata, including auth `securitySchemes`, per-route `security`, and generated `401` responses.
- Stop remapping built-in `HttpApi` error schemas back to legacy Hono `BadRequestError` / `NotFoundError` components if V2 clients can consume the actual Effect error shape.
- Prefer the direct `HttpApi` OpenAPI output for request/response bodies and named component schemas instead of rewriting it to match Hono generator quirks.
- Keep schema fixes that describe the actual wire format, but delete transforms that only preserve legacy SDK type names or inline-vs-ref shape.
- Re-evaluate `auth_token` as an OpenAPI security scheme rather than a hand-injected query parameter once clients can consume the V2 spec.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
Delete Hono routes group-by-group after each group meets the deletion criteria.
||||||| 12f7967ca4
- `server/routes/instance/question.ts`
- `server/routes/instance/provider.ts`
- `server/routes/instance/permission.ts`
=======
### 5. Make HttpApi Default For JSON Routes
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
Deletion criteria:
||||||| 12f7967ca4
Avoid `session.ts`, SSE, websocket, and TUI-facing routes first.
=======
After JSON parity and SDK generation are covered:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- `HttpApi` route is mounted by default.
- Behavior is covered by bridge-level tests.
- OpenAPI/SDK generation comes from Effect for that path.
- SDK diff is zero or explicitly accepted.
- Legacy Hono route is no longer needed as a fallback.
||||||| 12f7967ca4
Recommended first slice:
=======
- Flip the bridge default for ported JSON routes.
- Keep a short-lived fallback flag for the old Hono implementation.
- Run the same tests against both the default and fallback path during rollout.
- Stop adding new Hono handlers for JSON routes once the default flips.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
After deleting a group:
||||||| 12f7967ca4
- start with `question`
- start with `GET /question`
- start with `POST /question/:requestID/reply`
=======
### 6. Delete Hono Route Implementations
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- Remove its Hono route file or dead endpoints.
- Remove its `.route(...)` registration from `instance/index.ts`.
- Remove duplicate Zod-only route DTOs if Effect Schema now owns the type.
- Regenerate SDK and verify output.
||||||| 12f7967ca4
Why `question` first:
=======
Delete Hono routes group-by-group after each group meets the deletion criteria.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
### 7. Replace Special Routes
||||||| 12f7967ca4
- already JSON-only
- already delegates into an Effect service
- proves list + mutation + params + payload + OpenAPI in one small slice
- avoids the harder streaming and middleware cases
=======
Deletion criteria:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
Special routes need explicit designs before Hono can disappear completely.
||||||| 12f7967ca4
### 3. Reuse existing services
=======
- `HttpApi` route is mounted by default.
- Behavior is covered by bridge-level tests.
- OpenAPI/SDK generation comes from Effect for that path.
- SDK diff is zero or explicitly accepted.
- Legacy Hono route is no longer needed as a fallback.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- `event`: SSE
- `pty`: websocket
- `tui`: UI/control bridge behavior
- streaming `session` endpoints
||||||| 12f7967ca4
Do not re-architect business logic during the HTTP migration. `HttpApi` handlers should call the same Effect services already used by the Hono handlers.
=======
After deleting a group:
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
Use raw Effect HTTP routes where `HttpApi` does not fit. The goal is deleting Hono implementations, not forcing every transport shape through `HttpApi`.
||||||| 12f7967ca4
### 4. Bridge into Hono behind a feature flag
=======
- Remove its Hono route file or dead endpoints.
- Remove its `.route(...)` registration from `instance/index.ts`.
- Remove duplicate Zod-only route DTOs if Effect Schema now owns the type.
- Regenerate SDK and verify output.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
## Current Route Status
||||||| 12f7967ca4
The `HttpApi` routes are bridged into the Hono server via `HttpRouter.toWebHandler` with a shared `memoMap`. This means:
=======
### 7. Replace Special Routes
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
| Area                      | Status            | Notes                                                                      |
| ------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `question`                | `bridged`         | `GET /question`, reply, reject                                             |
| `permission`              | `bridged`         | list and reply                                                             |
| `provider`                | `bridged`         | list, auth, OAuth authorize/callback                                       |
| `config`                  | `bridged`         | read, providers, update                                                    |
| `project`                 | `bridged`         | list, current, git init, update                                            |
| `file`                    | `bridged` partial | find text/file/symbol, list/content/status                                 |
| `mcp`                     | `bridged`         | status, add, OAuth, connect/disconnect                                     |
| `workspace`               | `bridged`         | adaptor/list/status/create/remove/session-restore                          |
| top-level instance routes | `bridged`         | path, vcs, command, agent, skill, lsp, formatter, dispose                  |
| experimental JSON routes  | `bridged`         | console, tool, worktree list/mutations, global session list, resource list |
| `session`                 | `bridged`         | read, lifecycle, prompt, message/part mutations, revert, permission reply  |
| `sync`                    | `bridged`         | start/replay/history                                                       |
| `event`                   | `bridged`         | SSE via raw Effect HTTP                                                    |
| `pty`                     | `special`         | websocket                                                                  |
| `tui`                     | `special`         | UI bridge                                                                  |
||||||| 12f7967ca4
- one process, one port — no separate server
- the Effect handler shares layer instances with `AppRuntime` (same `Question.Service`, etc.)
- Effect middleware handles auth and instance lookup independently from Hono middleware
- Hono's `.all()` catch-all intercepts matching paths before the Hono route handlers
=======
Special routes need explicit designs before Hono can disappear completely.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
## Full Route Checklist
||||||| 12f7967ca4
The bridge is gated behind `KILO_EXPERIMENTAL_HTTPAPI` (or `KILO_EXPERIMENTAL`). When the flag is off (default), all requests go through the original Hono handlers unchanged.
=======
- `event`: SSE
- `pty`: websocket
- `tui`: UI/control bridge behavior
- streaming `session` endpoints
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
This checklist tracks bridge parity only. Checked routes are available through the experimental `HttpApi` bridge; Hono deletion is tracked separately by the deletion checklist above.
||||||| 12f7967ca4
```ts
// in instance/index.ts
if (Flag.KILO_EXPERIMENTAL_HTTPAPI) {
  const handler = ExperimentalHttpApiServer.webHandler().handler
  app.all("/question", (c) => handler(c.req.raw)).all("/question/*", (c) => handler(c.req.raw))
}
```
=======
Use raw Effect HTTP routes where `HttpApi` does not fit. The goal is deleting Hono implementations, not forcing every transport shape through `HttpApi`.
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
### Top-Level Instance Routes
||||||| 12f7967ca4
The Hono route handlers are always registered (after the bridge) so `hono-openapi` generates the OpenAPI spec entries that feed SDK codegen. When the flag is on, these handlers are dead code — the `.all()` bridge matches first.
=======
## Current Route Status
>>>>>>> yunqiqiliang/opencode-v7.3.0

<<<<<<< HEAD
- [x] `POST /instance/dispose` - dispose active instance after response.
- [x] `GET /path` - current directory and worktree paths.
- [x] `GET /vcs` - current VCS status.
- [x] `GET /vcs/diff` - VCS diff summary.
- [x] `GET /command` - command catalog.
- [x] `GET /agent` - agent catalog.
- [x] `GET /skill` - skill catalog.
- [x] `GET /lsp` - LSP status.
- [x] `GET /formatter` - formatter status.

### Config Routes

- [x] `GET /config` - read config.
- [x] `PATCH /config` - update config and dispose active instance after response.
- [x] `GET /config/providers` - config provider summary.

### Project Routes

- [x] `GET /project` - list projects.
- [x] `GET /project/current` - current project.
- [x] `POST /project/git/init` - initialize git and reload active instance after response.
- [x] `PATCH /project/:projectID` - update project metadata.

### Provider Routes

- [x] `GET /provider` - list providers.
- [x] `GET /provider/auth` - list provider auth methods.
- [x] `POST /provider/:providerID/oauth/authorize` - start provider OAuth.
- [x] `POST /provider/:providerID/oauth/callback` - finish provider OAuth.

### Question Routes

- [x] `GET /question` - list questions.
- [x] `POST /question/:requestID/reply` - reply to question.
- [x] `POST /question/:requestID/reject` - reject question.

### Permission Routes

- [x] `GET /permission` - list permission requests.
- [x] `POST /permission/:requestID/reply` - reply to permission request.

### File Routes

- [x] `GET /find` - text search.
- [x] `GET /find/file` - file search.
- [x] `GET /find/symbol` - symbol search.
- [x] `GET /file` - list directory entries.
- [x] `GET /file/content` - read file content.
- [x] `GET /file/status` - file status.

### MCP Routes

- [x] `GET /mcp` - MCP status.
- [x] `POST /mcp` - add MCP server at runtime.
- [x] `POST /mcp/:name/auth` - start MCP OAuth.
- [x] `POST /mcp/:name/auth/callback` - finish MCP OAuth callback.
- [x] `POST /mcp/:name/auth/authenticate` - run MCP OAuth authenticate flow.
- [x] `DELETE /mcp/:name/auth` - remove MCP OAuth credentials.
- [x] `POST /mcp/:name/connect` - connect MCP server.
- [x] `POST /mcp/:name/disconnect` - disconnect MCP server.

### Experimental Routes

- [x] `GET /experimental/console` - active Console provider metadata.
- [x] `GET /experimental/console/orgs` - switchable Console orgs.
- [x] `POST /experimental/console/switch` - switch active Console org.
- [x] `GET /experimental/tool/ids` - tool IDs.
- [x] `GET /experimental/tool` - tools for provider/model.
- [x] `GET /experimental/worktree` - list worktrees.
- [x] `POST /experimental/worktree` - create worktree.
- [x] `DELETE /experimental/worktree` - remove worktree.
- [x] `POST /experimental/worktree/reset` - reset worktree.
- [x] `GET /experimental/session` - global session list.
- [x] `GET /experimental/resource` - MCP resources.

### Workspace Routes

- [x] `GET /experimental/workspace/adaptor` - list workspace adaptors.
- [x] `POST /experimental/workspace` - create workspace.
- [x] `GET /experimental/workspace` - list workspaces.
- [x] `GET /experimental/workspace/status` - workspace status.
- [x] `DELETE /experimental/workspace/:id` - remove workspace.
- [x] `POST /experimental/workspace/:id/session-restore` - restore session into workspace.

### Sync Routes

- [x] `POST /sync/start` - start workspace sync.
- [x] `POST /sync/replay` - replay sync events.
- [x] `POST /sync/history` - list sync event history.

### Session Routes

- [x] `GET /session` - list sessions.
- [x] `GET /session/status` - session status map.
- [x] `GET /session/:sessionID` - get session.
- [x] `GET /session/:sessionID/children` - get child sessions.
- [x] `GET /session/:sessionID/todo` - get session todos.
- [x] `POST /session` - create session.
- [x] `DELETE /session/:sessionID` - delete session.
- [x] `PATCH /session/:sessionID` - update session metadata.
- [x] `POST /session/:sessionID/init` - run project init command.
- [x] `POST /session/:sessionID/fork` - fork session.
- [x] `POST /session/:sessionID/abort` - abort session.
- [x] `POST /session/:sessionID/share` - share session.
- [x] `GET /session/:sessionID/diff` - session diff.
- [x] `DELETE /session/:sessionID/share` - unshare session.
- [x] `POST /session/:sessionID/summarize` - summarize session.
- [x] `GET /session/:sessionID/message` - list session messages.
- [x] `GET /session/:sessionID/message/:messageID` - get message.
- [x] `DELETE /session/:sessionID/message/:messageID` - delete message.
- [x] `DELETE /session/:sessionID/message/:messageID/part/:partID` - delete part.
- [x] `PATCH /session/:sessionID/message/:messageID/part/:partID` - update part.
- [x] `POST /session/:sessionID/message` - prompt with streaming response.
- [x] `POST /session/:sessionID/prompt_async` - async prompt.
- [x] `POST /session/:sessionID/command` - run command.
- [x] `POST /session/:sessionID/shell` - run shell command.
- [x] `POST /session/:sessionID/revert` - revert message.
- [x] `POST /session/:sessionID/unrevert` - restore reverted messages.
- [x] `POST /session/:sessionID/permissions/:permissionID` - deprecated permission response route.

### Event Routes

- [x] `GET /event` - SSE event stream via raw Effect HTTP.

### PTY Routes

- [x] `GET /pty` - list PTY sessions.
- [x] `POST /pty` - create PTY session.
- [x] `GET /pty/:ptyID` - get PTY session.
- [x] `PUT /pty/:ptyID` - update PTY session.
- [x] `DELETE /pty/:ptyID` - remove PTY session.
- [x] `GET /pty/:ptyID/connect` - PTY websocket; replace with raw Effect HTTP/websocket support.

### TUI Routes

- [x] `POST /tui/append-prompt` - append prompt.
- [x] `POST /tui/open-help` - open help.
- [x] `POST /tui/open-sessions` - open sessions.
- [x] `POST /tui/open-themes` - open themes.
- [x] `POST /tui/open-models` - open models.
- [x] `POST /tui/submit-prompt` - submit prompt.
- [x] `POST /tui/clear-prompt` - clear prompt.
- [x] `POST /tui/execute-command` - execute command.
- [x] `POST /tui/show-toast` - show toast.
- [x] `POST /tui/publish` - publish TUI event.
- [x] `POST /tui/select-session` - select session.
- [x] `GET /tui/control/next` - get next TUI request.
- [x] `POST /tui/control/response` - submit TUI control response.

## Remaining PR Plan

Prefer smaller PRs from here so route behavior and SDK/OpenAPI fallout stays reviewable.

1. [x] Bridge `PATCH /project/:projectID`.
2. [x] Bridge MCP add/connect/disconnect routes.
3. [x] Bridge MCP OAuth routes: start, callback, authenticate, remove.
4. [x] Bridge experimental console switch and tool list routes.
5. [x] Bridge experimental global session list.
6. [x] Bridge workspace create/remove/session-restore routes.
7. [x] Bridge sync start/replay/history routes.
8. [x] Bridge session read routes: list, status, get, children, todo, diff, messages.
9. [x] Bridge session lifecycle mutation routes: create, delete, update, fork, abort.
10. [x] Bridge remaining session mutation and prompt routes.
11. [ ] Replace event SSE with non-Hono Effect HTTP.
12. [x] Replace pty websocket/control routes with non-Hono Effect HTTP.
13. [x] Replace tui bridge routes or explicitly isolate them behind a non-Hono compatibility layer.
14. [ ] Switch OpenAPI/SDK generation to Effect routes and compare SDK output.
15. [ ] Flip ported JSON routes default-on, keep a short fallback, then delete replaced Hono route files.
||||||| 12f7967ca4
### 5. Observability

The `webHandler` provides `Observability.layer` via `Layer.provideMerge`. Since the `memoMap` is shared with `AppRuntime`, the tracing provider is deduplicated — no extra initialization cost.

This gives:

- **spans**: `Effect.fn("QuestionHttpApi.list")` etc. appear in traces alongside service-layer spans
- **HTTP logs**: `HttpMiddleware.logger` emits structured `Effect.log` entries with `http.method`, `http.url`, `http.status` annotations, flowing to motel via `OtlpLogger`

### 6. Migrate JSON route groups gradually

As each route group is ported to `HttpApi`:

1. add `.get(...)` / `.post(...)` bridge entries to the flag block in `server/routes/instance/index.ts`
2. for partial ports (e.g. only `GET /provider/auth`), bridge only the specific path
3. keep the legacy Hono route registered behind it for OpenAPI / SDK generation until the spec pipeline changes
4. verify SDK output is unchanged

Leave streaming-style endpoints on Hono until there is a clear reason to move them.

## Schema rule for HttpApi work

Every `HttpApi` slice should follow `specs/effect/schema.md` and the Schema -> Zod interop rule in `specs/effect/migration.md`.

Default rule:

- Effect Schema owns the type
- `.zod` exists only as a compatibility surface
- do not introduce a new hand-written Zod schema for a type that is already migrating to Effect Schema

Practical implication for `HttpApi` migration:

- if a route boundary already depends on a shared DTO, ID, input, output, or tagged error, migrate that model to Effect Schema first or in the same change
- if an existing Hono route or tool still needs Zod, derive it with `@/util/effect-zod`
- avoid maintaining parallel Zod and Effect definitions for the same request or response type

Ordering for a route-group migration:

1. move implicated shared `schema.ts` leaf types to Effect Schema first
2. move exported `Info` / `Input` / `Output` route DTOs to Effect Schema
3. move tagged route-facing errors to `Schema.TaggedErrorClass` where needed
4. switch existing Zod boundary validators to derived `.zod`
5. define the `HttpApi` contract from the canonical Effect schemas
6. regenerate the SDK (`./packages/sdk/js/script/build.ts`) and verify zero diff against `dev`

SDK shape rule:

- every schema migration must preserve the generated SDK output byte-for-byte **unless the new ref is intentional** (see Schema.Class vs Schema.Struct below)
- if an unintended diff appears in `packages/sdk/js/src/v2/gen/types.gen.ts`, the migration introduced an unintended API surface change — fix it before merging

### Schema.Class vs Schema.Struct

The pattern choice determines whether a schema becomes a **named** export in the SDK or stays **anonymous inline**.

**Schema.Class** emits a named `$ref` in OpenAPI via its identifier → produces a named `export type Foo = ...` in `types.gen.ts`:

```ts
export class Info extends Schema.Class<Info>("FooConfig")({ ... }) {
  static readonly zod = zod(this)
}
```

**Schema.Struct** stays anonymous and is inlined everywhere it is referenced:

```ts
export const Info = Schema.Struct({ ... }).pipe(
  withStatics((s) => ({ zod: zod(s) })),
)
export type Info = Schema.Schema.Type<typeof Info>
```

When to use each:

- Use **Schema.Class** when:
  - the original Zod had `.meta({ ref: ... })` (preserve the existing named SDK type byte-for-byte)
  - the schema is a top-level endpoint request or response (SDK consumers benefit from a stable importable name)
- Use **Schema.Struct** when:
  - the type is only used as a nested field inside another named schema
  - the original Zod was anonymous and promoting it would bloat SDK types with no import value

Promoting a previously-anonymous schema to Schema.Class is acceptable when it is top-level or endpoint-facing, but call it out in the PR — it is an additive SDK change (`export type Foo = ...` newly appears) even if it preserves the JSON shape.

Schemas that are **not** pure objects (enums, unions, records, tuples) cannot use Schema.Class. For those — and for pure-object schemas where handlers populate plain objects rather than class instances — add `.annotate({ identifier: "FooName" })` to get the same named-ref behavior without the `instanceof` requirement:

```ts
export const Action = Schema.Literals(["ask", "allow", "deny"]).annotate({ identifier: "PermissionActionConfig" })
```

Temporary exception:

- it is acceptable to keep a route-local Zod schema for the first spike only when the type is boundary-local and migrating it would create unrelated churn
- if that happens, leave a short note so the type does not become a permanent second source of truth

## First vertical slice

The first `HttpApi` spike should be intentionally small and repeatable.

Chosen slice:

- group: `question`
- endpoints: `GET /question` and `POST /question/:requestID/reply`

Non-goals:

- no `session` routes
- no SSE or websocket routes
- no auth redesign
- no broad service refactor

Behavior rule:

- preserve current runtime behavior first
- treat semantic changes such as introducing new `404` behavior as a separate follow-up unless they are required to make the contract honest

Add `POST /question/:requestID/reject` only after the first two endpoints work cleanly.

## Repeatable slice template

Use the same sequence for each route group.

1. Pick one JSON-only route group that already mostly delegates into services.
2. Identify the shared DTOs, IDs, and errors implicated by that slice.
3. Apply the schema migration ordering above so those types are Effect Schema-first.
4. Define the `HttpApi` contract separately from the handlers.
5. Implement handlers by yielding the existing service from context.
6. Mount the new surface in parallel behind the `KILO_EXPERIMENTAL_HTTPAPI` bridge.
7. Regenerate the SDK and verify zero diff against `dev` (see SDK shape rule above).
8. Add one end-to-end test and one OpenAPI-focused test.
9. Compare ergonomics before migrating the next endpoint.

Rule of thumb:

- migrate one route group at a time
- migrate one or two endpoints first, not the whole file
- keep business logic in the existing service
- keep the first spike easy to delete if the experiment is not worth continuing

## Example structure

Placement rule:

- keep `HttpApi` code under `src/server`, not `src/effect`
- `src/effect` should stay focused on runtimes, layers, instance state, and shared Effect plumbing
- place each `HttpApi` slice next to the HTTP boundary it serves
- for instance-scoped routes, prefer `src/server/routes/instance/httpapi/*`
- if control-plane routes ever migrate, prefer `src/server/routes/control/httpapi/*`

Suggested file layout for a repeatable spike:

- `src/server/routes/instance/httpapi/question.ts` — contract and handler layer for one route group
- `src/server/routes/instance/httpapi/server.ts` — bridged Effect HTTP layer that composes all groups
- route or OpenAPI verification should live alongside the existing server tests; there is no dedicated `question-httpapi` test file on this branch

Suggested responsibilities:

- `question.ts` defines the `HttpApi` contract and `HttpApiBuilder.group(...)` handlers
- `server.ts` composes all route groups into one `HttpRouter.toWebHandler(...)` bridge with shared middleware (auth, instance lookup)
- tests should verify the bridged routes through the normal server surface

## Example migration shape

Each route-group spike should follow the same shape.

### 1. Contract

- define an experimental `HttpApi`
- define one `HttpApiGroup`
- define endpoint params, payload, success, and error schemas from canonical Effect schemas
- annotate summary, description, and operation ids explicitly so generated docs are stable

### 2. Handler layer

- implement with `HttpApiBuilder.group(api, groupName, ...)`
- yield the existing Effect service from context
- keep handler bodies thin
- keep transport mapping at the HTTP boundary only

### 3. Bridged server

- the Effect HTTP layer is composed in `httpapi/server.ts`
- it is mounted into the Hono app via `HttpRouter.toWebHandler(...)`
- routes keep their normal instance paths and are gated by the `KILO_EXPERIMENTAL_HTTPAPI` flag
- the legacy Hono handlers stay registered after the bridge so current OpenAPI / SDK generation still works

### 4. Verification

- seed real state through the existing service
- call the bridged endpoints with the flag enabled
- assert that the service behavior is unchanged
- assert that the generated OpenAPI contains the migrated paths and schemas

## Boundary composition

The Effect `HttpApi` layer owns its own auth and instance middleware, but it is currently mounted inside the existing Hono server.

### Auth

- the bridged `HttpApi` layer implements auth as an `HttpApiMiddleware.Service` using `HttpApiSecurity.basic`
- each route group's `HttpApi` is wrapped with `.middleware(Authorization)` before being served
- this is independent of the Hono auth layer; the current bridge keeps the responsibility local to the `HttpApi` slice

### Instance and workspace lookup

- the bridged `HttpApi` layer resolves instance context via an `HttpRouter.middleware` that reads `x-kilo-directory` headers and `directory` query params
- this is the Effect equivalent of the Hono `WorkspaceRouterMiddleware`
- `HttpApi` handlers yield services from context and assume the correct instance has already been provided

### Error mapping

- keep domain and service errors typed in the service layer
- declare typed transport errors on the endpoint only when the route can actually return them intentionally
- request decoding failures are transport-level `400`s handled by Effect `HttpApi` automatically
- storage or lookup failures that are part of the route contract should be declared as typed endpoint errors

## Exit criteria for the spike

The first slice is successful if:

- the bridged endpoints serve correctly through the existing Hono host when the flag is enabled
- the handlers reuse the existing Effect service
- request decoding and response shapes are schema-defined from canonical Effect schemas
- any remaining Zod boundary usage is derived from `.zod` or clearly temporary
- OpenAPI is generated from the `HttpApi` contract
- the tests are straightforward enough that the next slice feels mechanical

## Learnings

### Schema

- `Schema.Class` works well for route DTOs such as `Question.Request`, `Question.Info`, and `Question.Reply`.
- scalar or collection schemas such as `Question.Answer` should stay as schemas and use helpers like `withStatics(...)` instead of being forced into classes.
- if an `HttpApi` success schema uses `Schema.Class`, the handler or underlying service needs to return real schema instances rather than plain objects. `Schema.Class`'s Declaration AST enforces `input instanceof self || input.[ClassTypeId]` during encode (see effect-smol `Schema.ts:10479-10484`). Plain objects from zod parse fail with `Expected Foo, got {...}`. This surfaced on `GET /config` where the service returns zod-parsed plain objects and `Config.InfoSchema` referenced `ConfigProvider.Info` (class). The fix was to convert pure-object classes to `Schema.Struct(...).annotate({ identifier: "..." })` — same named SDK `$ref`, no instance requirement. Verified byte-identical `types.gen.ts` vs `dev`.
- internal event payloads can stay anonymous when we want to avoid adding extra named OpenAPI component churn for non-route shapes.
- `Schema.Class` emits named `$ref` in OpenAPI — only use it for types that already had `.meta({ ref })` in the old Zod schema **and** when the handler/service returns real instances. For schemas that need a named `$ref` but are populated from plain objects, use `Schema.Struct(...).annotate({ identifier: "..." })` instead. Inner/nested types should stay as `Schema.Struct` to avoid SDK shape changes.

### Integration

- `HttpRouter.toWebHandler` with the shared `memoMap` from `run-service.ts` cleanly bridges Effect routes into Hono — one process, one port, shared layer instances.
- `Observability.layer` must be explicitly provided via `Layer.provideMerge` in the routes layer for OTEL spans and HTTP logs to flow. The `memoMap` deduplicates it with `AppRuntime` — no extra cost.
- `HttpMiddleware.logger` (enabled by default when `disableLogger` is not set) emits structured `Effect.log` entries with `http.method`, `http.url`, `http.status` — these flow through `OtlpLogger` to motel.
- Hono OpenAPI stubs must remain registered for SDK codegen until the SDK pipeline reads from the Effect OpenAPI spec instead.
- the `KILO_EXPERIMENTAL_HTTPAPI` flag gates the bridge at the Hono router level — default off, no behavior change unless opted in.

## Route inventory

Status legend:

- `bridged` - Effect HttpApi slice exists and is bridged into Hono behind the flag
- `done` - Effect HttpApi slice exists but not yet bridged
- `next` - good near-term candidate
- `later` - possible, but not first wave
- `defer` - not a good early `HttpApi` target

Current instance route inventory:

- `question` - `bridged`
  endpoints: `GET /question`, `POST /question/:requestID/reply`, `POST /question/:requestID/reject`
- `permission` - `bridged`
  endpoints: `GET /permission`, `POST /permission/:requestID/reply`
- `provider` - `bridged`
  endpoints: `GET /provider`, `GET /provider/auth`, `POST /provider/:providerID/oauth/authorize`, `POST /provider/:providerID/oauth/callback`
- `config` - `bridged` (partial)
  bridged endpoints: `GET /config`, `GET /config/providers`
  defer `PATCH /config` for now
- `project` - `bridged` (partial)
  bridged endpoints: `GET /project`, `GET /project/current`
  defer git-init mutation first
- `workspace` - `bridged`
  best small reads: `GET /experimental/workspace/adaptor`, `GET /experimental/workspace`, `GET /experimental/workspace/status`
  defer create/remove mutations first
- `file` - `later`
  good JSON-only candidate set, but larger than the current first-wave slices
- `mcp` - `later`
  has JSON-only endpoints, but interactive OAuth/auth flows make it a worse early fit
- `session` - `defer`
  large, stateful, mixes CRUD with prompt/shell/command/share/revert flows and a streaming route
- `event` - `defer`
  SSE only
- `global` - `defer`
  mixed bag with SSE and process-level side effects
- `pty` - `defer`
  websocket-heavy route surface
- `tui` - `defer`
  queue-style UI bridge, weak early `HttpApi` fit

Recommended near-term sequence:

1. `workspace` read endpoints (`GET /experimental/workspace/adaptor`, `GET /experimental/workspace`, `GET /experimental/workspace/status`)
2. `file` JSON read endpoints
3. `mcp` JSON read endpoints
=======
| Area                      | Status            | Notes                                                                      |
| ------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `question`                | `bridged`         | `GET /question`, reply, reject                                             |
| `permission`              | `bridged`         | list and reply                                                             |
| `provider`                | `bridged`         | list, auth, OAuth authorize/callback                                       |
| `config`                  | `bridged`         | read, providers, update                                                    |
| `project`                 | `bridged`         | list, current, git init, update                                            |
| `file`                    | `bridged` partial | find text/file/symbol, list/content/status                                 |
| `mcp`                     | `bridged`         | status, add, OAuth, connect/disconnect                                     |
| `workspace`               | `bridged`         | adapter/list/status/create/remove/session-restore                          |
| top-level instance routes | `bridged`         | path, vcs, command, agent, skill, lsp, formatter, dispose                  |
| experimental JSON routes  | `bridged`         | console, tool, worktree list/mutations, global session list, resource list |
| `session`                 | `bridged`         | read, lifecycle, prompt, message/part mutations, revert, permission reply  |
| `sync`                    | `bridged`         | start/replay/history                                                       |
| `event`                   | `bridged`         | SSE via raw Effect HTTP                                                    |
| `pty`                     | `special`         | websocket                                                                  |
| `tui`                     | `special`         | UI bridge                                                                  |

## Full Route Checklist

This checklist tracks bridge parity only. Checked routes are available through the experimental `HttpApi` bridge; Hono deletion is tracked separately by the deletion checklist above.

### Top-Level Instance Routes

- [x] `POST /instance/dispose` - dispose active instance after response.
- [x] `GET /path` - current directory and worktree paths.
- [x] `GET /vcs` - current VCS status.
- [x] `GET /vcs/diff` - VCS diff summary.
- [x] `GET /command` - command catalog.
- [x] `GET /agent` - agent catalog.
- [x] `GET /skill` - skill catalog.
- [x] `GET /lsp` - LSP status.
- [x] `GET /formatter` - formatter status.

### Config Routes

- [x] `GET /config` - read config.
- [x] `PATCH /config` - update config and dispose active instance after response.
- [x] `GET /config/providers` - config provider summary.

### Project Routes

- [x] `GET /project` - list projects.
- [x] `GET /project/current` - current project.
- [x] `POST /project/git/init` - initialize git and reload active instance after response.
- [x] `PATCH /project/:projectID` - update project metadata.

### Provider Routes

- [x] `GET /provider` - list providers.
- [x] `GET /provider/auth` - list provider auth methods.
- [x] `POST /provider/:providerID/oauth/authorize` - start provider OAuth.
- [x] `POST /provider/:providerID/oauth/callback` - finish provider OAuth.

### Question Routes

- [x] `GET /question` - list questions.
- [x] `POST /question/:requestID/reply` - reply to question.
- [x] `POST /question/:requestID/reject` - reject question.

### Permission Routes

- [x] `GET /permission` - list permission requests.
- [x] `POST /permission/:requestID/reply` - reply to permission request.

### File Routes

- [x] `GET /find` - text search.
- [x] `GET /find/file` - file search.
- [x] `GET /find/symbol` - symbol search.
- [x] `GET /file` - list directory entries.
- [x] `GET /file/content` - read file content.
- [x] `GET /file/status` - file status.

### MCP Routes

- [x] `GET /mcp` - MCP status.
- [x] `POST /mcp` - add MCP server at runtime.
- [x] `POST /mcp/:name/auth` - start MCP OAuth.
- [x] `POST /mcp/:name/auth/callback` - finish MCP OAuth callback.
- [x] `POST /mcp/:name/auth/authenticate` - run MCP OAuth authenticate flow.
- [x] `DELETE /mcp/:name/auth` - remove MCP OAuth credentials.
- [x] `POST /mcp/:name/connect` - connect MCP server.
- [x] `POST /mcp/:name/disconnect` - disconnect MCP server.

### Experimental Routes

- [x] `GET /experimental/console` - active Console provider metadata.
- [x] `GET /experimental/console/orgs` - switchable Console orgs.
- [x] `POST /experimental/console/switch` - switch active Console org.
- [x] `GET /experimental/tool/ids` - tool IDs.
- [x] `GET /experimental/tool` - tools for provider/model.
- [x] `GET /experimental/worktree` - list worktrees.
- [x] `POST /experimental/worktree` - create worktree.
- [x] `DELETE /experimental/worktree` - remove worktree.
- [x] `POST /experimental/worktree/reset` - reset worktree.
- [x] `GET /experimental/session` - global session list.
- [x] `GET /experimental/resource` - MCP resources.

### Workspace Routes

- [x] `GET /experimental/workspace/adapter` - list workspace adapters.
- [x] `POST /experimental/workspace` - create workspace.
- [x] `GET /experimental/workspace` - list workspaces.
- [x] `GET /experimental/workspace/status` - workspace status.
- [x] `DELETE /experimental/workspace/:id` - remove workspace.
- [x] `POST /experimental/workspace/:id/session-restore` - restore session into workspace.

### Sync Routes

- [x] `POST /sync/start` - start workspace sync.
- [x] `POST /sync/replay` - replay sync events.
- [x] `POST /sync/history` - list sync event history.

### Session Routes

- [x] `GET /session` - list sessions.
- [x] `GET /session/status` - session status map.
- [x] `GET /session/:sessionID` - get session.
- [x] `GET /session/:sessionID/children` - get child sessions.
- [x] `GET /session/:sessionID/todo` - get session todos.
- [x] `POST /session` - create session.
- [x] `DELETE /session/:sessionID` - delete session.
- [x] `PATCH /session/:sessionID` - update session metadata.
- [x] `POST /session/:sessionID/init` - run project init command.
- [x] `POST /session/:sessionID/fork` - fork session.
- [x] `POST /session/:sessionID/abort` - abort session.
- [x] `POST /session/:sessionID/share` - share session.
- [x] `GET /session/:sessionID/diff` - session diff.
- [x] `DELETE /session/:sessionID/share` - unshare session.
- [x] `POST /session/:sessionID/summarize` - summarize session.
- [x] `GET /session/:sessionID/message` - list session messages.
- [x] `GET /session/:sessionID/message/:messageID` - get message.
- [x] `DELETE /session/:sessionID/message/:messageID` - delete message.
- [x] `DELETE /session/:sessionID/message/:messageID/part/:partID` - delete part.
- [x] `PATCH /session/:sessionID/message/:messageID/part/:partID` - update part.
- [x] `POST /session/:sessionID/message` - prompt with streaming response.
- [x] `POST /session/:sessionID/prompt_async` - async prompt.
- [x] `POST /session/:sessionID/command` - run command.
- [x] `POST /session/:sessionID/shell` - run shell command.
- [x] `POST /session/:sessionID/revert` - revert message.
- [x] `POST /session/:sessionID/unrevert` - restore reverted messages.
- [x] `POST /session/:sessionID/permissions/:permissionID` - deprecated permission response route.

### Event Routes

- [x] `GET /event` - SSE event stream via raw Effect HTTP.

### PTY Routes

- [x] `GET /pty` - list PTY sessions.
- [x] `POST /pty` - create PTY session.
- [x] `GET /pty/:ptyID` - get PTY session.
- [x] `PUT /pty/:ptyID` - update PTY session.
- [x] `DELETE /pty/:ptyID` - remove PTY session.
- [x] `GET /pty/:ptyID/connect` - PTY websocket; replace with raw Effect HTTP/websocket support.

### TUI Routes

- [x] `POST /tui/append-prompt` - append prompt.
- [x] `POST /tui/open-help` - open help.
- [x] `POST /tui/open-sessions` - open sessions.
- [x] `POST /tui/open-themes` - open themes.
- [x] `POST /tui/open-models` - open models.
- [x] `POST /tui/submit-prompt` - submit prompt.
- [x] `POST /tui/clear-prompt` - clear prompt.
- [x] `POST /tui/execute-command` - execute command.
- [x] `POST /tui/show-toast` - show toast.
- [x] `POST /tui/publish` - publish TUI event.
- [x] `POST /tui/select-session` - select session.
- [x] `GET /tui/control/next` - get next TUI request.
- [x] `POST /tui/control/response` - submit TUI control response.

## Remaining PR Plan

Prefer smaller PRs from here so route behavior and SDK/OpenAPI fallout stays reviewable.

1. [x] Bridge `PATCH /project/:projectID`.
2. [x] Bridge MCP add/connect/disconnect routes.
3. [x] Bridge MCP OAuth routes: start, callback, authenticate, remove.
4. [x] Bridge experimental console switch and tool list routes.
5. [x] Bridge experimental global session list.
6. [x] Bridge workspace create/remove/session-restore routes.
7. [x] Bridge sync start/replay/history routes.
8. [x] Bridge session read routes: list, status, get, children, todo, diff, messages.
9. [x] Bridge session lifecycle mutation routes: create, delete, update, fork, abort.
10. [x] Bridge remaining session mutation and prompt routes.
11. [ ] Replace event SSE with non-Hono Effect HTTP. The Effect backend has a raw Effect HTTP `httpapi/event.ts`; the Hono backend still uses `hono/streaming` `streamSSE`. Either port Hono `/event` to raw Effect HTTP for the fallback window, or skip and delete it together with Hono in step 15.
12. [x] Replace pty websocket/control routes with non-Hono Effect HTTP for the Effect backend. Hono `pty.ts` remains in the Hono backend.
13. [x] Replace tui bridge routes or explicitly isolate them behind a non-Hono compatibility layer for the Effect backend. Hono `tui.ts` remains in the Hono backend.
14. [ ] Switch OpenAPI/SDK generation to Effect routes and compare SDK output. Effect path is implemented and opt-in via `--httpapi` / `KILO_SDK_OPENAPI=httpapi`. Close the schema-shape gaps in `public.ts` (branded `pattern`, per-property `description`, `Event.*` / `SyncEvent.*` naming, dedup collisions), then flip `packages/sdk/js/script/build.ts` default.
15. [ ] Flip `backend.ts` default from `hono` to `effect-httpapi`, keep `KILO_EXPERIMENTAL_HTTPAPI` (or its inverse) as a short fallback flag, then delete replaced Hono route files.
>>>>>>> yunqiqiliang/opencode-v7.3.0

## Checklist

- [x] Add first `HttpApi` JSON route slices.
<<<<<<< HEAD
- [x] Bridge selected `HttpApi` routes into Hono behind `KILO_EXPERIMENTAL_HTTPAPI`.
- [x] Reuse existing Effect services in handlers.
- [x] Provide auth, instance lookup, and observability in the Effect route layer.
- [x] Attach auth middleware in route modules.
- [x] Support `auth_token` as a query security scheme.
- [x] Add bridge-level auth and instance tests.
- [x] Complete exact Hono route inventory.
- [x] Resolve implemented-but-unmounted route groups.
- [x] Port remaining top-level JSON reads.
- [ ] Generate SDK/OpenAPI from Effect routes.
- [ ] Flip ported JSON routes to default-on with fallback.
- [ ] Delete replaced Hono route implementations.
- [ ] Replace SSE/websocket/streaming Hono routes with non-Hono implementations.
||||||| 12f7967ca4
- [x] add one small spike that defines an `HttpApi` group for a simple JSON route set
- [x] use Effect Schema request / response types for that slice
- [x] keep the underlying service calls identical to the current handlers
- [x] compare generated OpenAPI against the current Hono/OpenAPI setup
- [x] document how auth, instance lookup, and error mapping would compose in the new stack
- [x] bridge Effect routes into Hono via `toWebHandler` with shared `memoMap`
- [x] gate behind `KILO_EXPERIMENTAL_HTTPAPI` flag
- [x] verify OTEL spans and HTTP logs flow to motel
- [x] bridge question, permission, and provider auth routes
- [x] port remaining provider endpoints (`GET /provider`, OAuth mutations)
- [x] port `config` providers read endpoint
- [x] port `project` read endpoints (`GET /project`, `GET /project/current`)
- [x] port `GET /config` full read endpoint
- [x] port `workspace` read endpoints
- [ ] port `file` JSON read endpoints
- [ ] decide when to remove the flag and make Effect routes the default

## Rule of thumb

Do not start with the hardest route file.

If `HttpApi` is adopted here, it should arrive after the handler body is already Effect-native and after the relevant request / response models have moved to Effect Schema.
=======
- [x] Bridge selected `HttpApi` routes behind `KILO_EXPERIMENTAL_HTTPAPI`. (Now backend-fork-at-startup rather than in-Hono path mounting.)
- [x] Reuse existing Effect services in handlers.
- [x] Provide auth, instance lookup, and observability in the Effect route layer.
- [x] Centralize auth via Effect `Config` for the Effect backend.
- [x] Support `auth_token` as a query security scheme.
- [x] Add bridge-level auth and instance tests.
- [x] Complete exact Hono route inventory.
- [x] Resolve implemented-but-unmounted route groups.
- [x] Port remaining top-level JSON reads.
- [x] Implement Effect `HttpApi` OpenAPI generation behind `--httpapi` / `KILO_SDK_OPENAPI=httpapi`.
- [ ] Close Effect-vs-Hono OpenAPI schema-shape gaps and flip the SDK generator default.
- [ ] Flip the runtime backend default from `hono` to `effect-httpapi`, with a short fallback flag.
- [ ] Delete replaced Hono route implementations.
- [ ] Replace SSE/websocket/streaming Hono routes with non-Hono implementations (or remove with the rest of Hono).
>>>>>>> yunqiqiliang/opencode-v7.3.0
