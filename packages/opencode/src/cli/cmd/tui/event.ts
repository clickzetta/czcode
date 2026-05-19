import { BusEvent } from "@/bus/bus-event"
import { SessionID } from "@/session/schema"
<<<<<<< HEAD
||||||| 12f7967ca4
import { Schema } from "effect"
=======
import { PositiveInt } from "@/util/schema"
>>>>>>> yunqiqiliang/opencode-v7.3.0
import { Effect, Schema } from "effect"

const DEFAULT_TOAST_DURATION = 5000

export const TuiEvent = {
  PromptAppend: BusEvent.define("tui.prompt.append", Schema.Struct({ text: Schema.String })),
  CommandExecute: BusEvent.define(
    "tui.command.execute",
    Schema.Struct({
      command: Schema.Union([
        Schema.Literals([
          "session.list",
          "session.new",
          "session.share",
          "session.interrupt",
          "session.compact",
          "session.page.up",
          "session.page.down",
          "session.line.up",
          "session.line.down",
          "session.half.page.up",
          "session.half.page.down",
          "session.first",
          "session.last",
          "prompt.clear",
          "prompt.submit",
          "agent.cycle",
        ]),
        Schema.String,
      ]),
    }),
  ),
  ToastShow: BusEvent.define(
    "tui.toast.show",
    Schema.Struct({
      title: Schema.optional(Schema.String),
      message: Schema.String,
      variant: Schema.Literals(["info", "success", "warning", "error"]),
<<<<<<< HEAD
      duration: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_TOAST_DURATION))).annotate({
||||||| 12f7967ca4
      duration: Schema.optional(Schema.Number).annotate({ description: "Duration in milliseconds" }),
=======
      duration: PositiveInt.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_TOAST_DURATION))).annotate({
>>>>>>> yunqiqiliang/opencode-v7.3.0
        description: "Duration in milliseconds",
      }),
    }),
  ),
  SessionSelect: BusEvent.define(
    "tui.session.select",
    Schema.Struct({
      sessionID: SessionID.annotate({ description: "Session ID to navigate to" }),
    }),
  ),
}
