import { motion, AnimatePresence } from "framer-motion";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { 
  Zap, 
  Copy, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  Bitcoin, 
  Clock, 
  Percent, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Slider } from "../components/ui/slider";
import { QRCodeSVG } from "qrcode.react";
import { Actor } from "@dfinity/agent";
import { idlFactory } from "../declarations/backend.did.js";
import { Principal } from "@dfinity/principal";
import { useAgent } from "@nfid/identitykit/react";

export function BoostPage() {
  const [btcAmount, setBtcAmount] = useState<string>("");
  const [feePercentage, setFeePercentage] = useState<number>(0.5);
  const [showAddress, setShowAddress] = useState<boolean>(false);
  const [btcAddress, setBtcAddress] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const confirmationsRequired = 1;

  const agent = useAgent();
  const BACKEND_CANISTER_ID = "75egi-7qaaa-aaaao-qj6ma-cai";

  const handleRequestAddress = async () => {
    if (!btcAmount || parseFloat(btcAmount) < 0.0001) {
      alert("Please enter a valid BTC amount (minimum 0.0001 BTC).");
      return;
    }

    setIsLoading(true);
    try {
      const backendActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(BACKEND_CANISTER_ID)
      });

      const amountInSatoshis = parseFloat(btcAmount) * 1e8;
      const preferredBooster: Principal[] = [];

      const result = await backendActor.registerBoostRequest(
        BigInt(amountInSatoshis),
        feePercentage,
        feePercentage,
        BigInt(confirmationsRequired),
        preferredBooster
      );

      if (result && typeof result === 'object' && 'ok' in result) {2
        const okResult = result as { ok: { btcAddress: string[] } };
        setBtcAddress(okResult.ok.btcAddress[0] || "");
        setShowAddress(true);
      } else if (result && typeof result === 'object' && 'err' in result) {
        const errResult = result as { err: string };
        alert(errResult.err);
      }
    } catch (error) {
      console.error("Error requesting BTC address:", error);
      alert("Failed to get BTC address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(btcAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="text-center mb-10 md:mb-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 mb-5 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium tracking-wide">
                10x Faster Conversion
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Boost Your Bitcoin to ckBTC
            </h1>
            
            <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
              Skip the traditional 1-hour wait time and convert your Bitcoin to ckBTC in just minutes.
              Get instant access to the Internet Computer ecosystem.
            </p>
          </motion.div>

          <motion.div
            className="relative backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            {/* Glassmorphism card background with border gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 -z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 -z-10"></div>
            <div className="absolute inset-px rounded-2xl border border-white/10 -z-10"></div>
            
            {/* Card content */}
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Start Your Boost</h2>
              </div>
              
              <div className="space-y-7">
                {/* BTC Amount Input */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label htmlFor="btcAmount" className="block text-sm font-medium text-blue-300">
                    Bitcoin Amount
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Input
                        id="btcAmount"
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        placeholder="0.0001"
                        value={btcAmount}
                        onChange={(e) => setBtcAmount(e.target.value)}
                        className="pl-14 pr-16 border-gray-700/50 bg-gray-800/50 focus:border-blue-500 focus:ring-blue-500/50 h-14 rounded-lg text-base"
                        required
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <div className="p-1.5 rounded-full bg-orange-500/10">
                          <Bitcoin className="h-5 w-5 text-orange-400" />
                        </div>
                      </div>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <span className="text-gray-400 font-medium">BTC</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 pl-1">Minimum: 0.0001 BTC</p>
                </motion.div>

                {/* Fee Percentage Slider */}
                <motion.div 
                  className="space-y-4 bg-gradient-to-r from-gray-800/30 to-gray-800/20 rounded-xl p-5 border border-gray-700/30 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-blue-400" />
                      <label htmlFor="feePercentage" className="block text-sm font-medium text-blue-300">
                        Maximum Fee
                      </label>
                    </div>
                    <div className="px-3 py-1 rounded-md bg-gradient-to-r from-blue-500/20 to-indigo-600/20 border border-blue-500/30">
                      <span className="text-sm font-medium text-blue-300">
                        {feePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <Slider
                    id="feePercentage"
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    value={[feePercentage]}
                    onValueChange={(values: number[]) => setFeePercentage(values[0])}
                    className="py-3"
                  />
                  
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Lower Fee (0.1%)</span>
                      <span>Higher Fee (2.0%)</span>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                      <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-300">Estimated processing time:</p>
                        <p className="text-sm font-medium text-blue-400">5-10 minutes</p>
                      </div>
                    </div>
                    
                    <div className="w-full h-1.5 bg-gradient-to-r from-amber-500 via-green-500 to-blue-500 rounded-full opacity-40"></div>
                  </div>
                </motion.div>

                {/* Warning Message */}
                <motion.div 
                  className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 backdrop-blur-sm border border-amber-800/30 rounded-xl p-4 flex gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-200">
                    The system will match you with the best Boost Provider for your chosen fee. 
                    If no provider is found, your transaction will be processed through the standard 
                    ckBTC minting process (approximately 2 hours).
                  </p>
                </motion.div>

                {/* Request Address Button or Address Display */}
                <AnimatePresence mode="wait">
                  {!showAddress ? (
                    <motion.div
                      key="request-button"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    >
                      <Button 
                        onClick={handleRequestAddress}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 py-6 text-base rounded-xl relative overflow-hidden group"
                        disabled={!btcAmount || parseFloat(btcAmount) < 0.0001 || isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating Address...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Request BTC Address
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                        
                        {/* Animated background effect */}
                        <div className="absolute -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-pulse" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="address-display"
                      className="space-y-6"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50 shadow-xl backdrop-blur-sm">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-4 border-b border-gray-700/50">
                          <div className="flex justify-between items-center">
                            <h3 className="text-base font-medium text-white flex items-center gap-2">
                              <div className="p-1 rounded-full bg-orange-500/20">
                                <Bitcoin className="h-4 w-4 text-orange-400" />
                              </div>
                              Send <span className="font-bold">{btcAmount} BTC</span>
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className={`${copySuccess ? 'text-green-400 bg-green-900/30' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'} h-9 px-3 rounded-lg transition-all duration-300`}
                              onClick={handleCopyAddress}
                            >
                              {copySuccess ? (
                                <span className="flex items-center gap-1.5">
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <Copy className="h-4 w-4" />
                                  Copy Address
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-start">
                            {/* QR Code */}
                            <div className="md:col-span-2">
                              <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 p-6 aspect-square rounded-lg shadow-lg flex-shrink-0 relative group overflow-hidden flex items-center justify-center border border-blue-500/20">
                                <div className="relative">
                                  {/* Bitcoin logo overlay in the center of QR code */}
                                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                    <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-2 rounded-full shadow-lg">
                                      <Bitcoin className="h-8 w-8 text-white" />
                                    </div>
                                  </div>
                                  
                                  <div className="rounded-lg bg-gradient-to-br from-blue-500/5 to-indigo-500/5 backdrop-blur-sm">
                                    <QRCodeSVG 
                                      value={btcAddress}
                                      size={200}
                                      bgColor={"rgba(0,0,0,0)"}
                                      fgColor={"rgba(96, 165, 250, 0.9)"}
                                      level={"M"}
                                      includeMargin={true}
                                      imageSettings={{
                                        src: "",
                                        height: 32,
                                        width: 32,
                                        excavate: true,
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Subtle animated gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 pointer-events-none"></div>
                                
                                {/* Hover effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 to-indigo-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg">
                                  <p className="text-white text-sm font-medium px-4 text-center">
                                    Scan with your Bitcoin wallet app
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Address and Instructions */}
                            <div className="md:col-span-3 space-y-4">
                              <div>
                                <p className="text-sm text-blue-300 mb-2 flex items-center gap-1.5">
                                  <Copy className="h-3.5 w-3.5" />
                                  Bitcoin Address:
                                </p>
                                <div className="bg-gray-900/70 rounded-lg p-3.5 font-mono text-sm text-gray-300 break-all border border-gray-800/80 shadow-inner">
                                  {btcAddress}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-blue-300 font-medium flex items-center gap-1.5">
                                  <ChevronRight className="h-3.5 w-3.5" />
                                  Instructions:
                                </p>
                                <ol className="space-y-2.5 text-sm text-gray-300">
                                  <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">1</span>
                                    <span>Copy the address or scan the QR code with your wallet app</span>
                                  </li>
                                  <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">2</span>
                                    <span>Send <strong>exactly {btcAmount} BTC</strong> to this address</span>
                                  </li>
                                  <li className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">3</span>
                                    <span>Your ckBTC will be sent to your connected wallet automatically</span>
                                  </li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="bg-gradient-to-r from-blue-900/10 to-indigo-900/10 p-4 border-t border-gray-700/50">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <p className="text-sm text-gray-300">
                                Estimated processing time: <span className="text-green-400 font-medium">5-10 minutes</span>
                              </p>
                            </div>
                            <p className="text-sm text-gray-400">
                              Maximum fee: <span className="text-blue-400 font-medium">{feePercentage.toFixed(1)}%</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAddress(false)}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-sm h-10 px-5 rounded-lg"
                        >
                          Cancel and Start Over
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          
          {/* Features section */}
          <motion.div 
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          >
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Lightning Fast</h3>
              <p className="text-sm text-gray-400">Convert your Bitcoin to ckBTC in minutes instead of hours with our boost network.</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <Percent className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Flexible Fees</h3>
              <p className="text-sm text-gray-400">Choose your preferred fee level to balance between speed and cost based on your needs.</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm rounded-xl p-5 border border-gray-800/50">
              <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Seamless Experience</h3>
              <p className="text-sm text-gray-400">Simple interface with real-time updates and automatic delivery to your wallet.</p>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 