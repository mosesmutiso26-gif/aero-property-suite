import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Properties from "./pages/dashboard/Properties";
import Units from "./pages/dashboard/Units";
import UserManagement from "./pages/dashboard/UserManagement";
import Tenants from "./pages/dashboard/Tenants";
import Maintenance from "./pages/dashboard/Maintenance";
import Invoices from "./pages/dashboard/Invoices";
import Payments from "./pages/dashboard/Payments";
import Reports from "./pages/dashboard/Reports";
import SettingsPage from "./pages/dashboard/SettingsPage";
import MyUnit from "./pages/dashboard/MyUnit";
import Profile from "./pages/dashboard/Profile";
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
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
            <Route path="/dashboard/properties" element={<DashboardLayout><Properties /></DashboardLayout>} />
            <Route path="/dashboard/units" element={<DashboardLayout><Units /></DashboardLayout>} />
            <Route path="/dashboard/users" element={<DashboardLayout><UserManagement /></DashboardLayout>} />
            <Route path="/dashboard/tenants" element={<DashboardLayout><Tenants /></DashboardLayout>} />
            <Route path="/dashboard/maintenance" element={<DashboardLayout><Maintenance /></DashboardLayout>} />
            <Route path="/dashboard/invoices" element={<DashboardLayout><Invoices /></DashboardLayout>} />
            <Route path="/dashboard/payments" element={<DashboardLayout><Payments /></DashboardLayout>} />
            <Route path="/dashboard/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
            <Route path="/dashboard/settings" element={<DashboardLayout><SettingsPage /></DashboardLayout>} />
            <Route path="/dashboard/my-unit" element={<DashboardLayout><MyUnit /></DashboardLayout>} />
            <Route path="/dashboard/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
