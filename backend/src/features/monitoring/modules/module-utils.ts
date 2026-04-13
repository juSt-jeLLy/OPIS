import type { AddressTx } from "../../../shared/clients/ave/ave-client.types";
import { toNumber } from "../../../shared/utils/number.utils";

const normalize = (value: string | undefined): string => (value ?? "").toLowerCase();

export const isBuyTx = (tx: AddressTx, tokenAddress: string): boolean => {
  if (tx.tx_swap_type !== undefined) {
    return Number(tx.tx_swap_type) === 0;
  }

  return normalize(tx.to_address) === tokenAddress.toLowerCase();
};

export const isSellTx = (tx: AddressTx, tokenAddress: string): boolean => {
  if (tx.tx_swap_type !== undefined) {
    return Number(tx.tx_swap_type) === 1;
  }

  return normalize(tx.from_address) === tokenAddress.toLowerCase();
};

export const txUsdValue = (tx: AddressTx): number => {
  return toNumber(tx.from_amount) * toNumber(tx.from_price_usd);
};
