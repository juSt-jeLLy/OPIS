import type { SupabaseRestClient } from "../../shared/clients/supabase/supabase-rest-client";
import type { Logger } from "../../shared/logger/logger";
import type { WatchlistToken } from "../monitoring/monitoring.types";
import type { PersistedWatchlistRow } from "./persistence.types";

const TABLE = "user_watchlist";

const rowToToken = (row: PersistedWatchlistRow): WatchlistToken => {
  return {
    tokenId: row.token_id,
    chain: row.chain,
    tokenAddress: row.token_address,
    symbol: row.symbol,
    name: row.name,
    mainPair: row.main_pair,
    mainPairTvl: row.main_pair_tvl,
    executionMode: row.execution_mode,
    assetsId: row.assets_id,
    buyAmountAtomic: row.buy_amount_atomic,
    sellAmountAtomic: row.sell_amount_atomic,
  };
};

const tokenToRow = (userId: string, token: WatchlistToken): PersistedWatchlistRow => ({
  user_id: userId,
  token_id: token.tokenId,
  chain: token.chain,
  token_address: token.tokenAddress,
  symbol: token.symbol,
  name: token.name,
  main_pair: token.mainPair,
  main_pair_tvl: token.mainPairTvl,
  execution_mode: token.executionMode ?? "trade",
  assets_id: token.assetsId,
  buy_amount_atomic: token.buyAmountAtomic,
  sell_amount_atomic: token.sellAmountAtomic,
});

export class WatchlistPersistenceRepository {
  public constructor(private readonly client: SupabaseRestClient, private readonly logger: Logger) {}

  public async loadUserWatchlist(userId: string): Promise<WatchlistToken[]> {
    try {
      const rows = await this.client.select<PersistedWatchlistRow>(TABLE, {
        select: "user_id,token_id,chain,token_address,symbol,name,main_pair,main_pair_tvl,execution_mode,assets_id,buy_amount_atomic,sell_amount_atomic",
        user_id: `eq.${userId}`,
        order: "symbol.asc",
      });
      return rows.map(rowToToken);
    } catch (error) {
      this.logger.error("Unable to load user watchlist from Supabase", { userId, error: String(error) });
      return [];
    }
  }

  public async replaceUserWatchlist(userId: string, tokens: WatchlistToken[]): Promise<void> {
    await this.client.delete(TABLE, { user_id: `eq.${userId}` });
    if (tokens.length === 0) {
      return;
    }

    await this.client.insert(TABLE, tokens.map((token) => tokenToRow(userId, token)));
  }
}

