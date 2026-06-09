import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuth } from "./hooks/useAuth";
import { AuthContext } from "./hooks/AuthContext";
import { LiquidFilters } from "./components/liquid/LiquidFilters";

const GlobeDashboard  = lazy(() => import("./pages/dashboard/GlobeDashboard"));
const BusinessList    = lazy(() => import("./pages/businesses/BusinessList"));
const BusinessDetail  = lazy(() => import("./pages/businesses/BusinessDetail"));
const AiSummary       = lazy(() => import("./pages/ai-summary/AiSummary"));
const ConnectBusiness = lazy(() => import("./pages/connect/ConnectBusiness"));
const AiChat          = lazy(() => import("./pages/chat/AiChat"));
const TasksPage       = lazy(() => import("./pages/tasks/TasksPage"));
const LoginScreen     = lazy(() => import("./pages/login/LoginScreen"));

const PageFallback = (
  <div style={{ width: "100%", height: "100dvh", background: "#0b0b12" }} />
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function Router() {
  return (
    <Suspense fallback={PageFallback}>
      <Switch>
        <Route path="/" component={GlobeDashboard} />
        <Route path="/businesses" component={BusinessList} />
        <Route path="/businesses/:id" component={BusinessDetail} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/ai-summary" component={AiSummary} />
        <Route path="/chat" component={AiChat} />
        <Route path="/connect" component={ConnectBusiness} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppInner() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Suspense fallback={PageFallback}>
        <LoginScreen onLogin={login} />
      </Suspense>
    );
  }

  return (
    <AuthContext.Provider value={{ logout }}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LiquidFilters />
        <AppInner />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
