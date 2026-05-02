// czcode_change - new file
// Shared Lakehouse connection state — written by the plugin at init time,
// read by the TUI to display connection status without an extra SQL call.

export type LakehouseStatus =
  | { state: "unconfigured" }
  | { state: "connecting" }
  | { state: "connected"; workspace: string; schema: string; vcluster: string }
  | { state: "failed"; error: string }

let _status: LakehouseStatus = { state: "unconfigured" }
const _listeners: Array<(s: LakehouseStatus) => void> = []

export function getLakehouseStatus(): LakehouseStatus {
  return _status
}

export function setLakehouseStatus(status: LakehouseStatus): void {
  _status = status
  for (const fn of _listeners) fn(status)
}

export function onLakehouseStatusChange(fn: (s: LakehouseStatus) => void): () => void {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
