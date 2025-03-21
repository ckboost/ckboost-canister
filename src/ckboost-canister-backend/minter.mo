import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";

module {
  public type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  public type BtcNetwork = {
    #mainnet;
    #testnet;
  };

  public type MinterInfo = {
    btc_network : BtcNetwork;
    min_confirmations : Nat32;
    retrieve_btc_min_amount : Nat64;
    kyt_fee : Nat64;
  };

  public type RetrieveBtcStatus = {
    #Unknown;
    #Pending;
    #Sending;
    #Submitted : { txid : Text };
    #Confirmed : { txid : Text };
    #AmountTooLow;
    #Expired;
  };

  public type RetrieveBtcError = {
    #MalformedAddress : Text;
    #InsufficientFunds : { balance : Nat64 };
    #AmountTooLow : { min_amount : Nat64 };
    #InsufficientAllowance : { allowance : Nat64 };
  };

  public type RetrieveBtcOk = {
    block_index : Nat64;
  };

  public type RetrieveBtcResult = {
    #Ok : RetrieveBtcOk;
    #Err : RetrieveBtcError;
  };

  public type UpdateBalanceError = {
    #GenericError : { error_message : Text; error_code : Nat64 };
    #TemporarilyUnavailable : Text;
    #AlreadyProcessing;
    #NoNewUtxos : { required_confirmations : Nat32; current_confirmations : ?Nat32 };
  };

  public type Utxo = {
    height : Nat32;
    value : Nat64;
    outpoint : { txid : Blob; vout : Nat32 };
  };

  public type UpdateBalanceOk = {
    block_index : Nat64;
    amount : Nat64;
    utxos : [Utxo];
  };

  public type UpdateBalanceResult = {
    #Ok : UpdateBalanceOk;
    #Err : UpdateBalanceError;
  };

  public type CkBtcMinterInterface = actor {
    get_btc_address : shared ({owner: ?Principal; subaccount: ?Blob}) -> async Text;
    update_balance : shared ({owner: ?Principal; subaccount: ?Blob}) -> async UpdateBalanceResult;
    get_minter_info : shared query () -> async MinterInfo;
    retrieve_btc : shared (address : Text, amount : Nat64) -> async RetrieveBtcResult;
    retrieve_btc_status : shared query (block_index : Nat64) -> async RetrieveBtcStatus;
  };

  public let CKBTC_MINTER_CANISTER_ID : Text = "mqygn-kiaaa-aaaar-qaadq-cai"; // Mainnet ckBTC Minter
} 