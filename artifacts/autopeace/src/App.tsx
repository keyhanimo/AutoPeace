import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";

import Home from "@/pages/Home";
import ForecastDashboard from "@/pages/ForecastDashboard";
import CostsExplorer from "@/pages/CostsExplorer";
import ExperimentLog from "@/pages/ExperimentLog";
import AutoresearchLab from "@/pages/AutoresearchLab";
import Changelog from "@/pages/Changelog";
import ChangelogEntry from "@/pages/ChangelogEntry";
import Methodology from "@/pages/Methodology";
import AdminPanel from "@/pages/AdminPanel";
import DealDashboard from "@/pages/DealDashboard";
import ProposalArena from "@/pages/ProposalArena";
import Stakeholders from "@/pages/Stakeholders";
import EvidenceExplorer from "@/pages/EvidenceExplorer";
import StakeholderComparison from "@/pages/StakeholderComparison";
import StakeholderLens from "@/pages/StakeholderLens";
import SubmitProposal from "@/pages/SubmitProposal";
import DataPortal from "@/pages/DataPortal";
import ApiDocs from "@/pages/ApiDocs";
import Live from "@/pages/Live";
import DealPermalink from "@/pages/DealPermalink";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deals" element={<DealDashboard />} />
        <Route path="/deals/:id" element={<DealPermalink />} />
        <Route path="/arena" element={<ProposalArena />} />
        <Route path="/stakeholders" element={<Stakeholders />} />
        <Route path="/stakeholders/compare" element={<StakeholderComparison />} />
        <Route path="/stakeholders/lens" element={<StakeholderLens />} />
        <Route path="/forecasts" element={<ForecastDashboard />} />
        <Route path="/costs" element={<CostsExplorer />} />
        <Route path="/lab" element={<AutoresearchLab />} />
        <Route path="/experiments" element={<AutoresearchLab />} />
        <Route path="/evidence" element={<EvidenceExplorer />} />
        <Route path="/submit" element={<SubmitProposal />} />
        <Route path="/data" element={<DataPortal />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/changelog/:id" element={<ChangelogEntry />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/live" element={<Live />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
