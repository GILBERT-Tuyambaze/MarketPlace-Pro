import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/context/AuthContext';
import { Package, Eye, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  shipping_address?: string;
  tracking_number?: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    images?: string[];
  };
  seller: {
    full_name: string;
  };
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeTab]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          product:products(id, title, images),
          seller:profiles!orders_seller_id_fkey(full_name)
        `);

      // Filter based on user role
      if (profile?.role === 'seller') {
        query = query.eq('seller_id', user.id);
      } else {
        query = query.eq('buyer_id', user.id);
      }

      // Apply status filter
      if (activeTab !== 'all') {
        if (activeTab === 'pending') {
          query = query.in('order_status', ['processing']);
        } else if (activeTab === 'shipped') {
          query = query.eq('order_status', 'shipped');
        } else if (activeTab === 'delivered') {
          query = query.eq('order_status', 'delivered');
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
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
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
            <h1 className="text-4xl font-bold text-gray-900">
              {profile?.role === 'seller' ? 'Sales Orders' : 'My Orders'}
            </h1>
            <p className="text-gray-600 mt-2">
              {profile?.role === 'seller' 
                ? 'Manage your product sales and customer orders'
                : 'Track your purchases and order history'
              }
            </p>
          </div>
        </div>

        {/* Order Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">No orders found</h2>
                <p className="text-gray-600 mb-8">
                  {profile?.role === 'seller' 
                    ? "You haven't received any orders yet."
                    : "You haven't placed any orders yet."
                  }
                </p>
                <Button asChild>
                  <Link to={profile?.role === 'seller' ? '/seller/dashboard' : '/products'}>
                    {profile?.role === 'seller' ? 'Manage Products' : 'Start Shopping'}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          {order.product.images && order.product.images.length > 0 ? (
                            <img 
                              src={order.product.images[0]} 
                              alt={order.product.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>

                        {/* Order Details */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                <Link 
                                  to={`/products/${order.product.id}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {order.product.title}
                                </Link>
                              </h3>
                              <p className="text-sm text-gray-600">
                                {profile?.role === 'seller' 
                                  ? `Ordered by customer`
                                  : `Sold by ${order.seller.full_name}`
                                }
                              </p>
                              <p className="text-sm text-gray-500">
                                Order placed on {formatDate(order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {formatPrice(order.total_amount)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Qty: {order.quantity}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Badge className={`${getStatusColor(order.order_status)} flex items-center`}>
                                {getStatusIcon(order.order_status)}
                                <span className="ml-1 capitalize">{order.order_status}</span>
                              </Badge>
                              
                              {order.payment_status === 'completed' && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </Badge>
                              )}

                              {order.tracking_number && (
                                <span className="text-sm text-gray-600">
                                  Tracking: <code className="bg-gray-100 px-1 rounded">{order.tracking_number}</code>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                              
                              {profile?.role === 'seller' && order.order_status === 'processing' && (
                                <Button size="sm">
                                  Mark as Shipped
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default OrdersPage;