import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";

// Pages
import Home from "@/pages/Home";
import ForecastDashboard from "@/pages/ForecastDashboard";
import CostsExplorer from "@/pages/CostsExplorer";
import ExperimentLog from "@/pages/ExperimentLog";
import Changelog from "@/pages/Changelog";
import Methodology from "@/pages/Methodology";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/forecasts" component={ForecastDashboard} />
        <Route path="/costs" component={CostsExplorer} />
        <Route path="/experiments" component={ExperimentLog} />
        <Route path="/changelog" component={Changelog} />
        <Route path="/methodology" component={Methodology} />
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
