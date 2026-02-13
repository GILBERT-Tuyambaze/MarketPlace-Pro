import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebaseClient';
import * as sellerLib from '@/lib/seller';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  Package,
  ShoppingCart,
  MessageSquare,
  Search,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';


// Types
interface Order {
  id: string;
  buyer_name: string;
  buyer_id: string;
  created_at: any;
  total_amount: number;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    status?: string;
    seller_id?: string;
  }[];
}

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  subject: string;
  body: string;
  created_at: any;
}

// ============ ORDERS TAB ============

const OrdersTab: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'order_id' | 'buyer_name' | 'product_name'>('order_id');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<{ [key: string]: string }>({});
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const sellerOrders = await sellerLib.fetchSellerOrders(sellerId);
        setOrders(sellerOrders as any);
      } catch (error) {
        console.error('Error loading orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [sellerId]);

  const handleSearch = async () => {
    if (!searchTerm) {
      toast.error('Enter search term');
      return;
    }

    try {
      const results = await sellerLib.searchSellerOrders(sellerId, searchTerm, searchBy);
      setOrders(results as any);
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Search failed');
    }
  };

  const handleViewOrder = async (order: Order) => {
    try {
      const detail = await sellerLib.getOrderDetail(order.id);
      setSelectedOrder(detail as any);
      // Initialize item status selectors
      const statuses: { [key: string]: string } = {};
      detail.items?.forEach((item: any, idx: number) => {
        statuses[`item-${idx}`] = item.status || 'pending';
      });
      setItemStatuses(statuses);
    } catch (error) {
      console.error('Error loading order detail:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleViewHistory = async (orderId: string) => {
    try {
      const history = await sellerLib.getOrderHistory(orderId);
      setOrderHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load order history');
    }
  };

  const handleUpdateItemStatus = async (orderId: string, itemIndex: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await sellerLib.updateOrderItemStatus(
        orderId,
        itemIndex,
        newStatus as any,
        sellerId,
        'Updated by seller'
      );
      toast.success('Item status updated');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={searchBy} onValueChange={(val: any) => setSearchBy(val)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_id">Order ID</SelectItem>
                <SelectItem value="buyer_name">Buyer Name</SelectItem>
                <SelectItem value="product_name">Product Name</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Enter search term..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>No orders found</p>
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</h3>
                    <Badge>{order.items.length} Items</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Buyer: {order.buyer_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {order.created_at?.toDate?.().toLocaleDateString()}
                  </p>
                  <p className="text-lg font-semibold text-indigo-600">
                    Total: ${parseFloat(order.total_amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button onClick={() => handleViewOrder(order)} variant="outline">
                    View Details
                  </Button>
                  <Button onClick={() => handleViewHistory(order.id)} variant="outline" size="sm">
                    History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Items & Status</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <Badge>{item.status || 'pending'}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={itemStatuses[`item-${idx}`] || 'pending'}
                          onValueChange={(status) =>
                            setItemStatuses({
                              ...itemStatuses,
                              [`item-${idx}`]: status,
                            })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() =>
                            handleUpdateItemStatus(
                              selectedOrder.id,
                              idx,
                              itemStatuses[`item-${idx}`]
                            )
                          }
                          disabled={updatingStatus}
                          size="sm"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={() => setSelectedOrder(null)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {orderHistory.map((event, i) => (
                <div key={i} className="border-b pb-2 text-sm">
                  <p className="font-semibold">
                    {event.new_status?.toUpperCase()} - Item {event.item_index}
                  </p>
                  {event.reason && <p className="text-gray-600">{event.reason}</p>}
                  <p className="text-xs text-gray-500">
                    {event.created_at?.toDate?.().toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowHistory(false)} className="mt-4 w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ MESSAGING TAB ============

const MessagingTab: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState('admin');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const userMessages = await sellerLib.fetchSellerMessages(sellerId);
        setMessages(userMessages as any);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [sellerId]);

  const handleSendMessage = async () => {
    if (!recipient || !subject || !body) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      const recipients =
        recipient === 'admin'
          ? [{ role: 'admin' }]
          : recipient === 'editor'
            ? [{ role: 'editor' }]
            : [{ role: 'content_manager' }];

      await sellerLib.sendSellerMessage(sellerId, recipients, subject, body);
      toast.success('Message sent successfully');
      setSubject('');
      setBody('');

      // Refresh messages
      const userMessages = await sellerLib.fetchSellerMessages(sellerId);
      setMessages(userMessages as any);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading messages...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Message to Marketplace Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Send to</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin Team</SelectItem>
                <SelectItem value="editor">Editor Team</SelectItem>
                <SelectItem value="content_manager">Content Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              placeholder="Message subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              placeholder="Enter your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>

          <Button onClick={handleSendMessage} disabled={sending} className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Received Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{msg.subject}</h4>
                      <p className="text-sm text-gray-500">
                        From: {msg.sender_role} • {msg.created_at?.toDate?.().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const SellerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      try {
        const orders = await sellerLib.fetchSellerOrders(user.uid);
        setStats({
          totalOrders: orders.length,
          totalRevenue: (orders as any[]).reduce(
            (sum, o) => sum + (o.total_amount || 0),
            0
          ),
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, [user]);

  if (!user) return <Layout><div>Loading...</div></Layout>;

  if (profile?.seller_status !== 'approved') {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Seller Account Under Review</h3>
              <p className="text-sm text-gray-600">
                Your account is being reviewed. You'll be notified when approved.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600">Manage orders and communicate with marketplace team</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold">{stats.totalOrders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold">
                    ${parseFloat(stats.totalRevenue).toFixed(2)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="messaging">Messaging</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab sellerId={user.uid} />
          </TabsContent>

          <TabsContent value="messaging">
            <MessagingTab sellerId={user.uid} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SellerDashboard;