import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";

import Types "./types";
import Minter "./minter";

module {
  public let CANISTER_PRINCIPAL: Text = "b5hua-hiaaa-aaaae-qcuvq-cai";
  public let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);

  public func getBTCAddress(subaccount: Types.Subaccount) : async Result.Result<Text, Text> {
    try {
      let canisterPrincipal = Principal.fromText(CANISTER_PRINCIPAL);
      let args = {
        owner = ?canisterPrincipal;
        subaccount = ?subaccount;
      };
      let btcAddress = await ckBTCMinter.get_btc_address(args);
      return #ok(btcAddress);
    } catch (e) {
      return #err("Error getting BTC address: " # Error.message(e));
    };
  };
} 