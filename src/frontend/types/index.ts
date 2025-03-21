/**
 * User interface representing a user in the system
 */
export interface User {
  principal: string;
  isAuthenticated: boolean;
}

/**
 * BoostRequest interface representing a request to boost BTC to ckBTC conversion
 */
export interface BoostRequest {
  id: string;
  userId: string;
  btcAmount: number;
  btcAddress: string;
  status: BoostRequestStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Enum-like object for BoostRequest status
 */
export const BoostRequestStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  BOOSTED: "BOOSTED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type BoostRequestStatus = typeof BoostRequestStatus[keyof typeof BoostRequestStatus];

/**
 * Booster interface representing a service provider in the system
 */
export interface Booster {
  id: string;
  principal: string;
  ckbtcBalance: number;
  totalBoosted: number;
  feePercentage: number;
  status: BoosterStatus;
}

/**
 * Enum-like object for Booster status
 */
export const BoosterStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type BoosterStatus = typeof BoosterStatus[keyof typeof BoosterStatus]; 