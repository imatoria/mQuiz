// v2 - force publish
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { InstallPrompt } from "@/components/ui/install-prompt";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Communications from "./pages/Communications";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Dashboard } from "./pages/Dashboard";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth",
    element: <Index />,
  },
  {
    path: "/parent/:tab?/:subtab?",
    element: <Dashboard />,
  },
  {
    path: "/admin/:tab?/:subtab?",
    element: <Dashboard />,
  },
  {
    path: "/student/:tab?/:subtab?",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
        <InstallPrompt />
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
