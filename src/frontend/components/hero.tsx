"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { Link } from "react-router-dom";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export function Hero() {  
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };
  
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black py-20 md:py-28 lg:py-32">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-indigo-500/[0.05] blur-3xl" />
      
      {/* Elegant shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-blue-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-indigo-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-orange-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
      </div>
      
      {/* Content container */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col items-center justify-center">
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-700/30 mb-8 md:mb-12"
          >
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium tracking-wide">
              10x Faster Conversion
            </span>
          </motion.div>
          
          {/* Heading */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-8"
          >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 md:mb-8 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                Boost                
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-500"> Bitcoin
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                {" "}to
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600">
                {" "}ckBTC
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                conversion
              </span>
            </h1>
          </motion.div>
          
          {/* Description */}
          <motion.div
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-12"
          >
            <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
              Skip the traditional 1-hour wait time and convert your Bitcoin to ckBTC in just minutes. 
              Get instant access to the Internet Computer ecosystem with our boosting service.
            </p>
          </motion.div>
          
          <AnimatePresence>
              <motion.div
                custom={3}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -30, transition: { duration: 0.5 } }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <Link to="https://testnet-faucet.ckboost.com" target="_blank">
                  <Button 
                    size="lg" 
                    className="min-w-[160px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20"
                  >
                    <span className="flex items-center">
                      <span>Faucet</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Button>
                </Link>
                <Link to="https://btvft-laaaa-aaaao-qkagq-cai.icp0.io/" target="_blank">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 hover-lift"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Become a Booster
                  </Button>
                </Link>
              </motion.div>
            
          </AnimatePresence>
          
        </div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />
    </section>
  );
} 