import React from 'react';
import { ConnectWallet, ConnectWalletButtonProps } from "@nfid/identitykit/react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Wallet, Zap, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <motion.header 
      className="sticky top-0 z-50 w-full border-b border-gray-900/50 bg-black/80 backdrop-blur-md"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            className="flex items-center justify-center rounded-full bg-gradient-blue-purple p-2 glow"
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(59, 130, 246, 0.7)" }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
                className="h-6 w-6 text-white"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
          </motion.div>
          <motion.h1 
            className="text-xl font-bold text-gradient group-hover:opacity-90 transition-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            ckBoost
          </motion.h1>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            // Navigation for authenticated users
            <>
              <NavLink to="/" active={isHomePage}>
                Home
              </NavLink>
              <NavLink to="/wallet" active={location.pathname === "/wallet"}>
                <div className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  <span>Wallet</span>
                </div>
              </NavLink>
              <NavLink to="/boost" active={location.pathname === "/boost"}>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span>Boost</span>
                </div>
              </NavLink>
              <NavLink to="/history" active={location.pathname === "/history"}>
                <div className="flex items-center gap-1">
                  <History className="h-4 w-4" />
                  <span>History</span>
                </div>
              </NavLink>
            </>
          ) : (
            // Navigation for non-authenticated users (homepage sections)
            isHomePage && (
              <>
                <NavLink to="#features" isHashLink active={false}>
                  Features
                </NavLink>
                <NavLink to="#how-it-works" isHashLink active={false}>
                  How It Works
                </NavLink>
                <NavLink to="#booster-network" isHashLink active={false}>
                  Booster Network
                </NavLink>
              </>
            )
          )}
        </nav>
        <div className="flex items-center gap-4">
          <ConnectWallet 
            connectButtonComponent={(props: ConnectWalletButtonProps) => (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button 
                  onClick={(event) => props.onClick!(event)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 border-0 flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </Button>
              </motion.div>
            )} 
          />
        </div>
      </div>
    </motion.header>
  );
}

// Reusable NavLink component
interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  active?: boolean;
  isHashLink?: boolean;
}

function NavLink({ to, children, active, isHashLink = false }: NavLinkProps) {
  // Use conditional rendering instead of dynamic component
  if (isHashLink) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <a
          href={to}
          className={`text-sm font-medium ${active ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400 transition-colors relative group`}
          onClick={(e) => {
            e.preventDefault();
            const element = document.querySelector(to);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {children}
          <motion.span 
            className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300"
            initial={{ width: 0 }}
            whileHover={{ width: "100%" }}
          />
        </a>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        to={to}
        className={`text-sm font-medium ${active ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400 transition-colors relative group`}
      >
        {children}
        <motion.span 
          className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300"
          initial={{ width: 0 }}
          whileHover={{ width: "100%" }}
        />
      </Link>
    </motion.div>
  );
} 