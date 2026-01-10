import { lazy } from 'react';

// Lazy load heavy components that aren't needed immediately
export const LazyCartDrawer = lazy(() => import('@/components/CartDrawer'));
export const LazyCheckoutModal = lazy(() => import('@/components/CheckoutModal'));
export const LazySearchDialog = lazy(() => import('@/components/SearchDialog'));
export const LazyFloatingWhatsApp = lazy(() => import('@/components/FloatingWhatsApp'));
export const LazyFooter = lazy(() => import('@/components/Footer'));
export const LazyProductGrid = lazy(() => import('@/components/ProductGrid'));
