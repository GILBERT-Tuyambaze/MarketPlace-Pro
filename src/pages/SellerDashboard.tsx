import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/context/AuthContext';
import { 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Plus,
  Edit,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  status: string;
  category: string;
  created_at: string;
}

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalSales: number;
  totalRevenue: number;
}

const SellerDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    pendingProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchStats();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch product stats
      const { data: productStats } = await supabase
        .from('products')
        .select('status')
        .eq('seller_id', user.id);

      // Fetch sales stats
      const { data: salesStats } = await supabase
        .from('orders')
        .select('total_amount, payment_status')
        .eq('seller_id', user.id)
        .eq('payment_status', 'completed');

      const totalProducts = productStats?.length || 0;
      const activeProducts = productStats?.filter(p => p.status === 'approved').length || 0;
      const pendingProducts = productStats?.filter(p => p.status === 'pending').length || 0;
      const totalSales = salesStats?.length || 0;
      const totalRevenue = salesStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      setStats({
        totalProducts,
        activeProducts,
        pendingProducts,
        totalSales,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (profile?.seller_status !== 'approved') {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <Package className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller Account Under Review</h2>
              <p className="text-gray-600 mb-6">
                Your seller account is currently being reviewed by our team. 
                You'll be able to start selling once your account is approved.
              </p>
              <Badge className="bg-yellow-100 text-yellow-800">
                Status: {profile?.seller_status?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your products and track your sales</p>
          </div>
          {(profile?.role === 'seller' || profile?.role === 'admin') && (
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => window.location.href = '/add-product'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Products</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeProducts}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalSales}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-3xl font-bold text-indigo-600">{formatPrice(stats.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Management */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">My Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">No products yet</h3>
                    <p className="text-gray-600 mb-8">Start selling by adding your first product</p>
                    <Button onClick={() => window.location.href = '/add-product'}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{product.title}</h3>
                            <Badge className={getStatusColor(product.status)}>
                              {product.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Price: {formatPrice(product.price)}</span>
                            <span>Stock: {product.stock}</span>
                            <span>Category: {product.category}</span>
                            <span>Added: {formatDate(product.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {(profile?.role === 'seller' || profile?.role === 'admin') ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => window.location.href = `/add-product?edit=${product.id}`}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={async () => {
                                if (!confirm('Delete this product? This action cannot be undone.')) return;
                                const prev = [...products];
                                try {
                                  // optimistic remove
                                  setProducts(prev => prev.filter(p => p.id !== product.id));
                                  if (supabase) {
                                    const { error } = await supabase.from('products').delete().eq('id', product.id);
                                    if (error) throw error;
                                  } else {
                                    const ref = fbDoc(firebaseDb, 'products', product.id);
                                    await fbUpdateDoc(ref, { deleted_at: fbServerTimestamp() });
                                    // or use deleteDoc(ref) to hard-delete
                                  }
                                  toast.success('Product deleted');
                                } catch (err) {
                                  console.error('Failed to delete product', err);
                                  setProducts(prev);
                                  toast.error('Failed to delete product');
                                }
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              <Edit className="h-4 w-4 mr-1" />
                              View Only
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                  <p>Order management will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Sales Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                  <p>Analytics charts and insights will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SellerDashboard;