import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Blob "mo:base/Blob";

module {
  public type BoostId = Nat;
  public type Subaccount = Blob;
  public type Amount = Nat;
  public type Timestamp = Int;
  public type Fee = Float;

  public type BoostStatus = {
    #pending;
    #active;
    #completed;
    #cancelled;
  };

  public type BoosterAccount = {
    owner: Principal;
    subaccount: Subaccount;
    totalDeposited: Amount;
    availableBalance: Amount;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  public type BoostRequest = {
    id: BoostId;
    owner: Principal;
    amount: Amount;
    fee: Fee;
    receivedBTC: Amount;
    btcAddress: ?Text;
    subaccount: Subaccount;
    status: BoostStatus;
    booster: ?Principal;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    maxFeePercentage: Float;
    confirmationsRequired: Nat;
  };
} 