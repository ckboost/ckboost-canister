import Principal "mo:base/Principal";
import Blob "mo:base/Blob";

module {
  public type BoostId = Nat;
  public type Subaccount = Blob;
  public type Amount = Nat;
  public type Timestamp = Int;
  public type Fee = Float;

  public type BoostStatus = {
    #pending;      // Waiting for BTC deposit or booster acceptance
    #active;       // BTC received, ready for boosting
    #boosted;      // Booster provided ckBTC to user, waiting for fund reclamation  
    #minting;      // Minting process triggered, waiting for ckBTC to be minted
    #completed;    // Fully completed - funds claimed/reclaimed
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
    receivedBTC: Amount;
    btcAddress: ?Text;
    subaccount: Subaccount;
    status: BoostStatus;
    booster: ?Principal;
    preferredBooster: ?Principal;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    maxFeePercentage: Float;
    confirmationsRequired: Nat;
  };
} 