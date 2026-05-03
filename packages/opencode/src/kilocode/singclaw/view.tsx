// czcode_change - new file

import { useKeyboard } from "@opentui/solid"
import { useRoute } from "@tui/context/route"
import { useCommandDialog } from "@tui/component/dialog-command"
import { Toast } from "@tui/ui/toast"
import { SingClawChat } from "./chat"
import { SingClawSidebar } from "./sidebar"
import { createSingClawChat } from "./hooks"

export function SingClawView() {
  const route = useRoute()
  const command = useCommandDialog()
  const chat = createSingClawChat()

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      route.back()
      evt.preventDefault()
      evt.stopPropagation()
    }
  })

  command.register(() => [
    {
      value: "singclaw.back",
      title: "返回",
      category: "SingClaw",
      hidden: true,
      keybind: "escape" as any,
      onSelect: () => route.back(),
    },
  ])

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
      <SingClawSidebar />
    </box>
  )
}
