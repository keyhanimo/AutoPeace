import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Menu, X, Activity, BarChart2, DollarSign, FlaskConical, BookOpen,
  HelpCircle, Shield, ChevronRight, Handshake, Users, Swords,
  Search, GitCompare, Send, Database, Code2, Eye, MoreHorizontal, Microscope,
} from "lucide-react";
import { CycleStatusIndicator } from "./CycleStatusIndicator";

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Research",
    items: [
      { href: "/", label: "Home", icon: Activity },
      { href: "/deals", label: "Deal Dashboard", icon: Handshake },
      { href: "/arena", label: "Proposal Arena", icon: Swords },
      { href: "/forecasts", label: "Forecasts", icon: BarChart2 },
      { href: "/costs", label: "Cost-Benefit Analysis", icon: DollarSign },
    ],
  },
  {
    label: "Explorer",
    items: [
      { href: "/stakeholders", label: "Stakeholders", icon: Users, exact: true },
      { href: "/stakeholders/compare", label: "Compare Actors", icon: GitCompare },
      { href: "/stakeholders/lens", label: "Stakeholder Lens", icon: Eye },
      { href: "/evidence", label: "Evidence Explorer", icon: Search },
      { href: "/lab", label: "Autoresearch Lab", icon: Microscope },
      { href: "/experiments", label: "Experiment Log", icon: FlaskConical },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/submit", label: "Submit Proposal", icon: Send },
      { href: "/data", label: "Data Portal", icon: Database },
      { href: "/api-docs", label: "API Docs", icon: Code2 },
    ],
  },
  {
    label: "Info",
    items: [
      { href: "/changelog", label: "Changelog", icon: BookOpen },
      { href: "/methodology", label: "Methodology", icon: HelpCircle },
      { href: "/admin", label: "Admin", icon: Shield },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

const BOTTOM_TABS = [
  { href: "/", label: "Home", icon: Activity, exact: true },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/forecasts", label: "Forecasts", icon: BarChart2 },
  { href: "/stakeholders", label: "Actors", icon: Users, exact: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    location.pathname === href || (!exact && href !== "/" && location.pathname.startsWith(href));

  const isBottomTabActive = BOTTOM_TABS.some(t => isActive(t.href, t.exact));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card/50 backdrop-blur-sm fixed top-0 left-0 h-full z-40">
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <span className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors tracking-tight">
              AutoPeace
            </span>
          </Link>
          <p className="text-[10px] text-muted-foreground mt-1 ml-4 uppercase tracking-widest font-semibold">Iran Conflict Monitor</p>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto" aria-label="Main navigation">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = isActive(href, exact);
                  return (
                    <Link
                      key={href}
                      to={href}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-100 group relative
                        ${active
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />}
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      <span className="tracking-wide">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-primary/60" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <CycleStatusIndicator />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center px-4 z-50">
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <span className="font-display font-bold text-base text-foreground tracking-tight">AutoPeace</span>
        </Link>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors rounded-md"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-14 left-0 right-0 bottom-0 bg-card overflow-y-auto">
            <div className="p-3 space-y-3 pb-24">
              {NAV_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-1">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon, exact }) => {
                      const active = isActive(href, exact);
                      return (
                        <Link
                          key={href}
                          to={href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors relative
                            ${active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}
                          aria-current={active ? "page" : undefined}
                        >
                          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />}
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="px-3 pt-2">
                <CycleStatusIndicator />
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border/50 z-50 flex items-stretch safe-bottom" aria-label="Quick navigation">
        {BOTTOM_TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              to={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
                ${active ? "text-primary" : "text-muted-foreground"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
            ${mobileOpen || !isBottomTabActive ? "text-primary" : "text-muted-foreground"}`}
          aria-label="More navigation options"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pt-20 lg:pt-6 pb-24 lg:pb-6 max-w-6xl mx-auto w-full">
          {children}
        </div>
        <footer className="hidden lg:flex lg:ml-0 border-t border-border/30 px-6 py-4 text-xs text-muted-foreground flex-wrap gap-4 items-center justify-between bg-card/30">
          <span>AutoPeace — AI-powered conflict research · For educational and research use only</span>
          <div className="flex gap-4">
            <Link to="/methodology" className="hover:text-primary transition-colors">Methodology</Link>
            <Link to="/data" className="hover:text-primary transition-colors">Data</Link>
            <a href="https://github.com/keyhanimo/AutoPeace" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
            <a href="https://replit.com/@keyhanimo/AutoPeace" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Remix on Replit</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

export { ALL_NAV_ITEMS };
