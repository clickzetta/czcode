import { EventEmitter } from "events"
import { Identifier } from "@/id/id"

export type GlobalEvent = {
  directory?: string
  project?: string
  workspace?: string
  payload: any
}

class GlobalBusEmitter extends EventEmitter<{
  event: [GlobalEvent]
}> {
  // czcode_change start - keep a fully generic signature so the override stays
  // assignable to EventEmitter<T>.emit under packages/tui's @types/node (opencode
  // compiles with types:[] and never surfaces this). Narrow to "event" in the body.
  override emit<K>(eventName: K, ...args: K extends "event" ? [GlobalEvent] : any[]): boolean {
    if (eventName === "event") {
      const event = args[0] as GlobalEvent
      if (event.payload && typeof event.payload === "object" && !("id" in event.payload)) {
        event.payload.id = event.payload.syncEvent?.id ?? Identifier.create("evt", "ascending")
      }
    }
    return super.emit(eventName as "event", ...(args as [GlobalEvent]))
  }
  // czcode_change end
}

export const GlobalBus = new GlobalBusEmitter()
GlobalBus.setMaxListeners(50) // kilocode_change — surface warning if SSE listeners accumulate
