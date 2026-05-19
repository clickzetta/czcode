import { rm } from "fs/promises"
<<<<<<< HEAD
import { Instance } from "../../src/project/instance"
import { Database } from "@/storage/db"
||||||| 12f7967ca4
import { Instance } from "../../src/project/instance"
import { Database } from "../../src/storage"
=======
import { Database } from "@/storage/db"
import { disposeAllInstances } from "./fixture"
>>>>>>> yunqiqiliang/opencode-v7.3.0

export async function resetDatabase() {
  await disposeAllInstances().catch(() => undefined)
  Database.close()
  await rm(Database.Path, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-wal`, { force: true }).catch(() => undefined)
  await rm(`${Database.Path}-shm`, { force: true }).catch(() => undefined)
}
