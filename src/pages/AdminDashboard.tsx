import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { db as firebaseDb } from '@/lib/firebaseClient';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc as fbDoc,
  getDoc as fbGetDoc,
  updateDoc as fbUpdateDoc,
  setDoc as fbSetDoc,
} from 'firebase/firestore';
import { onSnapshot as fbOnSnapshot, serverTimestamp as fbServerTimestamp } from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  Package, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string;
  role: string;
  seller_status: string;
  created_at: string;
  email: string;
}

interface PlatformSettings {
  marketplace_locked: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  updated_at?: any;
}

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  category: string;
  created_at: string;
  visibility?: string;
  seller_id?: string;
  profiles: {
    full_name: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    marketplace_locked: false,
    maintenance_mode: false,
    maintenance_message: 'We are currently under maintenance. Please check back soon.',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let usersUnsub: (() => void) | undefined;
    let productsUnsub: (() => void) | undefined;
    let loadCount = 0;

    if (user) {
      // realtime users
      const usersQuery = query(collection(firebaseDb, 'profiles'), orderBy('created_at', 'desc'));
      usersUnsub = fbOnSnapshot(usersQuery, (snap) => {
        const list: User[] = snap.docs.map(d => ({
          id: d.id,
          full_name: d.data().full_name || 'User',
          role: d.data().role || 'customer',
          seller_status: d.data().seller_status || 'pending',
          created_at: d.data().created_at ? d.data().created_at.toDate().toISOString() : new Date().toISOString(),
          email: d.data().email || ''
        }));
        setUsers(list);
        loadCount++;
        if (loadCount >= 2) setLoading(false);
      }, (err) => {
        console.error('Realtime users listener error:', err);
        toast.error('Failed to load users');
        setLoading(false);
      });

      // realtime products
      const productsQuery = query(collection(firebaseDb, 'products'), orderBy('created_at', 'desc'));
      productsUnsub = fbOnSnapshot(productsQuery, async (snap) => {
        const list: Product[] = [];
        for (const d of snap.docs) {
          const pdata: any = d.data();
          let sellerName = 'Unknown Seller';
          if (pdata.seller_id) {
            const sellerRef = fbDoc(firebaseDb, 'profiles', pdata.seller_id);
            const sellerSnap = await fbGetDoc(sellerRef);
            if (sellerSnap.exists()) sellerName = sellerSnap.data().full_name || sellerName;
          }
          list.push({
            id: d.id,
            title: pdata.title || pdata.name || 'Product',
            price: pdata.price || 0,
            status: pdata.status || 'pending',
            category: pdata.category || 'uncategorized',
            created_at: pdata.created_at ? pdata.created_at.toDate().toISOString() : new Date().toISOString(),
            visibility: pdata.visibility || 'visible',
            seller_id: pdata.seller_id,
            profiles: { full_name: sellerName }
          });
        }
        setProducts(list);
        loadCount++;
        if (loadCount >= 2) setLoading(false);
      }, (err) => {
        console.error('Realtime products listener error:', err);
        toast.error('Failed to load products');
        setLoading(false);
      });
    }

    return () => {
      try { if (usersUnsub) usersUnsub(); } catch (e) { /* ignore */ }
      try { if (productsUnsub) productsUnsub(); } catch (e) { /* ignore */ }
    };
  }, [user]);

  // Load platform settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = fbDoc(firebaseDb, 'settings', 'platform');
        const settingsSnap = await fbGetDoc(settingsRef);
        if (settingsSnap.exists()) {
          setPlatformSettings(settingsSnap.data() as PlatformSettings);
        }
      } catch (error) {
        console.error('Error loading platform settings:', error);
      }
    };
    loadSettings();
  }, []);

  const savePlatformSettings = async () => {
    setSettingsSaving(true);
    try {
      const settingsRef = fbDoc(firebaseDb, 'settings', 'platform');
      await fbSetDoc(settingsRef, { ...platformSettings, updated_at: fbServerTimestamp() }, { merge: true });
      toast.success('Platform settings saved successfully');
    } catch (error) {
      console.error('Error saving platform settings:', error);
      toast.error('Failed to save platform settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const prev = [...users];
    try {
      // optimistic UI update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

      const ref = fbDoc(firebaseDb, 'profiles', userId);
      await fbUpdateDoc(ref, { role: newRole, updated_at: fbServerTimestamp() });

      toast.success('User role updated successfully');
      // realtime listener will update
    } catch (error) {
      console.error('Error updating user role:', error);
      // rollback optimistic update
      setUsers(prev);
      toast.error('Failed to update user role');
    }
  };

  const updateSellerStatus = async (userId: string, status: string) => {
    const prev = [...users];
    try {
      // optimistic UI update
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, seller_status: status } : u));

      const ref = fbDoc(firebaseDb, 'profiles', userId);
      await fbUpdateDoc(ref, { seller_status: status, updated_at: fbServerTimestamp() });

      toast.success(`Seller ${status} successfully`);
      // realtime listener will reflect changes
    } catch (error) {
      console.error('Error updating seller status:', error);
      setUsers(prev);
      toast.error('Failed to update seller status');
    }
  };

  const updateProductStatus = async (productId: string, status: string) => {
    const prev = [...products];
    try {
      // optimistic UI update
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status } : p));
      
      const ref = fbDoc(firebaseDb, 'products', productId);
      await fbUpdateDoc(ref, { status, updated_at: fbServerTimestamp() });

      toast.success(`Product ${status} successfully`);
      // realtime listener will reflect changes
    } catch (error) {
      console.error('Error updating product status:', error);
      setProducts(prev);
      toast.error('Failed to update product status');
    }
  };

  const updateProductVisibility = async (productId: string, visible: boolean) => {
    const prev = [...products];
    try {
      const newVisibility = visible ? 'hidden' : 'visible';
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, visibility: newVisibility } : p));
      
      const ref = fbDoc(firebaseDb, 'products', productId);
      await fbUpdateDoc(ref, { visibility: newVisibility, updated_at: fbServerTimestamp() });

      toast.success(`Product ${newVisibility === 'hidden' ? 'hidden' : 'unhidden'} successfully`);
    } catch (error) {
      console.error('Error updating product visibility:', error);
      setProducts(prev);
      toast.error('Failed to update product visibility');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    const prev = [...products];
    try {
      setProducts(prev => prev.filter(p => p.id !== productId));
      
      const ref = fbDoc(firebaseDb, 'products', productId);
      await fbUpdateDoc(ref, { deleted_at: fbServerTimestamp(), updated_at: fbServerTimestamp() });

      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      setProducts(prev);
      toast.error('Failed to delete product');
    }
  };

  const updateProductApproval = async (productId: string, approved: boolean) => {
    const prev = [...products];
    try {
      const newStatus = approved ? 'pending' : 'approved';
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
      
      const ref = fbDoc(firebaseDb, 'products', productId);
      await fbUpdateDoc(ref, { status: newStatus, updated_at: fbServerTimestamp() });

      toast.success(`Product ${newStatus === 'approved' ? 'approved' : 'unapproved'} successfully`);
    } catch (error) {
      console.error('Error updating product approval:', error);
      setProducts(prev);
      toast.error('Failed to update product approval');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'seller':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'content_manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
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

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const totalUsers = users.length;
  const pendingSellers = users.filter(u => u.role === 'seller' && u.seller_status === 'pending').length;
  const pendingProducts = products.filter(p => p.status === 'pending').length;
  const totalRevenue = 0; // Calculate from orders

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, products, and platform settings</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            onClick={() => window.location.href = '/admin/claims-manager'}
          >
            <Lock className="h-4 w-4 mr-2" />
            Manage Claims
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Sellers</p>
                  <p className="text-3xl font-bold text-yellow-600">{pendingSellers}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Products</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingProducts}</p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Platform Revenue</p>
                  <p className="text-3xl font-bold text-green-600">{formatPrice(totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="products">Product Management</TabsTrigger>
            <TabsTrigger value="settings">Platform Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {user.role === 'seller' && (
                            <Badge className={getStatusBadgeColor(user.seller_status)}>
                              {user.seller_status.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Joined: {formatDate(user.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="content_manager">Content Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {user.role === 'seller' && user.seller_status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => updateSellerStatus(user.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateSellerStatus(user.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage all products: approve, hide/show, edit, or delete</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{product.title}</h3>
                          <Badge className={getStatusBadgeColor(product.status)}>
                            {product.status.toUpperCase()}
                          </Badge>
                          {product.visibility === 'hidden' && (
                            <Badge variant="secondary" className="bg-gray-200">Hidden</Badge>
                          )}
                          <Badge variant="outline">{product.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {formatPrice(product.price)} • Seller: <span className="font-medium">{product.profiles.full_name}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(product.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {/* Visibility Toggle */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateProductVisibility(product.id, product.visibility === 'hidden')}
                          title={product.visibility === 'hidden' ? 'Unhide' : 'Hide'}
                        >
                          {product.visibility === 'hidden' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/add-product?edit=${product.id}`}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {/* Approve/Unapprove */}
                        {product.status === 'approved' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 hover:text-yellow-700"
                            onClick={() => updateProductApproval(product.id, true)}
                            title="Unapprove"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateProductApproval(product.id, false)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteProduct(product.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p>No products found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Platform Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-w-2xl">
                  {/* Marketplace Lock */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">Marketplace Lock</h3>
                          <p className="text-sm text-gray-500">Temporarily disable all marketplace functionality</p>
                        </div>
                      </div>
                      <Switch
                        checked={platformSettings.marketplace_locked}
                        onCheckedChange={(checked) =>
                          setPlatformSettings({
                            ...platformSettings,
                            marketplace_locked: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <div>
                          <h3 className="font-semibold">Maintenance Mode</h3>
                          <p className="text-sm text-gray-500">Show maintenance banner to all users</p>
                        </div>
                      </div>
                      <Switch
                        checked={platformSettings.maintenance_mode}
                        onCheckedChange={(checked) =>
                          setPlatformSettings({
                            ...platformSettings,
                            maintenance_mode: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Maintenance Message */}
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-message" className="text-base font-semibold">
                      Maintenance Message
                    </Label>
                    <p className="text-sm text-gray-500">Message shown to users during maintenance</p>
                    <Textarea
                      id="maintenance-message"
                      placeholder="Enter maintenance message (e.g., 'We're performing scheduled maintenance. Please try again later.')"
                      value={platformSettings.maintenance_message}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          maintenance_message: e.target.value,
                        })
                      }
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button
                    onClick={savePlatformSettings}
                    disabled={settingsSaving}
                    className="w-full"
                  >
                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;