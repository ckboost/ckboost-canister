import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Blob "mo:base/Blob";

import Types "./types";
import Minter "./minter";
import Constants "./constants";

module {
  public let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Constants.CKBTC_MINTER_CANISTER_ID);

  public func getBTCAddress(subaccount: Types.Subaccount) : async Result.Result<Text, Text> {
    try {
      let canisterPrincipal = Principal.fromText(Constants.CANISTER_PRINCIPAL);
      let args = {
        owner = ?canisterPrincipal;
        subaccount = ?Blob.fromArray(subaccount);
      };
      let btcAddress = await ckBTCMinter.get_btc_address(args);
      return #ok(btcAddress);
    } catch (e) {
      return #err("Error getting BTC address: " # Error.message(e));
    };
  };
}; 