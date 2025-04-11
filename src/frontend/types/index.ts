import { Principal } from '@dfinity/principal';

/**
 * User interface representing a user in the system
 */
export interface User {
  principal: string;
  isAuthenticated: boolean;
}

/**
 * Enum-like object for BoostRequest status
 */
export const BoostRequestStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type BoostRequestStatus = keyof typeof BoostRequestStatus;

/**
 * BoostRequest interface representing a request to boost BTC to ckBTC conversion
 */
export interface BoostRequest {
  id: bigint;
  owner: Principal;
  amount: bigint;
  fee: number;
  receivedBTC: bigint;
  btcAddress?: string;
  subaccount: Uint8Array;
  status: BoostRequestStatus;
  booster?: Principal;
  preferredBooster?: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  maxFeePercentage: number;
  confirmationsRequired: bigint;
}

/**
 * BoosterAccount interface representing a booster in the system
 */
export interface BoosterAccount {
  owner: Principal;
  subaccount: Uint8Array;
  totalDeposited: bigint;
  availableBalance: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

/**
 * Enum-like object for Booster status
 */
export const BoosterStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type BoosterStatus = typeof BoosterStatus[keyof typeof BoosterStatus];

/**
 * Helper types for API results
 */
export type Result<T> = { ok: T } | { err: string };

/**
 * Helper functions for transforming data
 */
export const formatBigInt = (value: bigint, decimals: number = 8): string => {
  // Convert satoshis to BTC (or similar conversions)
  const stringValue = value.toString();
  if (stringValue.length <= decimals) {
    return "0." + stringValue.padStart(decimals, "0");
  }
  const integerPart = stringValue.slice(0, stringValue.length - decimals);
  const decimalPart = stringValue.slice(stringValue.length - decimals);
  return integerPart + "." + decimalPart;
};

export const satoshisToBTC = (satoshis: bigint): number => {
  return Number(satoshis) / 100_000_000;
};

export const btcToSatoshis = (btc: number): bigint => {
  return BigInt(Math.floor(btc * 100_000_000));
}; 