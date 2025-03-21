import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";

import Types "./types";
import Minter "./minter";

module {
  // Constants
  public let CANISTER_PRINCIPAL: Text = "75egi-7qaaa-aaaao-qj6ma-cai";
  public let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);

  // Get a direct BTC address for testing
  public func getDirectBTCAddress() : async Text {
    let canisterPrincipal = Principal.fromText(CANISTER_PRINCIPAL);
    Debug.print("Directly calling ckBTC minter with principal: " # Principal.toText(canisterPrincipal));
    
    let args = {
      owner = ?canisterPrincipal;
      subaccount = null;
    };
    
    let btcAddress = await ckBTCMinter.get_btc_address(args);
    Debug.print("Successfully got direct BTC address: " # btcAddress);
    return btcAddress;
  };

  // Get a BTC address for a specific subaccount
  public func getBTCAddress(subaccount: Types.Subaccount) : async Result.Result<Text, Text> {
    try {
      let canisterPrincipal = Principal.fromText(CANISTER_PRINCIPAL);
      Debug.print("Calling ckBTC minter with principal: " # Principal.toText(canisterPrincipal));
      
      let args = {
        owner = ?canisterPrincipal;
        subaccount = ?subaccount;
      };
      
      let btcAddress = await ckBTCMinter.get_btc_address(args);
      Debug.print("Successfully got BTC address: " # btcAddress);
      return #ok(btcAddress);
    } catch (e) {
      Debug.print("Error in getBTCAddress: " # Error.message(e));
      return #err("Error getting BTC address: " # Error.message(e));
    };
  };
} 