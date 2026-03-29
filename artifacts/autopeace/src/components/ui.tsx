import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card/50 backdrop-blur-xl border border-border/50 rounded-sm shadow-xl shadow-black/20 overflow-hidden",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: "bg-primary text-primary-foreground border border-primary/80 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] active:bg-primary/80 active:scale-[0.98]",
      outline: "border border-border/80 bg-transparent text-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:bg-primary/10 active:scale-[0.98]",
      ghost: "bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:bg-secondary/80 active:scale-[0.98]",
      destructive: "bg-destructive/90 text-destructive-foreground border border-destructive/60 hover:bg-destructive hover:border-destructive/80 active:bg-destructive/80 active:scale-[0.98]"
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base font-medium"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-sm font-semibold uppercase tracking-wide transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-40 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-sm border border-border bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'destructive' | 'warning' | 'outline' }) => {
  const variants = {
    default: "border-l-primary bg-primary/10 text-primary",
    success: "border-l-success bg-success/10 text-success",
    destructive: "border-l-destructive bg-destructive/10 text-destructive",
    warning: "border-l-warning bg-warning/10 text-warning",
    outline: "border-l-border bg-transparent text-muted-foreground"
  };
  
  return (
    <span className={cn("border-l-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest inline-flex items-center", variants[variant], className)}>
      {children}
    </span>
  );
};

export const PageHeader = ({ title, description, children }: { title: string, description?: string, children?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground max-w-2xl">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-3">{children}</div>}
  </div>
);
