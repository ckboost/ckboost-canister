import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { 
  ArrowUpRight, 
  AlertTriangle, 
  Check,
  Bitcoin,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { useAgent } from "@nfid/identitykit/react";
import { AccountIdentifier, LedgerCanister } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";

// Utility function to convert hex string to Uint8Array
function fromHexString(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.substring(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ICP Ledger IDL Factory
const icpLedgerIDLFactory = ({ IDL }: { IDL: any }) => {
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  // const Duration = IDL.Record({ 'secs': IDL.Nat64, 'nanos': IDL.Nat32 });
  // const ArchiveOptions = IDL.Record({
  //   'num_blocks_to_archive': IDL.Nat64,
  //   'trigger_threshold': IDL.Nat64,
  //   'max_message_size_bytes': IDL.Opt(IDL.Nat64),
  //   'cycles_for_archive_creation': IDL.Opt(IDL.Nat64),
  //   'node_max_memory_size_bytes': IDL.Opt(IDL.Nat64),
  //   'controller_id': IDL.Principal,
  // });
  const ICPTs = IDL.Record({ 'e8s': IDL.Nat64 });
  // const LedgerCanisterInitPayload = IDL.Record({
  //   'send_whitelist': IDL.Vec(IDL.Principal),
  //   'minting_account': AccountIdentifier,
  //   'transaction_window': IDL.Opt(Duration),
  //   'max_message_size_bytes': IDL.Opt(IDL.Nat64),
  //   'archive_options': IDL.Opt(ArchiveOptions),
  //   'initial_values': IDL.Vec(IDL.Tuple(AccountIdentifier, ICPTs)),
  // });
  const Memo = IDL.Nat64;
  const SubAccount = IDL.Vec(IDL.Nat8);
  const TimeStamp = IDL.Record({ 'timestamp_nanos': IDL.Nat64 });
  const TransferArgs = IDL.Record({
    'to': AccountIdentifier,
    'fee': ICPTs,
    'memo': Memo,
    'from_subaccount': IDL.Opt(SubAccount),
    'created_at_time': IDL.Opt(TimeStamp),
    'amount': ICPTs,
  });
  const TransferError = IDL.Variant({
    'TxTooOld': IDL.Record({ 'allowed_window_nanos': IDL.Nat64 }),
    'BadFee': IDL.Record({ 'expected_fee': ICPTs }),
    'TxDuplicate': IDL.Record({ 'duplicate_of': IDL.Nat64 }),
    'TxCreatedInFuture': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': ICPTs }),
  });
  const TransferResult = IDL.Variant({
    'Ok': IDL.Nat64,
    'Err': TransferError,
  });
  const TransferFeeArg = IDL.Record({});
  const TransferFee = IDL.Record({ 'transfer_fee': ICPTs });
  return IDL.Service({
    'transfer': IDL.Func([TransferArgs], [TransferResult], []),
    'transfer_fee': IDL.Func([TransferFeeArg], [TransferFee], ['query']),
  });
};

// ICRC-1 Ledger IDL Factory (for ckBTC)
const icrc1LedgerIDLFactory = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Tokens = IDL.Nat;
  const Memo = IDL.Vec(IDL.Nat8);
  const Timestamp = IDL.Nat64;
  const TransferArg = IDL.Record({
    'to': Account,
    'fee': IDL.Opt(Tokens),
    'memo': IDL.Opt(Memo),
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(Timestamp),
    'amount': Tokens,
  });
  const TransferError = IDL.Variant({
    'GenericError': IDL.Record({
      'message': IDL.Text,
      'error_code': IDL.Nat,
    }),
    'TemporarilyUnavailable': IDL.Null,
    'BadBurn': IDL.Record({ 'min_burn_amount': Tokens }),
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'BadFee': IDL.Record({ 'expected_fee': Tokens }),
    'CreatedInFuture': IDL.Record({ 'ledger_time': Timestamp }),
    'TooOld': IDL.Null,
    'InsufficientFunds': IDL.Record({ 'balance': Tokens }),
  });
  const TransferResult = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': TransferError,
  });
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [Tokens], ['query']),
    'icrc1_transfer': IDL.Func([TransferArg], [TransferResult], []),
  });
};

