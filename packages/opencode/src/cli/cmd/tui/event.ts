import { BusEvent } from "@/bus/bus-event"
import { SessionID } from "@/session/schema"
      duration: PositiveInt.pipe(Schema.withDecodingDefault(Effect.succeed(DEFAULT_TOAST_DURATION))).annotate({
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
