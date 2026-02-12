import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { User, Settings, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
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

  const getSellerStatusColor = (status: string) => {
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

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full mr-4">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Email cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          placeholder="Enter your address"
                        />
                      </div>

                      <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Profile'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Account Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Account Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-600">Account Type</Label>
                      <Badge className={`${getRoleBadgeColor(profile?.role || 'customer')} mt-1`}>
                        {profile?.role?.replace('_', ' ').toUpperCase() || 'CUSTOMER'}
                      </Badge>
                    </div>

                    {profile?.role === 'seller' && (
                      <div>
                        <Label className="text-sm text-gray-600">Seller Status</Label>
                        <Badge className={`${getSellerStatusColor(profile?.seller_status || 'pending')} mt-1`}>
                          {profile?.seller_status?.toUpperCase() || 'PENDING'}
                        </Badge>
                        {profile?.seller_status === 'pending' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Your seller account is under review
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label className="text-sm text-gray-600">Member Since</Label>
                      <p className="text-sm font-medium">
                        {user?.created_at ? 
                          new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }) : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-base font-medium">Email Preferences</Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Choose what emails you'd like to receive
                      </p>
                      <div className="space-y-2 text-sm">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Order updates and shipping notifications
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          New product recommendations
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Marketing emails and promotions
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Privacy Settings</Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Control your data and privacy
                      </p>
                      <div className="space-y-2 text-sm">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Show my name to sellers
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Allow data for personalization
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Share analytics data
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="destructive">Delete Account</Button>
                    <p className="text-xs text-gray-500 mt-2">
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Change Password</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <div className="space-y-3 max-w-md">
                      <Input type="password" placeholder="Current password" />
                      <Input type="password" placeholder="New password" />
                      <Input type="password" placeholder="Confirm new password" />
                      <Button>Update Password</Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="text-base font-medium">Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Order Notifications</Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Get notified about your order status changes
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Email notifications</span>
                          <input type="checkbox" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">SMS notifications</span>
                          <input type="checkbox" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Marketing Communications</Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Receive updates about new products and promotions
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Weekly newsletter</span>
                          <input type="checkbox" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Product recommendations</span>
                          <input type="checkbox" defaultChecked />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Special offers</span>
                          <input type="checkbox" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;