import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tradingApi } from "../trading.api";
import type { SignalExecuteRequest } from "../trading.types";

const ACTIONS_KEY = ["trading", "actions"] as const;
const TRADES_KEY = ["trading", "trades"] as const;

export const useTradingActions = () => {
  return useQuery({
    queryKey: ACTIONS_KEY,
    queryFn: () => tradingApi.listActions(),
    refetchOnWindowFocus: false,
  });
};

export const useTradingTrades = () => {
  return useQuery({
    queryKey: TRADES_KEY,
    queryFn: () => tradingApi.listTrades(),
    refetchOnWindowFocus: false,
  });
};

export const useExecuteTradingAction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { actionId: string; inAmount?: string }) =>
      tradingApi.executeAction(input.actionId, input.inAmount),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ACTIONS_KEY });
      void client.invalidateQueries({ queryKey: TRADES_KEY });
      void client.invalidateQueries({ queryKey: ["monitoring", "overview"] });
    },
  });
};

export const useExecuteSignalTrade = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: SignalExecuteRequest) => tradingApi.executeSignal(payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ACTIONS_KEY });
      void client.invalidateQueries({ queryKey: TRADES_KEY });
      void client.invalidateQueries({ queryKey: ["monitoring", "overview"] });
      void client.invalidateQueries({ queryKey: ["monitoring", "signals"] });
    },
  });
};

export const useDismissTradingAction = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => tradingApi.dismissAction(actionId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ACTIONS_KEY });
    },
  });
};
