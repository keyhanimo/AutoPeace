import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold tracking-wide uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary/80 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] active:bg-primary/80 active:scale-[0.98]",
        destructive: "bg-destructive/90 text-destructive-foreground border border-destructive/60 hover:bg-destructive hover:border-destructive/80 active:bg-destructive/80 active:scale-[0.98]",
        outline: "border border-border/80 bg-transparent text-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 active:bg-primary/10 active:scale-[0.98]",
        secondary: "border border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-border active:bg-secondary/60 active:scale-[0.98]",
        ghost: "border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:bg-secondary/80 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 px-3 text-xs",
        lg: "min-h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
