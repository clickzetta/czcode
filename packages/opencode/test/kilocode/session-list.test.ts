import { afterEach, describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { ProjectTable } from "../../src/project/project.sql"
import { ProjectID } from "../../src/project/schema"
<<<<<<< HEAD
||||||| 12f7967ca4
import { Session } from "../../src/session"
=======
import { AppRuntime } from "../../src/effect/app-runtime"
>>>>>>> yunqiqiliang/opencode-v7.3.0
import { Session } from "../../src/session/session"
import { SessionTable } from "../../src/session/session.sql"
import { Database, eq } from "../../src/storage/db"
import * as Log from "@opencode-ai/core/util/log"
<<<<<<< HEAD
import { tmpdir } from "../fixture/fixture"
||||||| 12f7967ca4
import { Database, eq } from "../../src/storage"
import { Log } from "../../src/util"
import { tmpdir } from "../fixture/fixture"
=======
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
>>>>>>> yunqiqiliang/opencode-v7.3.0

Log.init({ print: false })

afterEach(async () => {
  await disposeAllInstances()
})

describe("Kilo Session.list", () => {
  test("includes directory matches from legacy project ids", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const session = await Session.create({ title: "legacy-session" })
        const project = ProjectID.make("legacy-project")
        Database.use((db) => {
          db.insert(ProjectTable)
            .values({
              id: project,
              worktree: tmp.path,
              vcs: "git",
              time_created: Date.now(),
              time_updated: Date.now(),
              sandboxes: [],
            })
            .run()
          db.update(SessionTable).set({ project_id: project }).where(eq(SessionTable.id, session.id)).run()
        })

        const sessions = await AppRuntime.runPromise(Session.Service.use((svc) => svc.list({ directory: tmp.path })))
        const ids = sessions.map((item) => item.id)

        expect(ids).toContain(session.id)
      },
    })
  })
})
