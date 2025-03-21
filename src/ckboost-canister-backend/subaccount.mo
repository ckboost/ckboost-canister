import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Hash "mo:base/Hash";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";

import Types "./types";
import Constants "./constants";

module {
    // Convert Principal to bytes, right-padded with 0s to fill 32 bytes
    private func principalToSubaccount(principal: Principal) : [Nat8] {
        let principalBytes = Principal.toBlob(principal);
        let principalBytesArray = Blob.toArray(principalBytes);
        
        // Create a new array of 32 bytes, initialized with 0s
        let subaccount = Array.init<Nat8>(Constants.SUBACCOUNT_BYTE_LENGTH, 0);
        
        // Copy principal bytes into the subaccount array
        var i = 0;
        while (i < principalBytesArray.size() and i < Constants.SUBACCOUNT_BYTE_LENGTH) {
            subaccount[i] := principalBytesArray[i];
            i += 1;
        };
        
        Array.freeze(subaccount)
    };

    // Generate a unique subaccount for a provider
    public func generateProviderSubaccount(provider: Principal) : Types.Subaccount {
        principalToSubaccount(provider)
    };

    // Validate a subaccount
    public func validateSubaccount(subaccount: Types.Subaccount) : Bool {
        subaccount.size() == Constants.SUBACCOUNT_BYTE_LENGTH
    };

    // Get principal from subaccount if possible
    public func getPrincipalFromSubaccount(subaccount: Types.Subaccount) : ?Principal {
        if (not validateSubaccount(subaccount)) {
            return null;
        };
        
        let blob = Blob.fromArray(subaccount);
        do ? {
            Principal.fromBlob(blob)
        }
    };
}; 