import { getOrCreateUserId } from "@/shared/user/user-id";
import type {
  CreateDelegateWalletResponse,
  GetDelegateWalletResponse,
  SignalExecuteRequest,
  TradingActionsResponse,
  TradingTradesResponse,
} from "./trading.types";

const TRADING_API_BASE = import.meta.env.VITE_TRADING_API_URL ?? "http://localhost:4090/api/trading";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${TRADING_API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-opis-user-id": getOrCreateUserId(),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Trading API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const tradingApi = {
  listActions: (limit = 60): Promise<TradingActionsResponse> => request(`/actions?limit=${limit}`),
  executeAction: (actionId: string, inAmount?: string): Promise<unknown> =>
    request(`/actions/${actionId}/execute`, {
      method: "POST",
      body: JSON.stringify({ inAmount }),
    }),
  executeSignal: (payload: SignalExecuteRequest): Promise<unknown> =>
    request("/signal-execute", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createDelegateWallet: (assetsName?: string): Promise<CreateDelegateWalletResponse> =>
    request("/delegate-wallets", {
      method: "POST",
      body: JSON.stringify(assetsName ? { assetsName } : {}),
    }),
  getDelegateWallet: (assetsId: string): Promise<GetDelegateWalletResponse> =>
    request(`/delegate-wallets/${encodeURIComponent(assetsId)}`),
  dismissAction: (actionId: string): Promise<unknown> => request(`/actions/${actionId}/dismiss`, { method: "POST" }),
  listTrades: (limit = 80): Promise<TradingTradesResponse> => request(`/trades?limit=${limit}`),
};
