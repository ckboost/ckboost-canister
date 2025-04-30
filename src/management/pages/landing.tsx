import React, { useEffect } from 'react';
import { motion } from "framer-motion";
import { ConnectWallet, ConnectWalletButtonProps } from "@nfid/identitykit/react";
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Wallet, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Header } from '../components/header';
import { Footer } from '../components/footer';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true }); 
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <Header /> 
      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-1/4 left-1/4 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-[80px] opacity-40 animate-pulse-slow"></div>
              <div className="absolute -bottom-1/4 right-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[80px] opacity-40 animate-pulse-slow animation-delay-2000"></div>
          </div>

          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.5 }}
            >
              ckBoost Liquidity Dashboard
            </motion.h1>
            <motion.p 
              className="text-lg md:text-xl text-gray-300 mb-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
            >
              Connect your wallet to manage your booster account, provide liquidity, and view transaction activity.
            </motion.p>
            
            <ConnectWallet 
                connectButtonComponent={(props: ConnectWalletButtonProps) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  >
                    <Button 
                      onClick={(event) => { props.onClick!(event); }}
                      className="w-full max-w-xs mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-blue-500/30 border-0 flex items-center justify-center gap-2 py-3 px-6 text-lg rounded-lg"
                    >
                      <LogIn className="h-5 w-5" />
                      <span>Connect Wallet & Login</span>
                    </Button>
                  </motion.div>
                )} 
              />
          </motion.div>
      </main>
      <Footer />
    </div>
  );
} 