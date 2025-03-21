import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    // Base button styles
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    // Variant styles
    const variantStyles = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
      secondary: "bg-black text-white hover:bg-gray-900 shadow-sm border border-gray-800",
      outline: "border border-gray-800 bg-transparent text-gray-300 hover:bg-black/50 hover:border-blue-500/50",
      ghost: "bg-transparent text-gray-300 hover:bg-black/50",
      link: "bg-transparent underline-offset-4 hover:underline text-blue-400",
    };
    
    // Size styles
    const sizeStyles = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 py-2",
      lg: "h-11 px-6 text-lg",
    };
    
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
      >
        <button
          ref={ref}
          className={cn(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            className
          )}
          disabled={isLoading || props.disabled}
          {...props}
        >
          {isLoading ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : null}
          {children}
        </button>
      </motion.div>
    );
  }
);

Button.displayName = "Button";

export { Button }; 