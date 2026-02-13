import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { Package, Eye, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

interface ShippingInfo {
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  created_at: any;
  updated_at: any;
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
  }, [user, activeTab, profile]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      
      // If seller, query orders that include their seller id
      let querySnapshot;
      if (profile?.role === 'seller') {
        const q = query(ordersRef, where('sellers', 'array-contains', profile.id));
        querySnapshot = await getDocs(q);
      } else {
        // Query orders for current user (using user_id field from checkout)
        const q = query(ordersRef, where('user_id', '==', user.uid));
        querySnapshot = await getDocs(q);
      }

      let fetchedOrders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      
      // Sort client-side to avoid composite index (newest first)
      fetchedOrders.sort((a, b) => {
        const aTime = a.created_at?.toMillis?.() || 0;
        const bTime = b.created_at?.toMillis?.() || 0;
        return bTime - aTime;
      });

      // Apply status filter
      if (activeTab !== 'all') {
        if (activeTab === 'pending') {
          fetchedOrders = fetchedOrders.filter(order => order.status === 'pending');
        } else if (activeTab === 'shipped') {
          fetchedOrders = fetchedOrders.filter(order => order.status === 'shipped');
        } else if (activeTab === 'delivered') {
          fetchedOrders = fetchedOrders.filter(order => order.status === 'delivered');
        }
      }

      // Enrich items with product info when available (product name)
      const enriched = await Promise.all(fetchedOrders.map(async (order) => {
        const itemsWithDetails = await Promise.all(order.items.map(async (item: any) => {
          try {
            const pRef = doc(db, 'products', item.product_id);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const p = pSnap.data();
              return {
                ...item,
                product_name: p.title || p.name || '',
                product_image: p.images?.[0] || p.image || '',
              };
            }
          } catch (err) {
            console.error('Error fetching product for order item:', err);
          }
          return item;
        }));

        return { ...order, items: itemsWithDetails } as Order;
      }));

      setOrders(enriched);
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

  const updateItemStatus = async (orderId: string, itemIndex: number, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        toast.error('Order not found');
        return;
      }

      const data: any = orderSnap.data();
      const items = Array.isArray(data.items) ? data.items : [];
      if (itemIndex < 0 || itemIndex >= items.length) {
        toast.error('Invalid item index');
        return;
      }

      items[itemIndex] = { ...items[itemIndex], status: newStatus };

      await updateDoc(orderRef, {
        items,
        updated_at: Timestamp.now(),
      });

      toast.success('Item status updated');
      fetchOrders();
    } catch (err) {
      console.error('Error updating item status:', err);
      toast.error('Failed to update item status');
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
                      {/* Order Summary */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Order ID: <code className="bg-gray-100 px-2 py-1 rounded">{order.id}</code></p>
                            <p className="text-sm text-gray-500 mt-1">
                              Placed on {new Date(order.created_at?.toMillis?.() || order.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatPrice(order.totalAmount)}
                            </div>
                            <Badge className={`${getStatusColor(order.status)} flex items-center justify-center mt-2`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm font-medium text-blue-900 mb-2">Shipping Address</p>
                        <p className="text-sm text-gray-700">{order.shippingInfo.fullName}</p>
                        <p className="text-sm text-gray-700">{order.shippingInfo.address}</p>
                        <p className="text-sm text-gray-700">{order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zipCode}</p>
                        <p className="text-sm text-gray-600 mt-2">{order.shippingInfo.email}</p>
                      </div>

                      {/* Order Items */}
                      <div className="border-t pt-4">
                        <p className="font-medium text-gray-900 mb-3">Items ({order.items.length})</p>
                        <div className="space-y-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                {item.product_image && (
                                  <img src={item.product_image} alt={item.product_name || ''} className="h-12 w-12 object-cover rounded" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{item.product_name || item.product_id}</p>
                                  <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                                  <p className="text-xs text-gray-500">Status: <span className="capitalize">{item.status || 'processing'}</span></p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>

                                {/* Seller / Admin actions: allow updating item status if this order item belongs to current seller or user is admin */}
                                {(profile?.role === 'seller' && item.seller_id === profile.id) || profile?.role === 'admin' ? (
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={() => updateItemStatus(order.id, idx, 'packed')}>Pack</Button>
                                    <Button size="sm" onClick={() => updateItemStatus(order.id, idx, 'shipped')}>Ship</Button>
                                    <Button size="sm" onClick={() => updateItemStatus(order.id, idx, 'delivered')}>Deliver</Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 mt-6">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Full Details
                        </Button>
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