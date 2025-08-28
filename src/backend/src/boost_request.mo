import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";

import Types "./types";
import Utils "./utils";
import StateModule "./state";
import Minter "./minter";
import BtcUtils "./btc_utils";

module {
  // Define a class that takes a state object
  public class BoostRequestManager(state: StateModule.State) {

    let CANISTER_PRINCIPAL: Text = "75egi-7qaaa-aaaao-qj6ma-cai";
    let ckBTCMinter : Minter.CkBtcMinterInterface = actor(Minter.CKBTC_MINTER_CANISTER_ID);

    // Get a BTC address for a boost request from the ckBTC minter
    public func getBTCAddress(subaccount: Types.Subaccount) : async Text {
      try {
        let canisterPrincipal = Principal.fromText(CANISTER_PRINCIPAL);
        Debug.print("Calling ckBTC minter with principal: " # Principal.toText(canisterPrincipal));
        
        let args = {
          owner = ?canisterPrincipal;
          subaccount = ?subaccount;
        };
        
        let btcAddress = await ckBTCMinter.get_btc_address(args);
        Debug.print("Successfully got BTC address: " # btcAddress);
        return btcAddress;
      } catch (e) {
        Debug.print("Error in getBTCAddress: " # Error.message(e));
        throw Error.reject("Error getting BTC address: " # Error.message(e));
      };
    };

    // Check for BTC deposits to a specific address
    public func checkBTCDeposit(boostId: Types.BoostId) : async Result.Result<Types.BoostRequest, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          try {
            let canisterPrincipal = Principal.fromText(BtcUtils.CANISTER_PRINCIPAL);
            Debug.print("Checking BTC deposits for boost request " # Nat.toText(boostId));
            
            let args = {
              owner = ?canisterPrincipal;
              subaccount = ?request.subaccount;
            };
            
            let updateResult = await BtcUtils.ckBTCMinter.update_balance(args);
            
            switch (updateResult) {
              case (#Ok(result)) {
                Debug.print("Found deposits: " # Nat64.toText(result.amount) # " satoshis");
                let updatedRequest = await updateReceivedBTC(boostId, Nat64.toNat(result.amount));
                return updatedRequest;
              };
              case (#Err(error)) {
                switch (error) {
                  case (#NoNewUtxos(_)) {
                    Debug.print("No new deposits detected for boost request " # Nat.toText(boostId));
                    return #err("No new deposits detected");
                  };
                  case (#AlreadyProcessing) {
                    return #err("Already processing deposits");
                  };
                  case (#TemporarilyUnavailable(msg)) {
                    return #err("Service temporarily unavailable: " # msg);
                  };
                  case (#GenericError({ error_message; error_code = _ })) {
                    return #err("Error checking deposits: " # error_message);
                  };
                };
              };
            };
          } catch (e) {
            Debug.print("Error checking deposits: " # Error.message(e));
            return #err("Error checking deposits: " # Error.message(e));
          };
        };
      };
    };

    // Register a new boost request
    public func registerBoostRequest(caller: Principal, amount: Types.Amount, maxFeePercentage: Float, confirmationsRequired: Nat, preferredBooster: ?Principal) : async Result.Result<Types.BoostRequest, Text> {
      if (amount == 0) {
        return #err("Amount must be greater than 0");
      };
      
      if (maxFeePercentage < 0.0 or maxFeePercentage > 2.0) {
        return #err("Maximum fee percentage must be between 0% and 2%");
      };
      
      let boostId = state.getNextBoostId();
      
      let now = Time.now();
      let subaccount = Utils.generateSubaccount(caller, boostId);
      
      let initialBoostRequest : Types.BoostRequest = {
        id = boostId;
        owner = caller;
        amount = amount;
        receivedBTC = 0;
        btcAddress = null;
        subaccount = subaccount;
        status = #pending;
        booster = null;
        preferredBooster = preferredBooster;
        createdAt = now;
        updatedAt = now;
        maxFeePercentage = maxFeePercentage;
        confirmationsRequired = confirmationsRequired;
      };
      
      state.boostRequests.put(boostId, initialBoostRequest);
      
      try {
        Debug.print("Getting BTC address for boost request " # Nat.toText(boostId));
        let btcAddressResult = await BtcUtils.getBTCAddress(subaccount);
        
        switch (btcAddressResult) {
          case (#ok(btcAddress)) {
            Debug.print("Got BTC address: " # btcAddress);
            let updatedRequest = await updateBTCAddress(boostId, btcAddress);
            return updatedRequest;
          };
          case (#err(error)) {
            Debug.print("Error getting BTC address: " # error);
            return #ok(initialBoostRequest);
          };
        };
      } catch (e) {
        Debug.print("Error getting BTC address during registration: " # Error.message(e));
        return #ok(initialBoostRequest);
      };
    };

    // Update received BTC amount for a boost request
    public func updateReceivedBTC(boostId: Types.BoostId, receivedAmount: Types.Amount) : async Result.Result<Types.BoostRequest, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          let updatedRequest : Types.BoostRequest = {
            id = request.id;
            owner = request.owner;
            amount = request.amount;
            receivedBTC = receivedAmount;
            btcAddress = request.btcAddress;
            subaccount = request.subaccount;
            status = request.status;
            booster = request.booster;
            preferredBooster = request.preferredBooster;
            createdAt = request.createdAt;
            updatedAt = Time.now();
            maxFeePercentage = request.maxFeePercentage;
            confirmationsRequired = request.confirmationsRequired;
          };
          
          state.boostRequests.put(boostId, updatedRequest);
          return #ok(updatedRequest);
        };
      };
    };

    // Update BTC address for a boost request
    public func updateBTCAddress(boostId: Types.BoostId, btcAddress: Text) : async Result.Result<Types.BoostRequest, Text> {
      Debug.print("Updating BTC address for boost request " # Nat.toText(boostId) # " to " # btcAddress);
      
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          Debug.print("Boost request not found: " # Nat.toText(boostId));
          return #err("Boost request not found");
        };
        case (?request) {
          let updatedRequest : Types.BoostRequest = {
            id = request.id;
            owner = request.owner;
            amount = request.amount;
            receivedBTC = request.receivedBTC;
            btcAddress = ?btcAddress;
            subaccount = request.subaccount;
            status = request.status;
            booster = request.booster;
            preferredBooster = request.preferredBooster;
            createdAt = request.createdAt;
            updatedAt = Time.now();
            maxFeePercentage = request.maxFeePercentage;
            confirmationsRequired = request.confirmationsRequired;
          };
          
          state.boostRequests.put(boostId, updatedRequest);
          Debug.print("Successfully updated boost request with BTC address");
          return #ok(updatedRequest);
        };
      };
    };

    // Get BTC address for an existing boost request
    public func getBoostRequestBTCAddress(boostId: Types.BoostId) : async Result.Result<Text, Text> {
      switch (state.boostRequests.get(boostId)) {
        case (null) {
          return #err("Boost request not found");
        };
        case (?request) {
          switch (request.btcAddress) {
            case (null) {
              try {
                let btcAddressResult = await BtcUtils.getBTCAddress(request.subaccount);
                
                switch (btcAddressResult) {
                  case (#ok(btcAddress)) {
                    ignore await updateBTCAddress(boostId, btcAddress);
                    return #ok(btcAddress);
                  };
                  case (#err(error)) {
                    return #err(error);
                  };
                };
              } catch (e) {
                return #err(Error.message(e));
              };
            };
            case (?address) {
              return #ok(address);
            };
          };
        };
      };
    };

    // Query functions
    public func getBoostRequest(id: Types.BoostId) : ?Types.BoostRequest {
      state.boostRequests.get(id)
    };
    
    public func getUserBoostRequests(user: Principal) : [Types.BoostRequest] {
      let userRequests = Buffer.Buffer<Types.BoostRequest>(0);
      for ((_, request) in state.boostRequests.entries()) {
        if (Principal.equal(request.owner, user)) {
          userRequests.add(request);
        };
      };
      return Buffer.toArray(userRequests);
    };
    
    public func getAllBoostRequests() : [Types.BoostRequest] {
      Iter.toArray(Iter.map<(Types.BoostId, Types.BoostRequest), Types.BoostRequest>(
        state.boostRequests.entries(), 
        func ((_, v)) { v }
      ))
    };
  };
} 