// Skeleton component for loading state
const BalanceSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 w-16 bg-gray-700/50 rounded mb-1"></div>
  </div>
);

// Define response types for better type safety
interface ICPTransferResult {
  Ok?: bigint;
  Err?: {
    TxTooOld?: { allowed_window_nanos: bigint };
    BadFee?: { expected_fee: { e8s: bigint } };
    TxDuplicate?: { duplicate_of: bigint };
    TxCreatedInFuture?: null;
    InsufficientFunds?: { balance: { e8s: bigint } };
  };
}

interface ICRC1TransferResult {
  Ok?: bigint;
  Err?: {
    GenericError?: { message: string; error_code: number };
    TemporarilyUnavailable?: null;
    BadBurn?: { min_burn_amount: bigint };
    Duplicate?: { duplicate_of: number };
    BadFee?: { expected_fee: bigint };
    CreatedInFuture?: { ledger_time: bigint };
    TooOld?: null;
    InsufficientFunds?: { balance: bigint };
  };
}

export function SendPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agent = useAgent();
  const [token, setToken] = useState<"ICP" | "ckBTC">("ICP");
  const [amount, setAmount] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [icpBalance, setICPBalance] = useState<number>(0);
  const [ckbtcBalance, setCkBTCBalance] = useState<number>(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [txId, setTxId] = useState<string | null>(null);
  
  const getICPBalance = async () => {
    if (!user) {
      navigate("/");
      return;
    }
    try {
      if (agent) {
        const accountIdentifier = AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(user?.principal || ""),
        });
        const ledger = LedgerCanister.create({
          agent: new HttpAgent({
            host: "https://icp0.io",
          }),
          canisterId: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai")
        });
        const balance = await ledger.accountBalance({
            accountIdentifier: accountIdentifier,
            certified: true
        });
        const balanceInICP = Number(balance) / 10 ** 8;
        setICPBalance(balanceInICP);
      }
    } catch (error) {
      console.error("Error fetching ICP balance:", error);
      setError("Failed to fetch ICP balance. Please try again.");
    }
  }

  const getCkBTCBalance = async () => {
    if (!user) {
      navigate("/");
      return;
    }
    try {
      if (agent) {
        const ckBTCLedgerActor = Actor.createActor(
          icrc1LedgerIDLFactory,
          {
            agent: new HttpAgent({
              host: "https://icp0.io",
            }),
            canisterId: Principal.fromText("mxzaz-hqaaa-aaaar-qaada-cai")
          }
        );
        const balanceResponse: BigInt = await ckBTCLedgerActor.icrc1_balance_of({
          owner: Principal.fromText(user?.principal || ""),
          subaccount: []
        }) as BigInt;
        const balanceInCkBTC = Number(balanceResponse) / 10 ** 8;
        setCkBTCBalance(balanceInCkBTC);
      }
    } catch (error) {
      console.error("Error fetching ckBTC balance:", error);
      setError("Failed to fetch ckBTC balance. Please try again.");
    }
  }

  const fetchBalances = async () => {
    setIsBalanceLoading(true);
    setError(null);
    try {
      await Promise.all([getICPBalance(), getCkBTCBalance()]);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setError("Failed to fetch balances. Please try again.");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [user, navigate, agent]);
  
  // const walletData = {
  //   ICP: {
  //     balance: icpBalance,
  //     address: user?.principal?.slice(0, 9) + "..." + user?.principal?.slice(-10),
  //     fullAddress: user?.principal,
  //   },
  //   ckBTC: {
  //     balance: ckbtcBalance,
  //     address: user?.principal?.slice(0, 9) + "..." + user?.principal?.slice(-10),
  //     fullAddress: user?.principal,
  //   }
  // };
  
  const handleTokenChange = (newToken: "ICP" | "ckBTC") => {
    setToken(newToken);
    setError(null);
    setAmount("");
  };
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    const balance = token === "ICP" ? icpBalance : ckbtcBalance;
    
    // Validate amount
    if (value && parseFloat(value) <= 0) {
      setError("Amount must be greater than 0");
    } else if (value && parseFloat(value) > balance) {
      setError(`Insufficient ${token} balance`);
    } else {
      setError(null);
    }
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setError(null);
  };
  
  // Function to validate if a string is a valid principal ID
  const isValidPrincipal = (principalId: string): boolean => {
    try {
      Principal.fromText(principalId);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    
    if (!address) {
      setError("Please enter a recipient address");
      return;
    }
    
    const balance = token === "ICP" ? icpBalance : ckbtcBalance;
    if (parseFloat(amount) > balance) {
      setError(`Insufficient ${token} balance`);
      return;
    }
    
    // Validate address format
    if (!isValidPrincipal(address)) {
      setError("Invalid recipient address. Please enter a valid principal ID.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!agent || !user) {
        throw new Error("Authentication required");
      }
      
      let transactionId;
      
      if (token === "ICP") {
        // Send ICP
        const icpActor = Actor.createActor(icpLedgerIDLFactory, {
          agent,
          canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        });
        
        // Convert destination principal to account identifier
        const destinationAccountId = AccountIdentifier.fromPrincipal({
          principal: Principal.fromText(address),
        });
        
        // Convert amount to e8s (ICP's smallest unit)
        const amountE8s = BigInt(Math.floor(parseFloat(amount) * 10 ** 8));
        
        // Prepare transfer arguments
        const transferArgs = {
          to: fromHexString(destinationAccountId.toHex()),
          fee: { e8s: BigInt(10000) }, // 0.0001 ICP fee
          memo: BigInt(0),
          from_subaccount: [],
          created_at_time: [],
          amount: { e8s: amountE8s },
        };
        
        console.log("Sending ICP with args:", {
          to: destinationAccountId.toHex(),
          amount: amountE8s.toString(),
          fee: "10000",
        });
        
        // Execute transfer
        const response = await icpActor.transfer(transferArgs) as ICPTransferResult;
        
        if (response.Ok !== undefined) {
          transactionId = response.Ok.toString();
          console.log("ICP transfer successful, transaction ID:", transactionId);
        } else if (response.Err) {
          // Handle error
          const errorType = Object.keys(response.Err)[0];
          const errorDetails = response.Err[errorType as keyof typeof response.Err];
          throw new Error(`Transfer failed: ${errorType} - ${JSON.stringify(errorDetails)}`);
        } else {
          throw new Error("Unknown transfer response format");
        }
      } else {
        // Send ckBTC
        const ckBTCActor = Actor.createActor(icrc1LedgerIDLFactory, {
          agent,
          canisterId: "mxzaz-hqaaa-aaaar-qaada-cai",
        });
        
        // Convert amount to satoshis (ckBTC's smallest unit)
        const amountSatoshis = BigInt(Math.floor(parseFloat(amount) * 10 ** 8));
        
        // Prepare transfer arguments
        const transferArgs = {
          to: {
            owner: Principal.fromText(address),
            subaccount: [],
          },
          fee: [BigInt(10)], // 10 satoshis fee
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          amount: amountSatoshis,
        };
        
        console.log("Sending ckBTC with args:", {
          to: address,
          amount: amountSatoshis.toString(),
          fee: "10",
        });
        
        // Execute transfer
        const response = await ckBTCActor.icrc1_transfer(transferArgs) as ICRC1TransferResult;
        
        if (response.Ok !== undefined) {
          transactionId = response.Ok.toString();
          console.log("ckBTC transfer successful, transaction ID:", transactionId);
        } else if (response.Err) {
          // Handle error
          const errorType = Object.keys(response.Err)[0];
          const errorDetails = response.Err[errorType as keyof typeof response.Err];
          throw new Error(`Transfer failed: ${errorType} - ${JSON.stringify(errorDetails)}`);
        } else {
          throw new Error("Unknown transfer response format");
        }
      }
      
      // Update transaction ID and set success
      setTxId(transactionId);
      setIsSuccess(true);
      
      // Refresh balances
      fetchBalances();
      
    } catch (error) {
      console.error(`Error sending ${token}:`, error);
      setError(`Failed to send ${token}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16 relative">
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-center">
              Send {token}
            </h1>
            <p className="text-gray-400 text-center mt-2">
              Send {token} to another wallet address
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="relative backdrop-blur-md overflow-hidden shadow-xl border-gray-800/50">
              {/* Glassmorphism card background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
              
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <Button
                      variant={token === "ICP" ? "primary" : "outline"}
                      className={token === "ICP" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : "border-gray-700 text-gray-300"}
                      onClick={() => handleTokenChange("ICP")}
                      disabled={isLoading || isSuccess}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                          <img 
                            src="/internet-computer-icp-logo.png" 
                            alt="ICP Logo" 
                            className="h-3 w-3"
                          />
                        </div>
                        <span>ICP</span>
                      </div>
                    </Button>
                    <Button
                      variant={token === "ckBTC" ? "primary" : "outline"}
                      className={token === "ckBTC" ? "bg-gradient-to-r from-orange-600 to-amber-600" : "border-gray-700 text-gray-300"}
                      onClick={() => handleTokenChange("ckBTC")}
                      disabled={isLoading || isSuccess}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                          <Bitcoin className="h-3 w-3 text-orange-400" />
                        </div>
                        <span>ckBTC</span>
                      </div>
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchBalances}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    disabled={isBalanceLoading || isLoading}
                  >
                    {isBalanceLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {isSuccess ? (
                  <div className="p-6 flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Transaction Sent!</h4>
                    <p className="text-gray-400 text-center mb-2">
                      Your {token} transaction has been submitted successfully.
                    </p>
                    {txId && (
                      <p className="text-xs text-gray-500 text-center mb-6 break-all">
                        Transaction ID: {txId}
                      </p>
                    )}
                    <Button 
                      className="w-full"
                      onClick={() => navigate("/wallet")}
                    >
                      Back to Wallet
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="amount" className="block text-sm font-medium text-blue-300">
                        Amount
                      </label>
                      <div className="relative">
                        <Input
                          id="amount"
                          type="number"
                          step={token === "ICP" ? "0.0001" : "0.00000001"}
                          min={token === "ICP" ? "0.0001" : "0.00000001"}
                          placeholder={token === "ICP" ? "0.0001" : "0.00000001"}
                          value={amount}
                          onChange={handleAmountChange}
                          className="pl-4 pr-16 border-gray-700/50 bg-gray-800/50 focus:border-blue-500 focus:ring-blue-500/50 h-12 rounded-lg"
                          required
                          disabled={isLoading || isSuccess || isBalanceLoading}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <span className="text-gray-400 font-medium">{token}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">
                          Available: {isBalanceLoading ? (
                            <BalanceSkeleton />
                          ) : (
                            <>
                              {token === "ICP" 
                                ? icpBalance.toFixed(4) 
                                : ckbtcBalance.toFixed(8)
                              } {token}
                            </>
                          )}
                        </span>
                        <button 
                          type="button" 
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => {
                            const balance = token === "ICP" ? icpBalance : ckbtcBalance;
                            setAmount(balance.toString());
                          }}
                          disabled={isLoading || isSuccess || isBalanceLoading || (token === "ICP" ? icpBalance === 0 : ckbtcBalance === 0)}
                        >
                          Max
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="address" className="block text-sm font-medium text-blue-300">
                        Recipient Address
                      </label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Enter Principal ID"
                        value={address}
                        onChange={handleAddressChange}
                        className="border-gray-700/50 bg-gray-800/50 focus:border-blue-500 focus:ring-blue-500/50 h-12 rounded-lg"
                        required
                        disabled={isLoading || isSuccess}
                      />
                      <p className="text-xs text-gray-500">
                        Enter the recipient's Principal ID (e.g., aaaaa-aa)
                      </p>
                    </div>
                    
                    {error && (
                      <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 flex gap-2 items-start">
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">
                          {error}
                        </p>
                      </div>
                    )}
                    
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-5 text-base rounded-xl"
                      disabled={isLoading || isSuccess || isBalanceLoading || !amount || !address || !!error}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ArrowUpRight className="h-5 w-5" />
                          Send {token}
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
              
              <CardFooter className="border-t border-gray-800/50 pt-4">
                <div className="text-xs text-gray-400 text-center w-full">
                  Please double-check the recipient address before sending. Transactions cannot be reversed.
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 