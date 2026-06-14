// kilocode_change new file
import { RGBA } from "@opentui/core"
import { For, type JSX } from "solid-js"

// czcode_change start - ClickZetta CLI logo
const ASCII_LOGO = [
  "         C l i c k Z e t t a",
  "   A I - P o w e r e d   L a k e h o u s e",
]
// czcode_change end

export function KiloLogo() {
  const yellow = RGBA.fromHex("#F8F675")

  return (
    <box>
      <For each={ASCII_LOGO}>
        {(line) => (
          <box flexDirection="row">
            <text fg={yellow} selectable={false}>
              {line}
            </text>
          </box>
        )}
      </For>
    </box>
  )
}
