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

import Constants "./constants";

module {
  // Hash function for Nat keys in HashMap
  public func natHash(n: Nat) : Hash.Hash {
    var hash : Nat32 = 0;
    var bytes = nat2Bytes(n);
    for (byte in bytes.vals()) {
      hash := hash +% Nat32.fromNat(Nat8.toNat(byte));
    };
    hash
  };

  // Convert Nat to bytes
  public func nat2Bytes(n: Nat) : [Nat8] {
    var bytes : Buffer.Buffer<Nat8> = Buffer.Buffer(8);
    var num = n;
    while (num > 0) {
      bytes.add(Nat8.fromNat(num % 256));
      num := num / 256;
    };
    Buffer.toArray(bytes)
  };

  // Convert bytes to Nat
  public func bytes2Nat(bytes: [Nat8]) : Nat {
    var n : Nat = 0;
    var i = 0;
    for (byte in bytes.vals()) {
      n := n + Nat.pow(256, i) * Nat8.toNat(byte);
      i += 1;
    };
    n
  };

  // Subaccount generation for boost requests
  public func generateSubaccount(owner: Principal, id: Nat) : [Nat8] {
    let buf = Buffer.Buffer<Nat8>(Constants.SUBACCOUNT_BYTE_LENGTH);
    
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
    
    Buffer.toArray(buf)
  };

  // Helper function to convert ckBTC to satoshis
  public func ckBTCToSatoshis(ckBTC: Float) : Nat {
    let int64Value = Float.toInt64(ckBTC * Constants.SATOSHI_CONVERSION);
    // Convert Int64 to Nat using a safe approach
    return if (int64Value >= 0) {
      Nat64.toNat(Int64.toNat64(int64Value))
    } else {
      0 // Return 0 if negative (shouldn't happen with proper inputs)
    };
  };

  public func satoshisToCkBTC(satoshis: Nat) : Float {
    return Float.fromInt(satoshis) / Constants.SATOSHI_CONVERSION;
  };
} 