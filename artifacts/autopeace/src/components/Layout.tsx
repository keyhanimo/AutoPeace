import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X, Activity, BarChart2, DollarSign, FlaskConical, BookOpen, HelpCircle, Shield, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Activity },
  { href: "/forecasts", label: "Forecasts", icon: BarChart2 },
  { href: "/costs", label: "Cost Explorer", icon: DollarSign },
  { href: "/experiments", label: "Experiment Log", icon: FlaskConical },
  { href: "/changelog", label: "Changelog", icon: BookOpen },
  { href: "/methodology", label: "Methodology", icon: HelpCircle },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card/50 backdrop-blur-sm fixed top-0 left-0 h-full z-40">
        <div className="p-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              AutoPeace
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1 ml-10">Iran Conflict Monitor</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                  ${isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span>{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="rounded-lg bg-secondary/40 border border-border/30 p-3">
            <p className="text-xs text-muted-foreground">AI-powered forecasting</p>
            <p className="text-xs font-medium text-foreground mt-0.5">Updated continuously</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center px-4 z-50">
        <Link href="/" className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-display font-bold text-base text-foreground">AutoPeace</span>
        </Link>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-14 left-0 right-0 bg-card border-b border-border/50 p-3 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = location === href || (href !== "/" && location.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="px-4 py-6 lg:px-8 lg:py-8 pt-20 lg:pt-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
