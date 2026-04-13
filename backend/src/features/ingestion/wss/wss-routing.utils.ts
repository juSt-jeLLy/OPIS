import { SUPPORTED_CHAINS, type SupportedChain } from "../../../shared/constants/chains.constants";
import type { WatchlistToken } from "../../monitoring/monitoring.types";

export type WssTopic = "liq" | "tx" | "multi_tx";

export interface WssSubscriptionTarget {
  key: string;
  topic: WssTopic;
  identifier: string;
  chain: SupportedChain;
  token: WatchlistToken;
}

const normalizeText = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const txPayload = (payload: Record<string, unknown>): Record<string, unknown> | null => {
  return asRecord(payload.tx) ?? asRecord(payload.result);
};

export const normalizeAddress = (value: unknown): string | undefined => {
  const text = normalizeText(value).toLowerCase();
  return text.length > 0 ? text : undefined;
};

export const parseSupportedChain = (value: unknown): SupportedChain | undefined => {
  const chain = normalizeText(value).toLowerCase();
  return SUPPORTED_CHAINS.find((candidate) => candidate === chain);
};

export const watchlistTokenKey = (token: WatchlistToken): string => `${token.chain}:${token.tokenId}`;
export const wssSubscriptionKey = (topic: WssTopic, identifier: string, chain: SupportedChain): string =>
  `${topic}:${chain}:${identifier}`;

export const buildSubscriptionTargets = (token: WatchlistToken): WssSubscriptionTarget[] => {
  const targets: WssSubscriptionTarget[] = [];
  const normalizedPair = normalizeAddress(token.mainPair);
  const normalizedTokenAddress = normalizeAddress(token.tokenAddress);

  if (normalizedPair) {
    targets.push(
      {
        key: wssSubscriptionKey("liq", normalizedPair, token.chain),
        topic: "liq",
        identifier: normalizedPair,
        chain: token.chain,
        token,
      },
      {
        key: wssSubscriptionKey("tx", normalizedPair, token.chain),
        topic: "tx",
        identifier: normalizedPair,
        chain: token.chain,
        token,
      },
    );
  }

  if (normalizedTokenAddress) {
    targets.push({
      key: wssSubscriptionKey("multi_tx", normalizedTokenAddress, token.chain),
      topic: "multi_tx",
      identifier: normalizedTokenAddress,
      chain: token.chain,
      token,
    });
  }

  return targets;
};

export const eventPairAddress = (payload: Record<string, unknown>): string | undefined => {
  const nested = txPayload(payload);
  return normalizeAddress(
    payload.pair_address ??
      payload.pair ??
      payload.main_pair ??
      payload.pairAddress ??
      nested?.pair_address ??
      nested?.pair ??
      nested?.main_pair,
  );
};

export const eventTokenAddress = (payload: Record<string, unknown>): string | undefined => {
  const nested = txPayload(payload);
  return normalizeAddress(
    payload.token_address ??
      payload.token ??
      payload.tokenAddress ??
      payload.contract_address ??
      nested?.token_address ??
      nested?.token ??
      nested?.target_token ??
      nested?.to_address ??
      nested?.from_address,
  );
};

export const eventChain = (payload: Record<string, unknown>): SupportedChain | undefined => {
  const nested = txPayload(payload);
  return parseSupportedChain(payload.chain ?? nested?.chain);
};
