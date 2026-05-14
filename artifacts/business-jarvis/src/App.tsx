import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import GlobeDashboard from "./pages/dashboard/GlobeDashboard";
import BusinessList from "./pages/businesses/BusinessList";
import BusinessDetail from "./pages/businesses/BusinessDetail";
import AiSummary from "./pages/ai-summary/AiSummary";
import ConnectBusiness from "./pages/connect/ConnectBusiness";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={GlobeDashboard} />
      <Route path="/businesses" component={BusinessList} />
      <Route path="/businesses/:id" component={BusinessDetail} />
      <Route path="/ai-summary" component={AiSummary} />
      <Route path="/connect" component={ConnectBusiness} />
      <Route component={NotFound} />
    </Switch>
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
