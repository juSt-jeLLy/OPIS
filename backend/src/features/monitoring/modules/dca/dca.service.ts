import { MAX_SMART_WALLETS_FOR_CONVICTION_SCAN, MODULE_THRESHOLDS } from "../../monitoring.constants";
import type { ModuleResult } from "../../monitoring.types";
import type { AveDataClient } from "../../../../shared/clients/ave/ave-client";
import type { AddressTx, SmartWalletInfo } from "../../../../shared/clients/ave/ave-client.types";
import { clamp, mean, standardDeviation, toNumber } from "../../../../shared/utils/number.utils";
import { toUnixSeconds } from "../../../../shared/utils/time.utils";
import { isBuyTx, isSellTx } from "../module-utils";
import type { DcaInput, WalletDcaProfile } from "./dca.types";

const getBuys = (txs: AddressTx[], tokenAddress: string): AddressTx[] => txs.filter((tx) => isBuyTx(tx, tokenAddress));
const getSells = (txs: AddressTx[], tokenAddress: string): AddressTx[] => txs.filter((tx) => isSellTx(tx, tokenAddress));

const scoreWallet = (txs: AddressTx[], tokenAddress: string): WalletDcaProfile => {
  const buys = getBuys(txs, tokenAddress).sort((a, b) => toUnixSeconds(a.time) - toUnixSeconds(b.time));
  const walletAddress = txs[0]?.wallet_address ?? "unknown";
  if (buys.length < 2) {
    return { walletAddress, score: 0, buyCount: buys.length, averageIntervalMinutes: 0, dipBuysRatio: 0 };
  }

  const prices = buys.map((tx) => toNumber(tx.from_price_usd)).filter((price) => price > 0);
  const intervals = buys.slice(1).map((buy, index) => (toUnixSeconds(buy.time) - toUnixSeconds(buys[index].time)) / 60).filter((value) => value > 0);
  const dipBuys = prices.slice(1).filter((price, index) => price <= prices[index] * 0.98).length;
  const dipRatio = prices.length > 1 ? dipBuys / (prices.length - 1) : 0;
  const avgInterval = mean(intervals);
  const cadenceVariation = intervals.length > 1 ? standardDeviation(intervals) / Math.max(avgInterval, 1) : 0;
  const freqScore = Math.min(buys.length / 6, 1) * 30;
  const dipScore = dipRatio * 35;
  const cadenceScore = (1 - clamp(cadenceVariation, 0, 1)) * 20;
  const netAccumScore = getSells(txs, tokenAddress).length < buys.length ? 15 : 0;

  return {
    walletAddress,
    score: clamp(freqScore + dipScore + cadenceScore + netAccumScore, 0, 100),
    buyCount: buys.length,
    averageIntervalMinutes: avgInterval,
    dipBuysRatio: dipRatio,
  };
};

const toSeverity = (score: number): ModuleResult["severity"] => {
  if (score >= MODULE_THRESHOLDS.dcaOpportunityScore + 20) {
    return "opportunity";
  }

  if (score >= MODULE_THRESHOLDS.dcaOpportunityScore) {
    return "high";
  }

  if (score >= 40) {
    return "warning";
  }

  return "info";
};

export class DcaModuleService {
  public constructor(private readonly client: AveDataClient) {}

  public async evaluate(input: DcaInput): Promise<ModuleResult> {
    const wallets = await this.client.getSmartWallets({ chain: input.chain, pageSize: 50 });
    const sampleWallets = wallets.slice(0, MAX_SMART_WALLETS_FOR_CONVICTION_SCAN);
    const profiles = await this.buildProfiles(input, sampleWallets);
    const active = profiles.filter((profile) => profile.score >= 20);
    if (active.length === 0) {
      return { score: 0, severity: "info", summary: "No strong DCA accumulation detected yet.", metrics: [] };
    }

    const averageScore = mean(active.map((profile) => profile.score));
    const countFactor = Math.min(active.length / 8, 1) * 25;
    const score = clamp(averageScore * 0.75 + countFactor, 0, 100);

    return {
      score: Number(score.toFixed(2)),
      severity: toSeverity(score),
      summary: `${active.length} smart wallets are accumulating with DCA-like cadence.`,
      metrics: [
        { label: "DCA Wallets", value: active.length },
        { label: "Average Wallet Score", value: averageScore.toFixed(2) },
        { label: "Average Dip Buy Ratio", value: `${(mean(active.map((profile) => profile.dipBuysRatio)) * 100).toFixed(2)}%` },
      ],
    };
  }

  private async buildProfiles(input: DcaInput, wallets: SmartWalletInfo[]): Promise<WalletDcaProfile[]> {
    const tasks = wallets.map(async (wallet) => {
      const txs = await this.client.getAddressTx({
        walletAddress: wallet.wallet_address,
        chain: input.chain,
        tokenAddress: input.tokenAddress,
        pageSize: 120,
      });
      return scoreWallet(txs, input.tokenAddress);
    });

    const settled = await Promise.allSettled(tasks);
    return settled
      .filter((result): result is PromiseFulfilledResult<WalletDcaProfile> => result.status === "fulfilled")
      .map((result) => result.value);
  }
}
