import type { MiddlewareHandler } from "hono"
import { Instance } from "@/project/instance"
<<<<<<< HEAD
import { InstanceBootstrap } from "@/project/bootstrap"
import { AppRuntime } from "@/effect/app-runtime"
||||||| 12f7967ca4
import { InstanceBootstrap } from "@/project/bootstrap"
import { AppRuntime } from "@/effect/app-runtime"
import { AppFileSystem } from "@opencode-ai/shared/filesystem"
=======
import { getBootstrapRunEffect } from "@/effect/app-runtime"
>>>>>>> yunqiqiliang/opencode-v7.3.0
import { AppFileSystem } from "@opencode-ai/core/filesystem"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { WorkspaceID } from "@/control-plane/schema"

export function InstanceMiddleware(workspaceID?: WorkspaceID): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.query("directory") || c.req.header("x-kilo-directory") || process.cwd()
    const directory = AppFileSystem.resolve(
      (() => {
        try {
          return decodeURIComponent(raw)
        } catch {
          return raw
        }
      })(),
    )

    return WorkspaceContext.provide({
      workspaceID,
      async fn() {
        return Instance.provide({
          directory,
          init: await getBootstrapRunEffect(),
          async fn() {
            return next()
          },
        })
      },
    })
  }
}
