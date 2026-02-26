import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useBrandColors } from "@/hooks/useBrandColors";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { useInstallCheck } from "@/hooks/useInstallCheck";

import MaintenanceMode from "@/components/MaintenanceMode";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";

import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Testimonials from "./pages/Testimonials";
import FAQ from "./pages/FAQ";
import PolicyPage from "./pages/PolicyPage";
import DynamicPage from "./pages/DynamicPage";
import Login from "./pages/Login";

import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFail from "./pages/PaymentFail";
import PaymentCancel from "./pages/PaymentCancel";
import VerifyEmail from "./pages/VerifyEmail";
import OrderTracking from "./pages/OrderTracking";
import Install from "./pages/Install";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const BrandColorsLoader = ({ children }: { children: React.ReactNode }) => {
  useBrandColors();
  return <>{children}</>;
};

const InstallGuard = ({ children }: { children: React.ReactNode }) => {
  const { data: isInstalled, isLoading } = useInstallCheck();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not installed → redirect to /install (unless already there)
  if (!isInstalled && location.pathname !== '/install') {
    return <Navigate to="/install" replace />;
  }

  // Already installed → block /install page
  if (isInstalled && location.pathname === '/install') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <InstallGuard>
      <Routes>
        <Route path="/install" element={<Install />} />
        <Route path="/" element={<Index />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
        <Route path="/return-policy" element={<PolicyPage type="returns" />} />
        <Route path="/terms" element={<PolicyPage type="terms" />} />
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/page/:slug" element={<DynamicPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/fail" element={<PaymentFail />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </InstallGuard>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrandColorsLoader>
          <Toaster />
          <Sonner />
          <MaintenanceMode>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </MaintenanceMode>
        </BrandColorsLoader>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
