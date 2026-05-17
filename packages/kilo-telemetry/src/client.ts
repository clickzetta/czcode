import { PostHog } from "posthog-node"
import { Identity } from "./identity.js"
import { TelemetryEvent } from "./events.js"

// czcode_change start - use czcode PostHog project
const POSTHOG_API_KEY = "phc_zCZMj4UjG5uAgoKAFuD3mq3nMZCVVgdndbEkV7ThWzg4"
const POSTHOG_HOST = "https://us.i.posthog.com"
// czcode_change end

export namespace Client {
  let client: PostHog | null = null
  let enabled = true

  export function init() {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      disableGeoip: false,
      flushAt: 1, // czcode_change — send each event immediately, don't wait for batch
      flushInterval: 0, // czcode_change — disable timer-based flushing
    })
  }

  export function getClient(): PostHog | null {
    return client
  }

  export function setEnabled(value: boolean) {
    enabled = value
    if (!client) return
    if (value) client.optIn()
    else client.optOut()
  }

  export function isEnabled(): boolean {
    return enabled && client !== null
  }

  export function capture(event: TelemetryEvent, properties?: Record<string, unknown>) {
    if (!enabled || !client) return

    const distinctId = Identity.getDistinctId()
    const orgId = Identity.getOrganizationId()

    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        ...(orgId && { kilocodeOrganizationId: orgId }),
      },
    })
  }

  export function identify(distinctId: string, properties?: Record<string, unknown>) {
    if (!enabled || !client) return

    client.capture({
      distinctId,
      event: "$identify",
      properties: {
        $set: properties,
      },
    })
  }

  export function alias(distinctId: string, aliasId: string) {
    if (!enabled || !client) return

    client.alias({
      distinctId,
      alias: aliasId,
    })
  }

  export async function shutdown(): Promise<void> {
    if (client) {
      // Flush any pending events before shutdown
      await client.flush()
      await client.shutdown()
      client = null
    }
  }
}
