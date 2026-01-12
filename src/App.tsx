import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Suspense, lazy, useEffect } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CustomerAuth = lazy(() => import("./pages/CustomerAuth"));
const Admin = lazy(() => import("./pages/Admin"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Checkout = lazy(() => import("./pages/Checkout"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Deferred visitor tracking - loads after initial paint
const DeferredVisitorTracker = () => {
  useEffect(() => {
    // Use requestIdleCallback to load tracker after page is interactive
    const loadTracker = () => {
      import("./hooks/useVisitorTracking").then(({ useVisitorTracking }) => {
        // Hook is imported, component will use it
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadTracker, { timeout: 2000 });
    } else {
      setTimeout(loadTracker, 1000);
    }
  }, []);
  
  return null;
};

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/auth" element={<CustomerAuth />} />
                <Route path="/login" element={<CustomerAuth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/account" element={<AccountSettings />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <DeferredVisitorTracker />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
