// czcode_change - new file

import { useKeyboard } from "@opentui/solid"
import { useRoute } from "@tui/context/route"
import { Toast } from "@tui/ui/toast"
import { SingClawChat } from "./chat"
import { SingClawSidebar } from "./sidebar"
import { createSingClawChat } from "./hooks"

export function SingClawView(props: { context?: string; returnTo?: { type: string; sessionID?: string } }) {
  const route = useRoute()
  const chat = createSingClawChat(props.context)

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      if (props.returnTo?.type === "session" && props.returnTo.sessionID) {
        route.navigate({ type: "session", sessionID: props.returnTo.sessionID })
      } else {
        route.navigate({ type: "home" })
      }
      evt.preventDefault()
      evt.stopPropagation()
    }
  })

  return (
    <box flexDirection="row" flexGrow={1} paddingLeft={2} gap={1}>
      <box flexGrow={1} flexDirection="column">
        <SingClawChat
          messages={chat.messages()}
          connected={chat.connected()}
          loading={chat.loading()}
          error={chat.error()}
          onSend={chat.send}
        />
        <Toast />
      </box>
      <SingClawSidebar connected={chat.connected()} />
    </box>
  )
}
