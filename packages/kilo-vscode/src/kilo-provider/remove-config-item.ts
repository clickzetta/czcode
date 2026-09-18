import type * as vscode from "vscode"
import type { KiloConnectionService } from "../services/cli-backend"
import { removeMarketplaceItemFromAllScopes, type MarketplaceRemoveContext } from "../services/marketplace/actions"
import type { MarketplaceService } from "../services/marketplace"
import type { MarketplaceItemRef } from "../services/marketplace/types"

export interface RemoveConfigItemContext {
  connection: KiloConnectionService
  marketplace: MarketplaceService
  project: () => string | undefined
  directory: () => string
  refresh: () => Promise<void>
  storage?: vscode.Uri
}

export async function removeMcp(ctx: RemoveConfigItemContext, name: string): Promise<boolean> {
  return remove(ctx, { id: name, type: "mcp" })
}

async function remove(ctx: RemoveConfigItemContext, item: MarketplaceItemRef): Promise<boolean> {
  const actions: MarketplaceRemoveContext = {
    connection: ctx.connection,
    storage: ctx.storage,
    remove: async (item, scope, project) => {
      const client = await ctx.connection.getClientAsync(ctx.directory())
      if (!client) {
        return { success: false, slug: item.id, error: "Failed to get Kilo client" }
      }
      return ctx.marketplace.remove(client, item, scope, ctx.directory())
    },
  }
  const removed = await removeMarketplaceItemFromAllScopes(actions, item, ctx.project(), ctx.directory())
  if (removed) await ctx.refresh()
  return removed
}
