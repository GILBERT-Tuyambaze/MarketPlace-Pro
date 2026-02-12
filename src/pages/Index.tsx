import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { 
  ShoppingBag, 
  Users, 
  Star, 
  TrendingUp, 
  Shield, 
  Zap,
  ArrowRight,
  ChevronDown,
  BarChart3,
  Package,
  Settings,
  LogOut,
  ShoppingCart,
  Edit
} from 'lucide-react';

const categories = [
  { name: 'Electronics', count: '2.5K+', image: '📱', color: 'bg-blue-500' },
  { name: 'Fashion', count: '3.2K+', image: '👗', color: 'bg-pink-500' },
  { name: 'Home & Garden', count: '1.8K+', image: '🏠', color: 'bg-green-500' },
  { name: 'Books & Media', count: '4.1K+', image: '📚', color: 'bg-purple-500' },
  { name: 'Sports', count: '1.2K+', image: '⚽', color: 'bg-orange-500' },
  { name: 'Beauty', count: '2.0K+', image: '💄', color: 'bg-red-500' },
];

const features = [
  { icon: Shield, title: 'Secure Payments', description: 'Protected transactions with Stripe integration and buyer protection.' },
  { icon: Users, title: 'Verified Sellers', description: 'All sellers go through verification to ensure quality and trust.' },
  { icon: Zap, title: 'Fast Shipping', description: 'Quick delivery options with real-time tracking for all orders.' },
  { icon: Star, title: '24/7 Support', description: 'Round-the-clock customer support to help with any questions.' },
];

const stats = [
  { number: '50K+', label: 'Active Users' },
  { number: '10K+', label: 'Products' },
  { number: '2.5K+', label: 'Sellers' },
  { number: '99.8%', label: 'Satisfaction' },
];

// Buyer Dashboard Component
const BuyerDashboard = ({ profile }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {profile?.full_name}! 👋</h1>
        <p className="text-xl text-gray-600">Happy shopping! Explore our latest products.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <ShoppingCart className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-gray-600 text-sm">Active Orders</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Star className="h-8 w-8 text-yellow-600 mb-2" />
            <p className="text-gray-600 text-sm">Favorited Items</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-gray-600 text-sm">Saved for Later</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Shield className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-gray-600 text-sm">Account Status</p>
            <p className="text-xl font-bold text-green-600">Verified</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Shopping</h2>
          <p className="text-gray-600 mb-6">Browse thousands of products from verified sellers</p>
          <Link to="/products">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Explore Products
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Seller Dashboard Component
const SellerDashboard = ({ profile }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Seller Dashboard - {profile?.full_name}</h1>
        <p className="text-xl text-gray-600">Status: <span className="font-semibold text-green-600">{profile?.seller_status || 'pending'}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Package className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-gray-600 text-sm">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <ShoppingCart className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-gray-600 text-sm">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-gray-600 text-sm">Revenue</p>
            <p className="text-2xl font-bold text-gray-900">$0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Star className="h-8 w-8 text-yellow-600 mb-2" />
            <p className="text-gray-600 text-sm">Rating</p>
            <p className="text-2xl font-bold text-gray-900">-</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/add-product">
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Package className="mr-2 h-5 w-5" />
                Add New Product
              </Button>
            </Link>
            <Link to="/seller-dashboard">
              <Button variant="outline" className="w-full">
                <BarChart3 className="mr-2 h-5 w-5" />
                View Analytics
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-5 w-5" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Admin Dashboard Component
const AdminDashboard = ({ profile }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4">
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel - {profile?.full_name}</h1>
        <p className="text-xl text-gray-600">System Administration & Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Users className="h-8 w-8 text-blue-600 mb-2" />
            <p className="text-gray-600 text-sm">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <Package className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-gray-600 text-sm">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <ShoppingCart className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-gray-600 text-sm">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
            <p className="text-gray-600 text-sm">Platform Revenue</p>
            <p className="text-2xl font-bold text-gray-900">$0</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin-dashboard">
              <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                <BarChart3 className="mr-2 h-5 w-5" />
                Admin Dashboard
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full">
                <Edit className="mr-2 h-5 w-5" />
                Manage Settings
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" className="w-full">
                <Package className="mr-2 h-5 w-5" />
                Browse Products
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show role-based dashboard if logged in
  if (!loading && user && profile) {
    if (profile.role === 'seller') {
      return <SellerDashboard profile={profile} />;
    } else if (profile.role === 'admin') {
      return <AdminDashboard profile={profile} />;
    } else if (profile.role === 'customer') {
      return <BuyerDashboard profile={profile} />;
    }
  }

  // Show landing page if not logged in
  return (
    <Layout>
    
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-6">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-4xl md:text-7xl font-bold leading-tight">
              Discover Amazing
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Products & Sellers
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed animate-in fade-in delay-300 duration-1000">
              Join thousands of buyers and sellers in our premium marketplace. 
              Find unique products, start your business, and connect with a global community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in delay-500 duration-1000">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg font-medium group">
                <Link to="/products" className="flex items-center">
                  Start Shopping
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg font-medium group">
                <Link to={user ? "/seller-dashboard" : "/register"} className="flex items-center">
                  Become a Seller
                  <TrendingUp className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-8 w-8 text-white/60" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center scroll-animate" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Explore Categories</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover millions of products across diverse categories from verified sellers worldwide.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <Link
                key={index}
                to={`/products?category=${category.name.toLowerCase().replace(' & ', '-').replace(' ', '-')}`}
                className="group scroll-animate"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 group-hover:scale-105 border-0 bg-white">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${category.color} flex items-center justify-center text-2xl`}>
                      {category.image}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.count} products</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Why Choose MarketPlace Pro?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide the best marketplace experience with cutting-edge features and unmatched security.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center scroll-animate group" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="scroll-animate">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Join thousands of successful sellers and happy customers. Start selling or shopping today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" className="px-8 py-4 text-lg font-medium">
                <Link to="/register">Get Started Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/100 text-black/100 hover:bg-white/10 px-8 py-4 text-lg">
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
