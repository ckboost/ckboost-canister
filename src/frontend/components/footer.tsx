import { motion } from "framer-motion";

export function Footer() {
  return (
    <footer className="bg-black py-12 text-gray-300 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-dark-blue bg-gradient-animated opacity-10" />
      
      {/* Animated dots */}
      <div className="animated-dots">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="dot"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${Math.random() * 10 + 15}s`,
            }}
          />
        ))}
      </div>
      
      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            className="mb-4 flex items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-blue-purple glow">
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
            </div>
            <h3 className="text-xl font-bold text-gradient">ckBoost</h3>
          </motion.div>
          <motion.p
            className="mb-4 text-sm max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Fast Bitcoin to ckBTC conversion for the Internet Computer ecosystem.
          </motion.p>
        </div>
        
        <motion.div
          className="mt-12 border-t border-gray-900 pt-8 text-center text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="text-gray-500">&copy; {new Date().getFullYear()} ckBoost. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
} 