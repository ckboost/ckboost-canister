import React, { useEffect } from 'react';
import { motion } from "framer-motion";
import { ConnectWallet, ConnectWalletButtonProps } from "@nfid/identitykit/react";
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Wallet, TrendingUp, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Prevent render if redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4">
      {/* Enhanced Background Glows */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 rounded-full blur-[100px] opacity-50 animate-pulse-slow"></div>
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/20 rounded-full blur-[100px] opacity-50 animate-pulse-slow animation-delay-2000"></div>
      
      {/* Centered Content Card */}
      <motion.div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-800/50 bg-gradient-to-b from-gray-900/80 to-gray-800/70 backdrop-blur-lg p-8 md:p-12 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon/Logo */}
          <motion.div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            LP Dashboard Access
          </motion.h1>
          
          {/* Description */}
          <motion.p 
            className="text-base md:text-lg text-gray-300 mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Connect your ICP wallet to access your ckBoost Liquidity Provider dashboard.
            Manage funds, track earnings, and view boost activity.
          </motion.p>
          
          {/* Connect Button */}
          <ConnectWallet 
              connectButtonComponent={(props: ConnectWalletButtonProps) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button 
                    onClick={(event) => { props.onClick!(event); }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-blue-500/30 border-0 flex items-center justify-center gap-2 py-3 px-6 text-lg rounded-lg"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Connect & Login</span>
                  </Button>
                </motion.div>
              )} 
            />
        </div>
      </motion.div>

      {/* Optional: Add subtle footer text if needed */}
      {/* <p className="absolute bottom-4 text-xs text-gray-600">ckBoost LP Portal</p> */}
    </div>
  );
}

// Add some basic CSS for animations if not already present elsewhere
// (e.g., in index.css)
/*
@keyframes pulse-slow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
.animate-pulse-slow {
  animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
*/ 