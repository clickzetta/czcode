import { Effect, Schema } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

const Package = Schema.Struct({ version: Schema.String })

// czcode_change start - check GitHub releases for czcode instead of npm
const GitHubRelease = Schema.Struct({ tag_name: Schema.String })

export function latest(http: HttpClient.HttpClient, path: string, channel: string) {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get("https://api.github.com/repos/clickzetta/czcode/releases/latest").pipe(
        HttpClientRequest.acceptJson,
      ),
    )
    const data = yield* HttpClientResponse.schemaBodyJson(GitHubRelease)(response)
    return data.tag_name.replace(/^v/, "")
  })
}
// czcode_change end
