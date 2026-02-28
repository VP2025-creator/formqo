import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FormRenderer from "./pages/FormRenderer";
import FormBuilder from "./pages/FormBuilder";
import FormResponses from "./pages/FormResponses";
import FormAnalytics from "./pages/FormAnalytics";
import Integrations from "./pages/Integrations";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Pages WITHOUT the shared footer */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/builder" element={<FormBuilder />} />
            <Route path="/f/:formId" element={<FormRenderer />} />

            {/* Pages WITH the shared footer */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/forms/:formId/responses" element={<FormResponses />} />
              <Route path="/forms/:formId/analytics" element={<FormAnalytics />} />
              <Route path="/dashboard/integrations" element={<Integrations />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
