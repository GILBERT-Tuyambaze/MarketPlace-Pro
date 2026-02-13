import React, { useState, useEffect, useRef } from 'react';
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

// ============ PRODUCTS TAB ============

const ProductsTab: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    price: 0,
    stock: 0,
    category: 'electronics',
    image: 'https://dummyimage.com/300x300/cccccc/969696?text=Product',
  });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const sellerProducts = await sellerLib.getSellerProducts(sellerId);
        setProducts(sellerProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [sellerId]);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.title || !formData.price || formData.price <= 0) {
      toast.error('Please fill in required fields');
      return;
    }
    if (!formData.image || formData.image === 'https://dummyimage.com/300x300/cccccc/969696?text=Product') {
      toast.error('Please upload or enter an image');
      return;
    }

    try {
      await sellerLib.addSellerProduct(sellerId, formData);
      toast.success('Product added successfully');
      setFormData({
        name: '',
        title: '',
        description: '',
        price: 0,
        stock: 0,
        category: 'electronics',
        image: 'https://dummyimage.com/300x300/cccccc/969696?text=Product',
      });
      setShowAddForm(false);
      
      // Reload products
      const updated = await sellerLib.getSellerProducts(sellerId);
      setProducts(updated);
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size is 5MB.`);
        continue;
      }

      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image.`);
        continue;
      }

      // Create local preview using FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setFormData(prev => ({
          ...prev,
          image: dataUrl
        }));
        toast.success(`Image preview loaded for ${file.name}`);
      };
      reader.readAsDataURL(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) return <div className="text-center py-8">Loading products...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Products ({products.length})</CardTitle>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Product'}
          </Button>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Product Name *</Label>
                  <Input
                    placeholder="e.g., Wireless Headphones"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., Premium Bluetooth Headphones"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="home-garden">Home & Garden</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="books-media">Books & Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price (USD) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Product Image</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="productFile" className="text-sm text-gray-600">Upload Image from Local Storage</Label>
                      <Input
                        ref={fileInputRef}
                        id="productFile"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                      <p className="text-xs text-gray-500 mt-1">Max 5MB - preview appears immediately</p>
                    </div>

                    <div className="border-t pt-3">
                      <Label htmlFor="productUrl" className="text-sm text-gray-600">Or Use Image URL</Label>
                      <Input
                        id="productUrl"
                        placeholder="https://example.com/image.jpg"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  {formData.image && formData.image !== 'https://dummyimage.com/300x300/cccccc/969696?text=Product' && (
                    <div className="mt-4 border-2 border-gray-300 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <div className="bg-gray-100 p-2">
                        <Label className="text-xs text-gray-600">Image Preview</Label>
                      </div>
                      <img 
                        src={formData.image} 
                        alt="Product preview" 
                        className="w-full h-64 object-cover bg-gray-100"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://dummyimage.com/300x300/cccccc/969696?text=Invalid+Image'; }}
                      />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Product details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <Button onClick={handleAddProduct} className="w-full mt-4">Add Product</Button>
            </div>
          )}

          {products.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No products yet. Add your first product!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="border">
                  <CardContent className="p-4">
                    <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded mb-3" />
                    <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.title}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">${product.price.toFixed(2)}</span>
                      <Badge variant={product.stock > 5 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'}>
                        Stock: {product.stock}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="messaging">Messaging</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab sellerId={user.uid} />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab sellerId={user.uid} />
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