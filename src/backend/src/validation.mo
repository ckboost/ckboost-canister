import Result "mo:base/Result";
import Text "mo:base/Text";
import Float "mo:base/Float";

import Types "./types";

module {
  // Validation helper functions
  public func validateAmount(amount: Types.Amount, fieldName: Text) : Result.Result<(), Text> {
    if (amount == 0) {
      return #err(fieldName # " must be greater than zero");
    };
    #ok();
  };

  public func validateMaxFeePercentage(maxFeePercentage: Float) : Result.Result<(), Text> {
    if (maxFeePercentage < 0 or maxFeePercentage > 100) {
      return #err("Max fee percentage must be between 0 and 100");
    };
    #ok();
  };
  
  public func validateFeePercentage(fee: Float) : Result.Result<(), Text> {
    if (fee < 0 or fee > 100) {
      return #err("Fee percentage must be between 0 and 100");
    };
    #ok();
  };

  public func validateConfirmations(confirmationsRequired: Nat) : Result.Result<(), Text> {
    if (confirmationsRequired == 0) {
      return #err("Confirmations required must be greater than zero");
    };
    #ok();
  };

  // Combined validation for boost request registration
  public func validateBoostRequestParams(
    amount: Types.Amount,
    maxFeePercentage: Float,
    confirmationsRequired: Nat
  ) : Result.Result<(), Text> {
    switch (validateAmount(amount, "Amount")) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch (validateMaxFeePercentage(maxFeePercentage)) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch (validateFeePercentage(maxFeePercentage)) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    switch (validateConfirmations(confirmationsRequired)) {
      case (#err(e)) return #err(e);
      case _ {};
    };
    
    #ok();
  };
}