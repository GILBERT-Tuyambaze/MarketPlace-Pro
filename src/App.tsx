import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

// Pages
import Index from './pages/Index';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import SellerProfile from './pages/SellerProfile';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminClaimsManager from './pages/AdminClaimsManager';
import SellerDashboard from './pages/SellerDashboard';
import EditorDashboard from './pages/EditorDashboard';
import ContentManagerDashboard from './pages/ContentManagerDashboard';
import AddProduct from './pages/AddProduct';
import SeedData from './pages/SeedData';
import Diagnostics from './pages/Diagnostics';
import NotFound from './pages/NotFound';
import MarketplaceLocked from './pages/MarketplaceLocked';
import ProtectedRoute from '@/components/Layout/ProtectedRoute';

const queryClient = new QueryClient();

// Root layout component that checks marketplace lock
const RootLayout = () => {
  const { platformSettings, profile, loading, settingsLoading } = useAuth();
  const currentPath = window.location.pathname;

  // Wait for both user and settings to load
  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // List of paths allowed during marketplace lock (only auth and locked page)
  const allowedPathsDuringLock = [
    '/admin/login',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/seed-data',
    '/diagnostics'
  ];

  const isAllowedPath = allowedPathsDuringLock.some(path => currentPath.startsWith(path));
  const isAdminPath = currentPath.startsWith('/admin/');

  // Show locked page for non-admins when marketplace is locked
  // BUT always allow admins to access all /admin/* routes
  if (platformSettings?.marketplace_locked && profile?.role !== 'admin') {
    // If they try to access any non-allowed page (and not admin path), show locked page
    if (!isAllowedPath && !isAdminPath) {
      return <MarketplaceLocked />;
    }
  }

  return <RouterProvider router={router} />;
};

// Define routes
const router = createBrowserRouter([
  { path: '/', element: <Index /> },
  { path: '/products', element: <Products /> },
  { path: '/products/:id', element: <ProductDetail /> },
  { path: '/seller/:sellerId', element: <SellerProfile /> },
  { path: '/cart', element: <Cart /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/admin/login', element: <AdminLogin /> },
  { path: '/seed-data', element: <SeedData /> },
  { path: '/diagnostics', element: <Diagnostics /> },

  {
    path: '/checkout',
    element: (
      <ProtectedRoute>
        <Checkout />
      </ProtectedRoute>
    ),
  },
  {
    path: '/orders',
    element: (
      <ProtectedRoute>
        <Orders />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },

  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin']} skipMarketplaceLock={true}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/claims-manager',
    element: (
      <ProtectedRoute allowedRoles={['admin']} skipMarketplaceLock={true}>
        <AdminClaimsManager />
      </ProtectedRoute>
    ),
  },
  {
    path: '/seller/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['seller', 'admin']}>
        <SellerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/editor/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['editor', 'admin']}>
        <EditorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/content-manager/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['content_manager', 'admin']}>
        <ContentManagerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path:'/add-product',
    element: (
      <ProtectedRoute allowedRoles={['seller','admin']}>
        <AddProduct />
      </ProtectedRoute>

     ),
  },
  { path: '*', element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <RootLayout />
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
