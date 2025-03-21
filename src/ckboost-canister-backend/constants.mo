module {
    // Canister IDs
    public let CANISTER_PRINCIPAL : Text = "b5hua-hiaaa-aaaae-qcuvq-cai";
    public let CKBTC_LEDGER_CANISTER_ID : Text = "mc6ru-gyaaa-aaaar-qaaaq-cai";
    public let CKBTC_MINTER_CANISTER_ID : Text = "ml52i-qqaaa-aaaar-qaaba-cai"; 

    // Token Related
    public let CKBTC_DECIMALS : Nat = 8;  // 1 ckBTC = 10^8 satoshis
    public let SATOSHI_CONVERSION : Float = 100000000.0;  // 10^8

    // Subaccount
    public let SUBACCOUNT_BYTE_LENGTH : Nat = 32;

    // Business Logic
    public let MIN_DEPOSIT_AMOUNT : Float = 0.001;  // Minimum deposit in ckBTC
    public let DEFAULT_FEE_PERCENTAGE : Float = 0.1; // 0.1%
    public let MAX_FEE_PERCENTAGE : Float = 1.0;    // 1%

    // System
    public let MAX_TRANSACTIONS_PER_PAGE : Nat = 50;  // For pagination
    public let MAX_PROVIDERS_PER_PAGE : Nat = 50;    // For pagination
} 