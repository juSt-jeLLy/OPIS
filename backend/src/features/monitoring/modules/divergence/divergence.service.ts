import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { AddressTx, KlinePoint, LiquidityTx, SmartWalletInfo } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, mean, toNumber } from "../../../../shared/utils/number.utils";
import { hoursAgo } from "../../../../shared/utils/time.utils";
import { isBuyTx, isSellTx } from "../module-utils";
import type { ModuleResult } from "../../monitoring.types";
import type { DivergenceInput } from "./divergence.types";

const SMART_WALLET_SAMPLE = 1;

const isRemoveLiquidity = (tx: LiquidityTx): boolean => (tx.type ?? "").toLowerCase().includes("remove");
const klineClose = (point: KlinePoint): number => toNumber(point.close);
const txUsd = (tx: LiquidityTx): number => {
  const direct = toNumber(tx.amount_usd);
  if (direct > 0) {
    return direct;
  }

  const fromUsd = toNumber(tx.from_amount) * Math.max(1, toNumber(tx.from_price_usd));
  const toUsd = toNumber(tx.to_amount) * Math.max(1, toNumber(tx.to_price_usd));
  return Math.max(fromUsd, toUsd);
};

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score >= 75) {
    return "critical";
  }

  if (score >= 60) {
    return "high";
  }

  if (score >= 40) {
    return "warning";
  }

  return "info";
};

const computePriceMomentum = (klines: KlinePoint[]): number => {
  const closes = klines.map(klineClose).filter((value) => value > 0);
  if (closes.length < 2) {
    return 0;
  }

  const lookback = closes[Math.max(0, closes.length - 24)];
  const latest = closes[closes.length - 1];
  return ((latest - lookback) / Math.max(lookback, 1e-9)) * 100;
};

const smartWalletSellPressure = async (
  client: AveDataClient,
  input: DivergenceInput,
  wallets: SmartWalletInfo[],
): Promise<number> => {
  const tasks = wallets.slice(0, SMART_WALLET_SAMPLE).map(async (wallet) => {
    const txs = await client.getAddressTx({
      walletAddress: wallet.wallet_address,
      chain: input.chain,
      tokenAddress: input.tokenAddress,
      fromTime: hoursAgo(24),
      pageSize: 50,
    });
    const buys = txs.filter((tx) => isBuyTx(tx, input.tokenAddress)).length;
    const sells = txs.filter((tx) => isSellTx(tx, input.tokenAddress)).length;
    return sells / Math.max(buys + sells, 1);
  });
  const settled = await Promise.allSettled(tasks);
  const values = settled
    .filter((result): result is PromiseFulfilledResult<number> => result.status === "fulfilled")
    .map((result) => result.value);
  return values.length > 0 ? mean(values) : 0;
};

const liquidityRemovalPressure = async (client: AveDataClient, pairId: string | undefined): Promise<number> => {
  if (!pairId) {
    return 0;
  }

  const txs = await client.getLiquidityTxs({ pairId, fromTime: hoursAgo(24), pageSize: 80 });
  const removedUsd = txs.filter(isRemoveLiquidity).reduce((sum, tx) => sum + txUsd(tx), 0);
  const addedUsd = txs.filter((tx) => !isRemoveLiquidity(tx)).reduce((sum, tx) => sum + txUsd(tx), 0);
  return removedUsd / Math.max(removedUsd + addedUsd, 1);
};

export class DivergenceModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: DivergenceInput): Promise<ModuleResult> {
    const [klines, wallets] = await Promise.all([
      this.client.getTokenKlines(input.tokenId, 60),
      this.client.getSmartWallets({ chain: input.chain, pageSize: 30 }),
    ]);
    const priceMomentumPct = computePriceMomentum(klines);
    if (priceMomentumPct <= 0) {
      return { score: 0, severity: "info", summary: "No bullish price leg detected for divergence scan.", metrics: [] };
    }

    const [sellPressure, lpRemovalRatio] = await Promise.all([
      smartWalletSellPressure(this.client, input, wallets),
      liquidityRemovalPressure(this.client, input.pairId),
    ]);
    const momentumFactor = clamp((priceMomentumPct - 1.5) / 22, 0, 1);
    const internalStress = clamp(sellPressure * 0.6 + lpRemovalRatio * 0.4, 0, 1);
    const score = clamp(momentumFactor * internalStress * 130, 0, 100);

    return {
      score: Number(score.toFixed(2)),
      severity: toSeverity(score),
      summary: `Price +${priceMomentumPct.toFixed(2)}% while smart sell pressure ${(sellPressure * 100).toFixed(2)}% and LP removal ${(lpRemovalRatio * 100).toFixed(2)}%.`,
      metrics: [
        { label: "Price 24h", value: `+${priceMomentumPct.toFixed(2)}%` },
        { label: "Smart Sell Pressure", value: `${(sellPressure * 100).toFixed(2)}%` },
        { label: "LP Remove Ratio", value: `${(lpRemovalRatio * 100).toFixed(2)}%` },
        { label: "Divergence Stress", value: `${(internalStress * 100).toFixed(2)}%` },
      ],
    };
  }
}
