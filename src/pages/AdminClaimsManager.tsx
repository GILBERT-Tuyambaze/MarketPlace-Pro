import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { auth as firebaseAuth, db as firebaseDb } from '@/lib/firebaseClient';
import { collection, getDocs, query, orderBy, doc as fbDoc, getDoc as fbGetDoc } from 'firebase/firestore';
import { Shield, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name: string;
  admin?: boolean;
}

interface ClaimForm {
  admin: boolean;
}

const AdminClaimsManager: React.FC = () => {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [claims, setClaims] = useState<ClaimForm>({ admin: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adminServerUrl, setAdminServerUrl] = useState('http://localhost:4000');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(firebaseDb, 'profiles'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const list: User[] = await Promise.all(snap.docs.map(async (d) => {
        const uid = d.id;
        let email = '';
        try {
          const authUser = await firebaseAuth.currentUser;
          if (authUser?.uid === uid) {
            email = authUser.email || '';
          }
        } catch (e) {
          // ignore
        }
        return {
          id: uid,
          email,
          full_name: d.data().full_name || 'User',
          admin: d.data().admin || false,
        };
      }));
      setUsers(list);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (uid: string) => {
    setSelectedUid(uid);
    const selected = users.find(u => u.id === uid);
    if (selected) {
      setClaims({ admin: selected.admin || false });
    }
  };

  const handleSetClaims = async () => {
    if (!selectedUid) {
      toast.error('Please select a user');
      return;
    }

    setSubmitting(true);
    try {
      // Get current user's ID token
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const idToken = await currentUser.getIdToken();

      // Call admin server
      const res = await fetch(`${adminServerUrl}/set-claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: selectedUid,
          claims,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set claims');
      }

      toast.success('Claims updated successfully');
      await fetchUsers();
      setSelectedUid('');
    } catch (error) {
      console.error('Error setting claims:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set claims');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-8">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-3 rounded-full mr-4">
            <Lock className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Claims Manager</h1>
            <p className="text-gray-600">Manage user custom claims and roles</p>
          </div>
        </div>

        <Tabs defaultValue="claims" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="claims">Set Claims</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
          </TabsList>

          {/* Set Claims Tab */}
          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle>Add/Update Custom Claims</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="admin-server-url">Admin Server URL</Label>
                  <Input
                    id="admin-server-url"
                    placeholder="http://localhost:4000"
                    value={adminServerUrl}
                    onChange={(e) => setAdminServerUrl(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Configure the admin endpoint server URL. Default: http://localhost:4000
                  </p>
                </div>

                <div>
                  <Label>Select User</Label>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-gray-500">No users found</p>
                    ) : (
                      users.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition ${
                            selectedUid === u.id
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{u.full_name}</p>
                              <p className="text-sm text-gray-500">{u.email || u.id}</p>
                            </div>
                            {u.admin && (
                              <Badge className="bg-red-100 text-red-800">Admin</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedUid && (
                  <div className="border-t pt-6">
                    <Label>Custom Claims</Label>
                    <div className="mt-4 space-y-3">
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-start space-x-2 mb-2">
                          <Checkbox
                            id="admin-claim"
                            checked={claims.admin}
                            onCheckedChange={(checked) =>
                              setClaims(prev => ({ ...prev, admin: checked === true }))
                            }
                          />
                          <div className="flex-1">
                            <Label htmlFor="admin-claim" className="cursor-pointer font-semibold">
                              Admin
                            </Label>
                            <p className="text-sm text-gray-600 mt-1">
                              Grants full platform access including:
                            </p>
                            <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                              <li>Manage all users and their roles</li>
                              <li>Edit, delete, hide, unhide, approve, and unapprove any product</li>
                              <li>Set custom claims for other users</li>
                              <li>Access all role dashboards (Seller, Editor, Content Manager)</li>
                              <li>View platform analytics and settings</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSetClaims}
                      disabled={submitting}
                      className="mt-6 w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      {submitting ? 'Updating...' : 'Update Claims'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                          {u.admin && (
                            <Badge className="bg-red-100 text-red-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{u.email || u.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminClaimsManager;
