import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";

module {
  // Core Types
  public type BoostId = Nat;
  public type Subaccount = [Nat8];
  public type Amount = Float;
  public type Timestamp = Int;
  public type Fee = Float;

  public type BoostStatus = {
    #pending;
    #active;
    #completed;
    #cancelled;
  };

  public type TransactionType = {
    #deposit;
    #withdrawal;
    #boost;
  };

  // Domain Types
  public type LiquidityProvider = {
    id: Principal;
    subaccount: Subaccount;
    totalBalance: Amount;
    availableBalance: Amount;
    lockedBalance: Amount;
    totalTransactions: Nat;
    isActive: Bool;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  public type Transaction = {
    id: Nat;
    provider: Principal;
    transactionType: TransactionType;
    amount: Amount;
    fee: ?Fee;
    status: {
      #pending;
      #completed;
      #failed;
    };
    boostRequestId: ?BoostId;
    memo: ?Text;
    createdAt: Timestamp;
    completedAt: ?Timestamp;
  };

  public type BoostRequest = {
    id: BoostId;
    owner: Principal;
    amount: Amount;
    maxFee: Fee;
    receivedBTC: Amount;
    btcAddress: ?Text;
    subaccount: Subaccount;
    status: BoostStatus;
    matchedProvider: ?Principal;
    preferredProvider: ?Principal;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // API Types
  public type AddLiquidityArgs = {
    amount: Amount;
  };

  public type WithdrawLiquidityArgs = {
    amount: Amount;
  };

  public type RegisterBoostRequestArgs = {
    amount: Amount;
    maxFee: ?Fee;
    preferredProvider: ?Principal;
  };

  // Account Types
  public type Account = {
    owner: Principal;
    subaccount: ?Subaccount;
  };

  public type Balance = {
    total: Amount;
    available: Amount;
    locked: Amount;
  };

  // Constants
  public let MIN_DEPOSIT_AMOUNT: Float = 0.0005; // Minimum deposit in ckBTC
  public let DEFAULT_FEE_PERCENTAGE: Float = 0.1; // 0.1%
  public let MAX_FEE_PERCENTAGE: Float = 2.0; // 0%
} 