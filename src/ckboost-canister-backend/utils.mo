import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Hash "mo:base/Hash";
import Float "mo:base/Float";
import Int64 "mo:base/Int64";
import Iter "mo:base/Iter";

module {
  public func natHash(n: Nat) : Hash.Hash {
    let h = Nat32.fromNat(n % (2**32));
    return h;
  };

  // Subaccount generation for boost requests
  public func generateSubaccount(owner: Principal, id: Nat) : Blob {
    let buf = Buffer.Buffer<Nat8>(32);
    
    buf.add(0x01); // Prefix for boost request subaccounts
    
    let principalBytes = Blob.toArray(Principal.toBlob(owner));
    let principalBytesToUse = Array.subArray(principalBytes, 0, Nat.min(principalBytes.size(), 16));
    for (byte in principalBytesToUse.vals()) {
      buf.add(byte);
    };
    
    while (buf.size() < 24) {
      buf.add(0);
    };
    
    var idNat = id;
    for (i in Iter.range(0, 7)) {
      buf.add(Nat8.fromNat(Nat64.toNat(Nat64.fromNat(idNat) / Nat64.fromNat(256 ** (7 - i)) % 256)));
    };
    
    return Blob.fromArray(Buffer.toArray(buf));
  };

  // Subaccount generation for booster pools
  public func generateBoosterPoolSubaccount(owner: Principal, poolId: Nat) : Blob {
    let buf = Buffer.Buffer<Nat8>(32);
    
    buf.add(0x02);
    
    let principalBytes = Blob.toArray(Principal.toBlob(owner));
    let principalBytesToUse = Array.subArray(principalBytes, 0, Nat.min(principalBytes.size(), 16));
    for (byte in principalBytesToUse.vals()) {
      buf.add(byte);
    };
    
    while (buf.size() < 24) {
      buf.add(0);
    };
    
    var id = poolId;
    for (i in Iter.range(0, 7)) {
      buf.add(Nat8.fromNat(Nat64.toNat(Nat64.fromNat(id) / Nat64.fromNat(256 ** (7 - i)) % 256)));
    };
    
    return Blob.fromArray(Buffer.toArray(buf));
  };

  // Helper function to convert ckBTC to satoshis
  public func ckBTCToSatoshis(ckBTC: Float) : Nat {
    let int64Value = Float.toInt64(ckBTC * 100_000_000);
    // Convert Int64 to Nat using a safe approach
    return if (int64Value >= 0) {
      Nat64.toNat(Int64.toNat64(int64Value))
    } else {
      0 // Return 0 if negative (shouldn't happen with proper inputs)
    };
  };

  public func satoshisToCkBTC(satoshis: Nat) : Float {
    return Float.fromInt(satoshis) / 100_000_000;
  };
} 