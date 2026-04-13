import { MAX_SMART_WALLETS_FOR_CONVICTION_SCAN, MODULE_THRESHOLDS } from "../../monitoring.constants";
import type { ModuleResult } from "../../monitoring.types";
import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { AddressTx, KlinePoint, SmartWalletInfo } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, mean, standardDeviation, toNumber } from "../../../../shared/utils/number.utils";
import { nowInSeconds, toUnixSeconds } from "../../../../shared/utils/time.utils";
import { isBuyTx, isSellTx, txUsdValue } from "../module-utils";
import type { ConvictionInput, WalletConviction } from "./conviction.types";

const parseBuys = (txs: AddressTx[], tokenAddress: string): AddressTx[] => txs.filter((tx) => isBuyTx(tx, tokenAddress));
const parseSells = (txs: AddressTx[], tokenAddress: string): AddressTx[] => txs.filter((tx) => isSellTx(tx, tokenAddress));

const holdHours = (buys: AddressTx[], sells: AddressTx[]): number => {
  const firstBuy = Math.min(...buys.map((tx) => toUnixSeconds(tx.time)).filter(Boolean));
  const lastSell = Math.max(...sells.map((tx) => toUnixSeconds(tx.time)).filter(Boolean), 0);
  if (!firstBuy) {
    return 0;
  }

  const endTime = lastSell > 0 ? lastSell : nowInSeconds();
  return Math.max(0, (endTime - firstBuy) / 3600);
};

const heldThroughDrawdown = (buys: AddressTx[], klines: KlinePoint[]): boolean => {
  const buyPrices = buys.map((tx) => toNumber(tx.from_price_usd)).filter((value) => value > 0);
  if (buyPrices.length === 0 || klines.length === 0) {
    return false;
  }

  const avgBuy = mean(buyPrices);
  const lowest = Math.min(...klines.map((point) => toNumber(point.low, avgBuy)));
  return (avgBuy - lowest) / avgBuy >= 0.3;
};

const walletScore = (txs: AddressTx[], walletBalanceUsd: number, klines: KlinePoint[], tokenAddress: string): { score: number; buyCount: number; hold: number } => {
  const buys = parseBuys(txs, tokenAddress);
  const sells = parseSells(txs, tokenAddress);
  if (buys.length === 0) {
    return { score: 0, buyCount: 0, hold: 0 };
  }

  const freqScore = Math.min(buys.length / 5, 1) * 25;
  const buyUsdValues = buys.map((tx) => txUsdValue(tx));
  const avgBuyUsd = mean(buyUsdValues);
  const sizeRatio = clamp(avgBuyUsd / Math.max(walletBalanceUsd, 1), 0, 1);
  const hold = holdHours(buys, sells);
  const holdScore = Math.min(hold / 48, 1) * 15 + (heldThroughDrawdown(buys, klines) ? 10 : 0);
  const priceVariance = standardDeviation(buys.map((tx) => toNumber(tx.from_price_usd))) / Math.max(mean(buys.map((tx) => toNumber(tx.from_price_usd))), 1e-9);
  const dcaScore = Math.min(priceVariance * 100, 25);

  return { score: freqScore + sizeRatio * 25 + holdScore + dcaScore, buyCount: buys.length, hold };
};

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score > MODULE_THRESHOLDS.convictionHighScore) {
    return "opportunity";
  }

  if (score > MODULE_THRESHOLDS.convictionOpportunityScore) {
    return "high";
  }

  return "info";
};

export class ConvictionModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: ConvictionInput): Promise<ModuleResult> {
    const smartWallets = await this.client.getSmartWallets({ chain: input.chain, pageSize: 50 });
    if (smartWallets.length === 0) {
      return { score: 0, severity: "info", summary: "No smart wallets found for this chain.", metrics: [] };
    }

    const klines = await this.client.getTokenKlines(input.tokenId, 120);
    const samples = await this.buildWalletSamples(input, smartWallets.slice(0, MAX_SMART_WALLETS_FOR_CONVICTION_SCAN), klines);
    const meaningful = samples.filter((item) => item.score > 20);
    if (meaningful.length === 0) {
      return { score: 0, severity: "info", summary: "Smart wallets are not showing conviction yet.", metrics: [] };
    }

    const average = mean(meaningful.map((item) => item.score));
    const walletCountFactor = Math.min(meaningful.length / 10, 1);
    const stackScore = clamp(average * 0.6 + walletCountFactor * 100 * 0.4, 0, 100);

    return {
      score: Number(stackScore.toFixed(2)),
      severity: toSeverity(stackScore),
      summary: `${meaningful.length} smart wallets show conviction alignment on this token.`,
      metrics: [
        { label: "Wallets In Stack", value: meaningful.length },
        { label: "Average Conviction", value: average.toFixed(2) },
        { label: "Top Wallet Score", value: Math.max(...meaningful.map((item) => item.score)).toFixed(2) },
      ],
    };
  }

  private async buildWalletSamples(
    input: ConvictionInput,
    wallets: SmartWalletInfo[],
    klines: KlinePoint[],
  ): Promise<WalletConviction[]> {
    const tasks = wallets.map(async (wallet) => {
      const [pnl, txs] = await Promise.all([
        this.client.getAddressPnl({ walletAddress: wallet.wallet_address, chain: input.chain, tokenAddress: input.tokenAddress }),
        this.client.getAddressTx({ walletAddress: wallet.wallet_address, chain: input.chain, tokenAddress: input.tokenAddress, pageSize: 100 }),
      ]);
      const result = walletScore(txs, toNumber(pnl.main_coin_balance_usd, 1), klines, input.tokenAddress);
      return { walletAddress: wallet.wallet_address, score: result.score, buyCount: result.buyCount, holdHours: result.hold };
    });

    const settled = await Promise.allSettled(tasks);
    return settled
      .filter((result): result is PromiseFulfilledResult<WalletConviction> => result.status === "fulfilled")
      .map((result) => result.value);
  }
}
