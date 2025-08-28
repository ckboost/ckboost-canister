import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Error "mo:base/Error";
import Debug "mo:base/Debug";

module {
  // ICRC-1 Types
  public type Account = { owner : Principal; subaccount : ?Blob };
  public type Tokens = Nat;
  public type TransferError = {
    #BadFee : { expected_fee : Tokens };
    #BadBurn : { min_burn_amount : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #TemporarilyUnavailable;
    #Duplicate : { duplicate_of : Nat };
    #GenericError : { error_code : Nat; message : Text };
  };
  
  public type TransferArgs = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };
  
  public type ActualTransferResult = { 
    #Ok : Nat; // BlockIndex is Nat
    #Err : TransferError; // This holds the inner TransferError variant
  };

  public type Ledger = actor {
    icrc1_transfer : shared TransferArgs -> async ActualTransferResult;
    icrc1_balance_of : shared query Account -> async Tokens;
  };

  // Constants
  public let STANDARD_FEE : Nat = 10;

  // Utility Functions
  public func transferErrorToText(err : TransferError) : Text {
    switch (err) {
      case (#BadFee(r)) "Bad Fee: Expected fee is " # Nat.toText(r.expected_fee);
      case (#BadBurn(r)) "Bad Burn: Minimum burn amount is " # Nat.toText(r.min_burn_amount);
      case (#InsufficientFunds(r)) "Insufficient Funds: Balance is " # Nat.toText(r.balance);
      case (#TooOld) "Too Old";
      case (#CreatedInFuture(r)) "Created in Future: Ledger time " # Nat64.toText(r.ledger_time);
      case (#TemporarilyUnavailable) "Temporarily Unavailable";
      case (#Duplicate(r)) "Duplicate transfer of transaction " # Nat.toText(r.duplicate_of);
      case (#GenericError(r)) "Generic Error: " # r.message # " (code: " # Nat.toText(r.error_code) # ")";
    };
  };

  // Ledger Operations Class
  public class LedgerOperations(ckbtcLedgerCanisterId: Principal) {
    private func getLedger() : Ledger {
      actor(Principal.toText(ckbtcLedgerCanisterId)) : Ledger;
    };

    // Get account balance
    public func getAccountBalance(owner: Principal, subaccount: Blob) : async Result.Result<Nat, Text> {
      try {
        let ledger = getLedger();
        let balanceArgs : Account = {
          owner = owner;
          subaccount = ?subaccount;
        };
        let balance = await ledger.icrc1_balance_of(balanceArgs);
        #ok(balance);
      } catch (e) {
        #err("Failed to fetch current balance from ckBTC ledger: " # Error.message(e));
      };
    };

    // Transfer tokens
    public func transfer(args: TransferArgs) : async Result.Result<Nat, Text> {
      try {
        let ledger = getLedger();
        let transferResult = await ledger.icrc1_transfer(args);
        
        switch (transferResult) {
          case (#Ok(blockIndex)) {
            #ok(blockIndex);
          };
          case (#Err(transferError)) {
            #err(transferErrorToText(transferError));
          };
        };
      } catch (error) {
        #err("Transfer exception: " # Error.message(error));
      };
    };

    // Transfer with detailed logging
    public func transferWithLogging(args: TransferArgs, operation: Text) : async Result.Result<Nat, Text> {
      Debug.print("Starting " # operation # " transfer, amount: " # Nat.toText(args.amount) # 
                  " (fee: " # (switch (args.fee) { case (?fee) Nat.toText(fee); case null "default"; }) # ")");
      
      let result = await transfer(args);
      
      switch (result) {
        case (#ok(blockIndex)) {
          Debug.print(operation # " transfer successful, block: " # Nat.toText(blockIndex));
        };
        case (#err(errorMsg)) {
          Debug.print(operation # " transfer failed: " # errorMsg);
        };
      };
      
      result;
    };
  };
}