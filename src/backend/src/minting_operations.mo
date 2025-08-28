import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Debug "mo:base/Debug";
import Error "mo:base/Error";

import Types "./types";
import StateModule "./state";
import Ledger "./ledger";
import Minter "./minter";

module {
  public class MintingOperations(
    state: StateModule.State,
    ledgerOps: Ledger.LedgerOperations,
    canisterPrincipal: Principal
  ) {
    
    // Helper function to format minter errors
    private func formatMinterError(mintError: Minter.UpdateBalanceError) : Text {
      switch (mintError) {
        case (#NoNewUtxos(details)) {
          "No new UTXOs found. BTC deposit may need more confirmations. Required: " # Nat32.toText(details.required_confirmations) # 
          ", Current: " # (switch (details.current_confirmations) { case (?c) Nat32.toText(c); case null "unknown"; });
        };
        case (#AlreadyProcessing) "Minter is already processing deposits for this account. Please try again in a few minutes.";
        case (#TemporarilyUnavailable(msg)) "Minter temporarily unavailable: " # msg;
        case (#GenericError(details)) "Minter error: " # details.error_message # " (code: " # Nat64.toText(details.error_code) # ")";
      };
    };

    // Trigger minting for user fallback
    public func triggerMintingForUser(caller: Principal, boostId: Types.BoostId) : async Text {
      let now = Time.now();

      // Get boost request
      var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
        case (?request) request;
        case (null) return "ERROR - Boost request not found.";
      };

      // Verify caller is the owner
      if (currentBoostRequest.owner != caller) {
        return "ERROR - Only the request owner can trigger minting for their boost request.";
      };

      // Verify status is pending
      if (currentBoostRequest.status != #pending) {
        return "ERROR - Cannot trigger minting: boost request status is " # debug_show(currentBoostRequest.status) # ". Only pending requests can have minting triggered.";
      };

      // Verify no booster assigned
      switch (currentBoostRequest.booster) {
        case (?booster) {
          return "ERROR - Cannot trigger minting: boost request has already been accepted by booster " # Principal.toText(booster);
        };
        case (null) {};
      };

      // Check BTC received
      if (currentBoostRequest.receivedBTC == 0) {
        return "ERROR - No BTC detected for this boost request. Please ensure you have sent BTC to the provided address and wait for confirmations.";
      };

      try {
        let ckBTCMinter = actor(Minter.CKBTC_MINTER_CANISTER_ID) : Minter.CkBtcMinterInterface;
        
        let updateResult = await ckBTCMinter.update_balance({
          owner = ?canisterPrincipal;
          subaccount = ?currentBoostRequest.subaccount;
        });

        switch (updateResult) {
          case (#Ok(mintResult)) {
            Debug.print("Minter processing initiated for user's BTC deposit: " # Nat64.toText(mintResult.amount) # " satoshis minted");
            
            let updatedBoostRequest : Types.BoostRequest = {
              id = currentBoostRequest.id;
              owner = currentBoostRequest.owner;
              amount = currentBoostRequest.amount;
              receivedBTC = currentBoostRequest.receivedBTC;
              btcAddress = currentBoostRequest.btcAddress;
              subaccount = currentBoostRequest.subaccount;
              status = #minting;
              booster = null;
              preferredBooster = currentBoostRequest.preferredBooster;
              createdAt = currentBoostRequest.createdAt;
              updatedAt = now;
              maxFeePercentage = currentBoostRequest.maxFeePercentage;
              confirmationsRequired = currentBoostRequest.confirmationsRequired;
            };
            
            state.boostRequests.put(boostId, updatedBoostRequest);
            return "OK - Minting process initiated. You can now claim your ckBTC using claimMintedCKBTC()";
          };
          case (#Err(mintError)) {
            let errorMsg = formatMinterError(mintError);
            Debug.print("Minter update_balance failed for user: " # errorMsg);
            return "ERROR - Could not initiate minting for your BTC deposit: " # errorMsg;
          };
        };
      } catch (error) {
        let errorMsg = Error.message(error);
        Debug.print("Error during minting trigger: " # errorMsg);
        return "ERROR - Exception during minting trigger: " # errorMsg;
      };
    };

    // Trigger minting for booster reclaim
    public func triggerMintingForBooster(caller: Principal, boostId: Types.BoostId) : async Text {
      let now = Time.now();

      // Get boost request
      var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
        case (?request) request;
        case (null) return "ERROR - Boost request not found.";
      };

      // Verify caller is the assigned booster
      switch (currentBoostRequest.booster) {
        case (?booster) {
          if (booster != caller) {
            return "ERROR - Only the assigned booster can trigger minting for fund reclamation.";
          };
        };
        case (null) {
          return "ERROR - No booster assigned to this request.";
        };
      };

      // Verify status is boosted
      if (currentBoostRequest.status != #boosted) {
        return "ERROR - Cannot trigger minting: boost request status is " # debug_show(currentBoostRequest.status) # ". Must be in boosted status.";
      };

      try {
        let ckBTCMinter = actor(Minter.CKBTC_MINTER_CANISTER_ID) : Minter.CkBtcMinterInterface;
        
        let updateResult = await ckBTCMinter.update_balance({
          owner = ?canisterPrincipal;
          subaccount = ?currentBoostRequest.subaccount;
        });

        switch (updateResult) {
          case (#Ok(mintResult)) {
            Debug.print("Minter processing initiated for booster fund reclamation: " # Nat64.toText(mintResult.amount) # " satoshis minted");
            
            let updatedBoostRequest : Types.BoostRequest = {
              id = currentBoostRequest.id;
              owner = currentBoostRequest.owner;
              amount = currentBoostRequest.amount;
              receivedBTC = currentBoostRequest.receivedBTC;
              btcAddress = currentBoostRequest.btcAddress;
              subaccount = currentBoostRequest.subaccount;
              status = #minting;
              booster = currentBoostRequest.booster;
              preferredBooster = currentBoostRequest.preferredBooster;
              createdAt = currentBoostRequest.createdAt;
              updatedAt = now;
              maxFeePercentage = currentBoostRequest.maxFeePercentage;
              confirmationsRequired = currentBoostRequest.confirmationsRequired;
            };
            
            state.boostRequests.put(boostId, updatedBoostRequest);
            return "OK - Minting process initiated for fund reclamation. You can now claim using reclaimMintedFunds()";
          };
          case (#Err(mintError)) {
            let errorMsg = formatMinterError(mintError);
            Debug.print("Minter update_balance failed for booster reclaim: " # errorMsg);
            return "ERROR - Could not initiate minting for fund reclamation: " # errorMsg;
          };
        };
      } catch (error) {
        let errorMsg = Error.message(error);
        Debug.print("Error during minting trigger: " # errorMsg);
        return "ERROR - Exception during minting trigger: " # errorMsg;
      };
    };

    // Claim minted ckBTC for user
    public func claimMintedCKBTCForUser(caller: Principal, boostId: Types.BoostId) : async Text {
      let now = Time.now();

      // Get boost request
      var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
        case (?request) request;
        case (null) return "ERROR - Boost request not found.";
      };

      // Verify caller is owner
      if (currentBoostRequest.owner != caller) {
        return "ERROR - Only the request owner can claim their minted ckBTC.";
      };

      // Verify status is minting
      if (currentBoostRequest.status != #minting) {
        return "ERROR - Cannot claim: boost request status is " # debug_show(currentBoostRequest.status) # ". Must be in minting status to claim.";
      };

      try {
        // Check balance
        let balanceResult = await ledgerOps.getAccountBalance(canisterPrincipal, currentBoostRequest.subaccount);
        
        switch (balanceResult) {
          case (#err(e)) return "ERROR - " # e;
          case (#ok(balance)) {
            if (balance <= Ledger.STANDARD_FEE) {
              return "ERROR - No sufficient ckBTC balance found in request subaccount. Balance: " # Nat.toText(balance) # " satoshis. Minting may still be in progress.";
            };

            let transferAmount = if (balance >= Ledger.STANDARD_FEE) {
              balance - Ledger.STANDARD_FEE;
            } else {
              0; // Edge case: balance less than fee
            };
            
            let transferArgs : Ledger.TransferArgs = {
              from_subaccount = ?currentBoostRequest.subaccount;
              to = { owner = caller; subaccount = null };
              amount = transferAmount;
              fee = ?Ledger.STANDARD_FEE;
              memo = null;
              created_at_time = null;
            };

            let transferResult = await ledgerOps.transferWithLogging(transferArgs, "User claim");

            switch (transferResult) {
              case (#ok(_blockIndex)) {
                let finalBoostRequest : Types.BoostRequest = {
                  id = currentBoostRequest.id;
                  owner = currentBoostRequest.owner;
                  amount = currentBoostRequest.amount;
                  receivedBTC = currentBoostRequest.receivedBTC;
                  btcAddress = currentBoostRequest.btcAddress;
                  subaccount = currentBoostRequest.subaccount;
                  status = #completed;
                  booster = null;
                  preferredBooster = currentBoostRequest.preferredBooster;
                  createdAt = currentBoostRequest.createdAt;
                  updatedAt = now;
                  maxFeePercentage = currentBoostRequest.maxFeePercentage;
                  confirmationsRequired = currentBoostRequest.confirmationsRequired;
                };
                
                state.boostRequests.put(boostId, finalBoostRequest);
                return "OK - Successfully claimed " # Nat.toText(transferAmount) # " satoshis of ckBTC";
              };
              case (#err(errorMsg)) {
                return "ERROR - Failed to transfer ckBTC to your account: " # errorMsg;
              };
            };
          };
        };
      } catch (error) {
        let errorMsg = Error.message(error);
        Debug.print("Error during ckBTC claim: " # errorMsg);
        return "ERROR - Exception during ckBTC claim: " # errorMsg;
      };
    };

    // Claim minted funds for booster
    public func claimMintedFundsForBooster(caller: Principal, boostId: Types.BoostId) : async Text {
      let now = Time.now();

      // Get boost request
      var currentBoostRequest : Types.BoostRequest = switch (state.boostRequests.get(boostId)) {
        case (?request) request;
        case (null) return "ERROR - Boost request not found.";
      };

      // Verify caller is the assigned booster
      switch (currentBoostRequest.booster) {
        case (?booster) {
          if (booster != caller) {
            return "ERROR - Only the assigned booster can reclaim minted funds.";
          };
        };
        case (null) {
          return "ERROR - No booster assigned to this request.";
        };
      };

      // Verify status is minting
      if (currentBoostRequest.status != #minting) {
        return "ERROR - Cannot reclaim: boost request status is " # debug_show(currentBoostRequest.status) # ". Must be in minting status.";
      };

      // Get booster account
      var currentBoosterAccount : Types.BoosterAccount = switch (state.boosterAccounts.get(caller)) {
        case (?account) account;
        case (null) return "ERROR - Booster account not found.";
      };

      try {
        // Check balance
        let balanceResult = await ledgerOps.getAccountBalance(canisterPrincipal, currentBoostRequest.subaccount);
        
        switch (balanceResult) {
          case (#err(e)) return "ERROR - " # e;
          case (#ok(balance)) {
            if (balance <= Ledger.STANDARD_FEE) {
              return "ERROR - No sufficient ckBTC balance found in request subaccount. Balance: " # Nat.toText(balance) # " satoshis. Minting may still be in progress.";
            };

            let transferAmount = if (balance >= Ledger.STANDARD_FEE) {
              balance - Ledger.STANDARD_FEE;
            } else {
              0; // Edge case: balance less than fee
            };
            
            let transferArgs : Ledger.TransferArgs = {
              from_subaccount = ?currentBoostRequest.subaccount;
              to = { owner = canisterPrincipal; subaccount = ?currentBoosterAccount.subaccount };
              amount = transferAmount;
              fee = ?Ledger.STANDARD_FEE;
              memo = null;
              created_at_time = null;
            };

            let transferResult = await ledgerOps.transferWithLogging(transferArgs, "Booster fund reclamation");

            switch (transferResult) {
              case (#ok(_blockIndex)) {
                // Update booster account
                let updatedBoosterAccount : Types.BoosterAccount = {
                  owner = currentBoosterAccount.owner;
                  subaccount = currentBoosterAccount.subaccount;
                  totalDeposited = currentBoosterAccount.totalDeposited;
                  availableBalance = currentBoosterAccount.availableBalance + transferAmount;
                  createdAt = currentBoosterAccount.createdAt;
                  updatedAt = now;
                };
                
                state.boosterAccounts.put(caller, updatedBoosterAccount);
                
                // Update boost request
                let finalBoostRequest : Types.BoostRequest = {
                  id = currentBoostRequest.id;
                  owner = currentBoostRequest.owner;
                  amount = currentBoostRequest.amount;
                  receivedBTC = currentBoostRequest.receivedBTC;
                  btcAddress = currentBoostRequest.btcAddress;
                  subaccount = currentBoostRequest.subaccount;
                  status = #completed;
                  booster = currentBoostRequest.booster;
                  preferredBooster = currentBoostRequest.preferredBooster;
                  createdAt = currentBoostRequest.createdAt;
                  updatedAt = now;
                  maxFeePercentage = currentBoostRequest.maxFeePercentage;
                  confirmationsRequired = currentBoostRequest.confirmationsRequired;
                };
                
                state.boostRequests.put(boostId, finalBoostRequest);
                return "OK - Successfully reclaimed " # Nat.toText(transferAmount) # " satoshis to liquidity pool";
              };
              case (#err(errorMsg)) {
                return "ERROR - Failed to transfer reclaimed funds to booster pool: " # errorMsg;
              };
            };
          };
        };
      } catch (error) {
        let errorMsg = Error.message(error);
        Debug.print("Error during fund reclamation: " # errorMsg);
        return "ERROR - Exception during fund reclamation: " # errorMsg;
      };
    };
  };
}