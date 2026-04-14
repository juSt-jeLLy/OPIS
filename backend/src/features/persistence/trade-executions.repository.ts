import { randomUUID } from "node:crypto";
import type { SupabaseRestClient } from "../../shared/clients/supabase/supabase-rest-client";
import type { TradeExecution } from "../trading/trading.types";
import type { PersistedTradeRow } from "./persistence.types";

const TABLE = "trades";

interface TradeRow extends PersistedTradeRow {
  id: string;
  created_at: string;
  updated_at: string;
}

const mapTrade = (row: TradeRow): TradeExecution => ({
  id: row.id,
  userId: row.user_id,
  actionId: row.action_id,
  tokenId: row.token_id,
  chain: row.chain,
  symbol: row.symbol,
  orderId: row.order_id,
  status: row.status,
  swapType: row.swap_type,
  inTokenAddress: row.in_token_address,
  outTokenAddress: row.out_token_address,
  inAmount: row.in_amount,
  outAmount: row.out_amount,
  txHash: row.tx_hash,
  txPriceUsd: row.tx_price_usd,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class TradeExecutionsRepository {
  public constructor(private readonly client: SupabaseRestClient) {}

  public async create(row: PersistedTradeRow): Promise<TradeExecution> {
    const now = new Date().toISOString();
    const records = await this.client.insert<TradeRow>(TABLE, [{ ...row, id: randomUUID(), created_at: now, updated_at: now }]);
    return mapTrade(records[0]);
  }

  public async updateByOrderId(
    orderId: string,
    patch: Partial<Pick<PersistedTradeRow, "status" | "out_amount" | "tx_hash" | "tx_price_usd" | "error_message" | "status_payload">>,
  ): Promise<TradeExecution | null> {
    const rows = await this.client.patch<TradeRow>(TABLE, { order_id: `eq.${orderId}` }, { ...patch, updated_at: new Date().toISOString() });
    return rows[0] ? mapTrade(rows[0]) : null;
  }

  public async listByUser(userId: string, limit: number): Promise<TradeExecution[]> {
    const rows = await this.client.select<TradeRow>(TABLE, {
      select: "id,user_id,action_id,token_id,chain,symbol,order_id,status,swap_type,in_token_address,out_token_address,in_amount,out_amount,tx_hash,tx_price_usd,error_message,created_at,updated_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
      limit: String(limit),
    });
    return rows.map(mapTrade);
  }
}

