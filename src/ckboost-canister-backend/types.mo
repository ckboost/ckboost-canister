import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Blob "mo:base/Blob";

module {
  // Core Types
  public type BoostId = Nat;
  public type BoosterPoolId = Nat;
  public type Subaccount = Blob;
  public type Amount = Float;
  public type Timestamp = Int;
  public type Fee = Float;

  public type BoostStatus = {
    #pending;
    #active;
    #completed;
    #cancelled;
  };

  // Domain Types
  public type BoosterPool = {
    id: BoosterPoolId;
    owner: Principal;
    fee: Fee;
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
    matchedBoosterPool: ?BoosterPoolId;
    preferredBPPrincipal: ?Principal;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // API Types
  public type RegisterBoostRequestArgs = {
    user: Principal;
    amount: Amount;
    fee: ?Fee;
    preferredBPPrincipal: ?Principal;
  };

  public type RegisterPoolArgs = {
    fee: Fee;
  };

  // Constants
  public let POOL_ADMIN_PRINCIPAL: Text = "racif-2ns2g-himer-ehzmk-q3sxc-emyrr-ozvkf-76gvp-fmuhk-lkrlq-yae";
} 