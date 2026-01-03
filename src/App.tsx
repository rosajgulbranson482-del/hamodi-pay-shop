import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CustomerAuth from "./pages/CustomerAuth";
import Admin from "./pages/Admin";
import TrackOrder from "./pages/TrackOrder";
import ProductDetails from "./pages/ProductDetails";
import MyOrders from "./pages/MyOrders";
import AccountSettings from "./pages/AccountSettings";
import Favorites from "./pages/Favorites";
import Checkout from "./pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
