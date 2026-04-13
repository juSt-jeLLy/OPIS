import { randomUUID } from "node:crypto";
import type { SupabaseRestClient } from "../../shared/clients/supabase/supabase-rest-client";
import type { CreateActionInput, TradeAction, TradeActionStatus } from "../trading/trading.types";

const TABLE = "trade_actions";

interface ActionRow {
  id: string;
  user_id: string;
  token_id: string;
  chain: TradeAction["chain"];
  symbol: string;
  action_type: TradeAction["actionType"];
  status: TradeActionStatus;
  reason: string;
  execution_mode: TradeAction["executionMode"];
  in_token_address: string;
  out_token_address: string;
  in_amount: string;
  assets_id?: string;
  priority: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const mapRow = (row: ActionRow): TradeAction => ({
  id: row.id,
  userId: row.user_id,
  tokenId: row.token_id,
  chain: row.chain,
  symbol: row.symbol,
  actionType: row.action_type,
  status: row.status,
  reason: row.reason,
  executionMode: row.execution_mode,
  inTokenAddress: row.in_token_address,
  outTokenAddress: row.out_token_address,
  inAmount: row.in_amount,
  assetsId: row.assets_id,
  priority: row.priority,
  metadata: row.metadata,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class TradeActionsRepository {
  public constructor(private readonly client: SupabaseRestClient) {}

  public async create(input: CreateActionInput): Promise<TradeAction> {
    const rows = await this.client.insert<ActionRow>(TABLE, [
      {
        id: randomUUID(),
        user_id: input.userId,
        token_id: input.tokenId,
        chain: input.chain,
        symbol: input.symbol,
        action_type: input.actionType,
        status: "pending",
        reason: input.reason,
        execution_mode: input.executionMode,
        in_token_address: input.inTokenAddress,
        out_token_address: input.outTokenAddress,
        in_amount: input.inAmount,
        assets_id: input.assetsId,
        priority: input.priority,
        metadata: input.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    return mapRow(rows[0]);
  }

  public async listByUser(userId: string, limit: number): Promise<TradeAction[]> {
    const rows = await this.client.select<ActionRow>(TABLE, {
      select: "id,user_id,token_id,chain,symbol,action_type,status,reason,execution_mode,in_token_address,out_token_address,in_amount,assets_id,priority,metadata,created_at,updated_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
      limit: String(limit),
    });
    return rows.map(mapRow);
  }

  public async findById(actionId: string): Promise<TradeAction | null> {
    const rows = await this.client.select<ActionRow>(TABLE, {
      select: "id,user_id,token_id,chain,symbol,action_type,status,reason,execution_mode,in_token_address,out_token_address,in_amount,assets_id,priority,metadata,created_at,updated_at",
      id: `eq.${actionId}`,
      limit: "1",
    });
    return rows[0] ? mapRow(rows[0]) : null;
  }

  public async updateStatus(actionId: string, status: TradeActionStatus, metadata?: Record<string, unknown>): Promise<TradeAction | null> {
    const rows = await this.client.patch<ActionRow>(
      TABLE,
      { id: `eq.${actionId}` },
      { status, metadata, updated_at: new Date().toISOString() },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
