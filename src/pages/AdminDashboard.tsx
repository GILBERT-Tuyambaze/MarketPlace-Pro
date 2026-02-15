import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Layout from '@/components/Layout/Layout';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { auth as firebaseAuth, db as firebaseDb } from '@/lib/firebaseClient';
import * as admin from '@/lib/admin';
import * as seller from '@/lib/seller';
import * as Customer from '@/lib/customer';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc as fbDoc,
  getDoc as fbGetDoc,
  addDoc,
  serverTimestamp as fbServerTimestamp,
} from 'firebase/firestore';
import { 
  Send, 
  Users, 
  AlertCircle,
  MessageSquare,
  Calendar,
  Filter,
  Download,
  Search,
  Settings,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';


// Types
interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  recipients: any[];
  subject: string;
  body: string;
  created_at: any;
}

interface Claim {
  id: string;
  title: string;
  description: string;
  department: string;
  sender_id: string;
  sender_role: string;
  status: string;
  created_at: any;
}

interface UserDetail {
  id: string;
  full_name: string;
  email: string;
  role: string;
  seller_status?: string;
  ban_status?: string;
  created_at: any;
}

// ============ COMMUNICATION TAB ============

const CommunicationTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageType, setMessageType] = useState<'role' | 'individual' | 'broadcast'>('role');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedBroadcastRoles, setSelectedBroadcastRoles] = useState<string[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const allMessages = await admin.fetchAllMessages();
        setMessages(allMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!subject || !body) {
      toast.error('Please fill in subject and message');
      return;
    }

    if (messageType === 'role' && !recipient) {
      toast.error('Please select a role');
      return;
    }
    if (messageType === 'individual' && !recipient) {
      toast.error('Please enter a user ID');
      return;
    }
    if (messageType === 'broadcast' && selectedBroadcastRoles.length === 0) {
      toast.error('Please select at least one role to broadcast to');
      return;
    }

    setSending(true);
    try {
      if (messageType === 'broadcast') {
        // Send to multiple roles
        for (const role of selectedBroadcastRoles) {
          await admin.sendAdminMessage(userId, [{ role }], subject, body);
        }
        toast.success(`Broadcast sent to ${selectedBroadcastRoles.length} role(s)`);
        setSelectedBroadcastRoles([]);
      } else {
        const recipients = messageType === 'role' 
          ? [{ role: recipient }]
          : [{ uid: recipient }];

        await admin.sendAdminMessage(userId, recipients, subject, body);
        toast.success('Message sent successfully');
      }

      setSubject('');
      setBody('');
      setRecipient('');

      // Refresh messages
      const allMessages = await admin.fetchAllMessages();
      setMessages(allMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleViewHistory = async (senderId: string) => {
    try {
      const history = await admin.fetchMessageHistory(senderId);
      setMessageHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load message history');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Announcement/Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Message Type</Label>
            <div className="flex gap-4 mt-2 flex-wrap">
              <label className="flex items-center">
                <input type="radio" value="role" checked={messageType === 'role'} onChange={(e) => setMessageType(e.target.value as any)} className="mr-2" />
                Send to Role
              </label>
              <label className="flex items-center">
                <input type="radio" value="individual" checked={messageType === 'individual'} onChange={(e) => setMessageType(e.target.value as any)} className="mr-2" />
                Send to Individual
              </label>
              <label className="flex items-center">
                <input type="radio" value="broadcast" checked={messageType === 'broadcast'} onChange={(e) => setMessageType(e.target.value as any)} className="mr-2" />
                Broadcast to Multiple
              </label>
            </div>
          </div>

          {messageType === 'broadcast' ? (
            <div>
              <Label>Select Roles to Broadcast To</Label>
              <div className="space-y-3 mt-2 border rounded-lg p-4 bg-blue-50">
                {['seller', 'editor', 'content_manager', 'customer'].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBroadcastRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBroadcastRoles([...selectedBroadcastRoles, role]);
                        } else {
                          setSelectedBroadcastRoles(selectedBroadcastRoles.filter(r => r !== role));
                        }
                      }}
                    />
                    <span className="capitalize">All {role === 'content_manager' ? 'Content Managers' : role === 'customer' ? 'Customers' : role + 's'}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : messageType === 'role' ? (
            <div>
              <Label>Select Role</Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">All Sellers</SelectItem>
                  <SelectItem value="editor">All Editors</SelectItem>
                  <SelectItem value="content_manager">All Content Managers</SelectItem>
                  <SelectItem value="customer">All Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>User ID</Label>
              <Input placeholder="Enter user ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Subject</Label>
            <Input placeholder="Message subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea placeholder="Enter message..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>

          <Button onClick={handleSendMessage} disabled={sending} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : messageType === 'broadcast' ? 'Send Broadcast' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{msg.subject}</h4>
                      <p className="text-sm text-gray-500">
                        From: {msg.sender_role} • {msg.created_at?.toDate?.().toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleViewHistory(msg.sender_id)}>
                      History
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{msg.body}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Message History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messageHistory.map((msg) => (
                <div key={msg.id} className="border-b pb-3 last:border-b-0">
                  <p className="font-semibold">{msg.subject}</p>
                  <p className="text-sm text-gray-600">{msg.body}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.created_at?.toDate?.().toLocaleString()}
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

// ============ CLAIMS TAB ============

const ClaimsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [claimDetails, setClaimDetails] = useState<any>(null);

  useEffect(() => {
    const loadClaims = async () => {
      try {
        const allClaims = await admin.fetchAllClaims();
        setClaims(allClaims);
      } catch (error) {
        console.error('Error loading claims:', error);
        toast.error('Failed to load claims');
      } finally {
        setLoading(false);
      }
    };
    loadClaims();
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedClaim || !newStatus) return;

    try {
      await admin.updateClaimStatusAsAdmin(selectedClaim.id, newStatus, userId);
      toast.success('Claim status updated');
      setClaims(claims.map((c) => (c.id === selectedClaim.id ? { ...c, status: newStatus } : c)));
      setSelectedClaim(null);
      setNewStatus('');
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!confirm('Delete this claim?')) return;

    try {
      await admin.deleteClaimAsAdmin(claimId, userId);
      toast.success('Claim deleted');
      setClaims(claims.filter((c) => c.id !== claimId));
    } catch (error) {
      console.error('Error deleting claim:', error);
      toast.error('Failed to delete claim');
    }
  };

  const handleDeleteAllClaims = async () => {
    if (!confirm(`Delete ALL ${claims.length} claims? This action cannot be undone.`)) return;

    try {
      const claimIds = claims.map(c => c.id);
      await admin.deleteMultipleClaims(claimIds, userId);
      toast.success(`All ${claims.length} claims deleted`);
      setClaims([]);
    } catch (error) {
      console.error('Error deleting all claims:', error);
      toast.error('Failed to delete all claims');
    }
  };

  const handleViewDetails = async (claim: Claim) => {
    try {
      const details = await admin.getClaimDetail(claim.id);
      setClaimDetails(details);
      setSelectedClaim(claim);
    } catch (error) {
      console.error('Error loading claim details:', error);
      toast.error('Failed to load claim details');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      {claims.length > 0 && (
        <div className="flex justify-end gap-2 mb-4">
          <Button onClick={() => setClaims(claims)} variant="outline" size="sm">
            Total Claims: {claims.length}
          </Button>
          {claims.length > 1 && (
            <Button onClick={handleDeleteAllClaims} variant="destructive" size="sm">
              Delete All Claims
            </Button>
          )}
        </div>
      )}

      {claims.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No claims submitted yet
          </CardContent>
        </Card>
      ) : (
        claims.map((claim) => (
          <Card key={claim.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{claim.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{claim.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge>{claim.department}</Badge>
                    <Badge variant={claim.status === 'resolved' ? 'default' : 'secondary'}>
                      {claim.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => handleViewDetails(claim)}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  View
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                From: {claim.sender_role} • Date: {claim.created_at?.toDate?.().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {selectedClaim && claimDetails && (
        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedClaim.title}</DialogTitle>
              </DialogHeader>
              <DialogDescription className="sr-only">Claim details and actions for {selectedClaim.title}</DialogDescription>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-700">{selectedClaim.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold">{selectedClaim.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold">{selectedClaim.sender_role}</p>
                </div>
              </div>

              <div>
                <Label>Update Status</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStatus} disabled={!newStatus}>
                    Update
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleDeleteClaim(selectedClaim.id)} variant="destructive">
                  Delete Claim
                </Button>
                <Button onClick={() => setSelectedClaim(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ============ USER MANAGEMENT TAB ============

const UserManagementTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOnlineStatus, setFilterOnlineStatus] = useState('all');
  const [filterLastSeen, setFilterLastSeen] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [editedUser, setEditedUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [pendingSellerRequests, setPendingSellerRequests] = useState<any[]>([]);
  const [changeRoleUser, setChangeRoleUser] = useState<UserDetail | null>(null);
  const [newRole, setNewRole] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTime, setRefreshTime] = useState(new Date());
  
  // Role-specific data
  const [roleSpecificData, setRoleSpecificData] = useState<any>(null);
  const [loadingRoleData, setLoadingRoleData] = useState(false);
  
  // Authentication status data
  const [authStatuses, setAuthStatuses] = useState<Map<string, any>>(new Map());
  
  // Full auth user data for account details
  const [authUserData, setAuthUserData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allUsers, pendingRequests, authStatusList] = await Promise.all([
          admin.getAllUsers(),
          admin.getPendingSellerRequests(),
          admin.getAllAuthUserStatuses(),
        ]);
        
        // Create a map of auth statuses keyed by user ID
        const authStatusMap = new Map();
        authStatusList.forEach((auth: any) => {
          authStatusMap.set(auth.uid, auth);
        });
        setAuthStatuses(authStatusMap);
        
        setUsers(allUsers as any);
        setPendingSellerRequests(pendingRequests as any);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Refresh online status from authentication/users collection every 30 seconds
  useEffect(() => {
    const refreshAuthStatuses = async () => {
      try {
        const authStatusList = await admin.getAllAuthUserStatuses();
        const authStatusMap = new Map();
        authStatusList.forEach((auth: any) => {
          authStatusMap.set(auth.uid, auth);
        });
        setAuthStatuses(authStatusMap);
      } catch (e) {
        console.error('Error refreshing auth statuses:', e);
      }
      setRefreshTime(new Date());
    };
    
    const interval = setInterval(refreshAuthStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch role-specific data for comprehensive user profiling
  const fetchUserRoleData = async (userId: string, role: string) => {
    try {
      const roleData: any = { role };

      // Fetch authentication/user data to get real online status
      try {
        const authUserRef = query(
          collection(firebaseDb, 'authentication/users'),
          where('uid', '==', userId)
        );
        const authUserSnap = await getDocs(authUserRef);
        if (authUserSnap.size > 0) {
          const authData = authUserSnap.docs[0].data();
          roleData.auth_online_status = authData.is_online || false;
          roleData.auth_last_active = authData.last_active || null;
          roleData.auth_session_id = authData.session_id || null;
          roleData.auth_device_info = authData.device_info || null;
        }
      } catch (e) {
        // If authentication/users doesn't exist, try 'users' collection
        try {
          const userDoc = await fbGetDoc(fbDoc(firebaseDb, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            roleData.auth_online_status = userData.is_online || false;
            roleData.auth_last_active = userData.last_active || null;
            roleData.auth_session_id = userData.session_id || null;
            roleData.auth_device_info = userData.device_info || null;
          }
        } catch (e2) {
          console.warn('Could not fetch authentication data:', e2);
        }
      }

      if (role === 'seller') {
        // Fetch seller products and stats
        const productsRef = query(
          collection(firebaseDb, 'products'),
          where('seller_id', '==', userId)
        );
        const productsSnap = await getDocs(productsRef);
        const products = productsSnap.docs.map(doc => doc.data());

        roleData.products_count = products.length;
        roleData.total_products_value = products.reduce((sum: number, p: any) => sum + (p.price || 0), 0);

        // Fetch seller stats from cache
        const statsDoc = await fbGetDoc(fbDoc(firebaseDb, 'seller_stats_cache', userId));
        if (statsDoc.exists()) {
          const stats = statsDoc.data();
          roleData.total_sales = stats.total_sales || 0;
          roleData.total_revenue = stats.total_revenue || 0;
          roleData.average_rating = stats.average_rating || 0;
          roleData.rating_count = stats.rating_count || 0;
        }
      } else if (role === 'customer') {
        // Fetch customer cart and purchases
        const ordersRef = query(
          collection(firebaseDb, 'orders'),
          where('buyer_id', '==', userId)
        );
        const ordersSnap = await getDocs(ordersRef);
        const orders = ordersSnap.docs.map(doc => doc.data());

        roleData.total_purchases = orders.length;
        roleData.total_spent = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

        // Fetch cart items (from product collection, querying for user's saved cart)
        const savedProductsRef = query(
          collection(firebaseDb, 'saved_products'),
          where('user_id', '==', userId)
        );
        const savedSnap = await getDocs(savedProductsRef);
        roleData.cart_items = savedSnap.size;

        // Calculate cart value
        let cartValue = 0;
        for (const doc of savedSnap.docs) {
          const saved = doc.data();
          const productDoc = await fbGetDoc(fbDoc(firebaseDb, 'products', saved.product_id));
          if (productDoc.exists()) {
            cartValue += productDoc.data().price || 0;
          }
        }
        roleData.cart_value = cartValue;

        // Fetch loved items
        const lovedRef = query(
          collection(firebaseDb, 'loved_products'),
          where('user_id', '==', userId)
        );
        const lovedSnap = await getDocs(lovedRef);
        roleData.loved_items = lovedSnap.size;
      } else if (role === 'editor' || role === 'content_manager') {
        // Fetch editor/manager activity - claims processed and content edited
        const claimsRef = query(
          collection(firebaseDb, 'claims'),
          where('processed_by', '==', userId)
        );
        const claimsSnap = await getDocs(claimsRef);
        roleData.claims_processed = claimsSnap.size;

        // Count approved/rejected
        let approved = 0, rejected = 0;
        claimsSnap.docs.forEach(doc => {
          const claim = doc.data();
          if (claim.status === 'approved') approved++;
          if (claim.status === 'rejected') rejected++;
        });
        roleData.claims_approved = approved;
        roleData.claims_rejected = rejected;
      }

      return roleData;
    } catch (error) {
      console.error('Error fetching role-specific data:', error);
      return { role };
    }
  };

  const handleViewUserDetails = async (user: UserDetail) => {
    try {
      setLoadingRoleData(true);
      const [loginHist, activityLog, fullUserData, roleData, authData] = await Promise.all([
        admin.fetchUserLoginHistory(user.id),
        admin.fetchUserActivityLogs(user.id),
        fbGetDoc(fbDoc(firebaseDb, 'profiles', user.id)),
        fetchUserRoleData(user.id, user.role),
        admin.getFullAuthUserData(user.id),
      ]);
      setLoginHistory(loginHist);
      setActivityLogs(activityLog);
      setSelectedUser(user);
      setEditedUser(fullUserData.data() || user);
      setRoleSpecificData(roleData);
      setAuthUserData(authData);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoadingRoleData(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      await admin.updateUserStatus(userId, status, userId);
      toast.success('User status updated');
      setUsers(users.map((u) => (u.id === userId ? { ...u, ban_status: status } : u)));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleSaveUserDetails = async () => {
    if (!selectedUser || !editedUser) return;

    setIsSaving(true);
    try {
      // Update user profile in Firestore
      const userDocRef = fbDoc(firebaseDb, 'profiles', selectedUser.id);
      await admin.updateUserProfile(selectedUser.id, editedUser, userId);
      
      toast.success('User details updated successfully');
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, ...editedUser } : u)));
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!confirm(`Are you sure you want to delete ${selectedUser.full_name}? This action cannot be undone!`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await admin.deleteUserAsAdmin(selectedUser.id, userId);
      toast.success('User deleted successfully');
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setSelectedUser(null);
      setEditedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!changeRoleUser || !newRole) {
      toast.error('Please select a role');
      return;
    }

    try {
      await admin.changeUserRole(changeRoleUser.id, newRole, userId, roleChangeReason);
      toast.success('User role changed successfully');
      setUsers(users.map((u) => (u.id === changeRoleUser.id ? { ...u, role: newRole } : u)));
      setChangeRoleUser(null);
      setNewRole('');
      setRoleChangeReason('');
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change user role');
    }
  };

  const handleApproveSeller = async (userId: string) => {
    try {
      await admin.approveSeller(userId, userId);
      toast.success('Seller approved');
      setPendingSellerRequests(pendingSellerRequests.filter((r) => r.id !== userId));
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: 'seller' } : u)));
    } catch (error) {
      console.error('Error approving seller:', error);
      toast.error('Failed to approve seller');
    }
  };

  const handleRejectSeller = async (userId: string, reason: string) => {
    try {
      await admin.rejectSeller(userId, userId, reason);
      toast.success('Seller rejected');
      setPendingSellerRequests(pendingSellerRequests.filter((r) => r.id !== userId));
    } catch (error) {
      console.error('Error rejecting seller:', error);
      toast.error('Failed to reject seller');
    }
  };

  const formatLastOnline = (lastOnline: any) => {
    if (!lastOnline) return 'Never';
    const date = lastOnline.toDate?.() || new Date(lastOnline);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isOnline = (lastOnline: any) => {
    if (!lastOnline) return false;
    const date = lastOnline.toDate?.() || new Date(lastOnline);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins < 5; // Online if active in last 5 minutes
  };

  const getLastSeenCategory = (lastOnline: any) => {
    if (!lastOnline) return 'never';
    const date = lastOnline.toDate?.() || new Date(lastOnline);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 5) return 'online';
    if (diffMins < 60) return 'today';
    if (diffHours < 24) return 'today';
    if (diffDays < 7) return 'this_week';
    if (diffDays < 30) return 'this_month';
    return 'older';
  };

  const filteredUsers = users.filter((u) => {
    // Role filter
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    // Status filter
    let matchesStatus = filterStatus === 'all';
    if (filterStatus !== 'all') {
      const userStatus = u.ban_status || 'active';
      matchesStatus = userStatus === filterStatus;
    }
    
    // Online status filter
    let matchesOnlineStatus = filterOnlineStatus === 'all';
    if (filterOnlineStatus === 'online') {
      matchesOnlineStatus = isOnline((u as any).last_online_at);
    } else if (filterOnlineStatus === 'offline') {
      matchesOnlineStatus = !isOnline((u as any).last_online_at);
    }
    
    // Last seen filter
    let matchesLastSeen = filterLastSeen === 'all';
    if (filterLastSeen !== 'all') {
      const category = getLastSeenCategory((u as any).last_online_at);
      if (filterLastSeen === 'today') {
        matchesLastSeen = category === 'online' || category === 'today';
      } else if (filterLastSeen === 'this_week') {
        matchesLastSeen = ['online', 'today', 'this_week'].includes(category);
      } else if (filterLastSeen === 'this_month') {
        matchesLastSeen = ['online', 'today', 'this_week', 'this_month'].includes(category);
      } else if (filterLastSeen === 'older') {
        matchesLastSeen = category === 'older' || category === 'never';
      }
    }
    
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower);
    
    return matchesRole && matchesStatus && matchesOnlineStatus && matchesLastSeen && matchesSearch;
  });

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Pending Seller Requests */}
      {pendingSellerRequests.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">Pending Seller Requests ({pendingSellerRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSellerRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">{request.full_name}</h4>
                  <p className="text-sm text-gray-600">{request.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproveSeller(request.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt('Rejection reason (optional):');
                      if (reason !== undefined) handleRejectSeller(request.id, reason);
                    }}
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Search by Name or Email</label>
            <Input
              placeholder="Type name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Role</label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="seller">Sellers</SelectItem>
                  <SelectItem value="editor">Editors</SelectItem>
                  <SelectItem value="content_manager">Content Managers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">🟢 Active</SelectItem>
                  <SelectItem value="suspended">🟡 Suspended</SelectItem>
                  <SelectItem value="banned">🔴 Banned</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Online Status</label>
              <Select value={filterOnlineStatus} onValueChange={setFilterOnlineStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="online">🟢 Online Now</SelectItem>
                  <SelectItem value="offline">⚫ Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Last Seen</label>
              <Select value={filterLastSeen} onValueChange={setFilterLastSeen}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="older">Older</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">
              📊 Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
            {filteredUsers.length === 0 && users.length > 0 && (
              <p className="text-xs text-blue-700 mt-1">No users match your filters. Try adjusting your criteria.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredUsers.map((user) => (
        <Card key={`${user.id}-${refreshTime.getTime()}`} className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.full_name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                  
                  {user.ban_status && user.ban_status !== 'active' && (
                    <Badge 
                      variant="destructive"
                      className={user.ban_status === 'suspended' ? 'bg-yellow-500' : 'bg-red-600'}
                    >
                      {user.ban_status === 'suspended' ? '🟡 Suspended' : '🔴 Banned'}
                    </Badge>
                  )}
                  
                  {/* Real Database Online Status from authentication/users */}
                  {authStatuses.has(user.id) ? (
                    <Badge 
                      variant="outline"
                      className={authStatuses.get(user.id)?.is_online ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 text-gray-700'}
                    >
                      <span className={`h-2 w-2 rounded-full mr-2 inline-block ${authStatuses.get(user.id)?.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      {authStatuses.get(user.id)?.is_online ? '🟢 Online (DB)' : `📍 ${formatLastOnline(authStatuses.get(user.id)?.last_active)}`}
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={isOnline((user as any).last_online_at) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 text-gray-700'}
                    >
                      <span className={`h-2 w-2 rounded-full mr-2 inline-block ${isOnline((user as any).last_online_at) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      {isOnline((user as any).last_online_at) ? '🟢 Online' : `📍 ${formatLastOnline((user as any).last_online_at)}`}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4 flex-wrap">
                <Button onClick={() => handleViewUserDetails(user)} variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Details
                </Button>

                <Button
                  onClick={() => {
                    setChangeRoleUser(user);
                    setNewRole(user.role);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Change Role
                </Button>

                <Select
                  onValueChange={(status) => handleUpdateUserStatus(user.id, status)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspend</SelectItem>
                    <SelectItem value="banned">Ban</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Change Role Dialog */}
      {changeRoleUser && (
        <Dialog open={!!changeRoleUser} onOpenChange={() => setChangeRoleUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role for {changeRoleUser.full_name}</DialogTitle>
              <DialogDescription>Select a new role and optionally provide a reason</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-role">New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
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
              </div>
              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Reason for role change..."
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangeRole} className="flex-1">
                  Confirm Change
                </Button>
                <Button onClick={() => setChangeRoleUser(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div>
                  {authStatuses.has(selectedUser.id) ? (
                    <span className={`h-3 w-3 rounded-full inline-block mr-2 ${authStatuses.get(selectedUser.id)?.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                  ) : (
                    <span className={`h-3 w-3 rounded-full inline-block mr-2 ${isOnline((selectedUser as any).last_online_at) ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  )}
                  {selectedUser.full_name} - Account Details
                </div>
              </DialogTitle>
              <DialogDescription>
                {authStatuses.has(selectedUser.id)
                  ? authStatuses.get(selectedUser.id)?.is_online 
                    ? '🟢 Currently Online (from DB)' 
                    : `📍 Last active (DB): ${formatLastOnline(authStatuses.get(selectedUser.id)?.last_active)}`
                  : isOnline((selectedUser as any).last_online_at) 
                    ? '🟢 Currently Online' 
                    : `Last active: ${formatLastOnline((selectedUser as any).last_online_at)}`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* User Profile Information */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">User Profile Information</h3>
                  {!isEditMode && (
                    <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm">
                      Edit Profile
                    </Button>
                  )}
                </div>

                {isEditMode ? (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={editedUser?.full_name || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={editedUser?.email || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editedUser?.phone || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={editedUser?.country || ''}
                          onChange={(e) => setEditedUser({ ...editedUser, country: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={editedUser?.address || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio/Description</Label>
                      <Textarea
                        id="bio"
                        value={editedUser?.bio || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleSaveUserDetails} 
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsEditMode(false);
                          setEditedUser(selectedUser);
                        }} 
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold">{editedUser?.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold">{editedUser?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold">{editedUser?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Country</p>
                        <p className="font-semibold">{editedUser?.country || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-semibold">{editedUser?.address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bio</p>
                      <p className="font-semibold">{editedUser?.bio || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Role</p>
                        <p className="font-semibold capitalize">{editedUser?.role || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant={editedUser?.ban_status === 'active' ? 'default' : 'destructive'}>
                          {editedUser?.ban_status || 'active'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Verified</p>
                        <p className="font-semibold">{editedUser?.verified ? '✅ Yes' : '❌ No'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="font-semibold text-xs">{editedUser?.created_at?.toDate?.().toLocaleDateString() || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Authentication Information */}
              {authUserData && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-4">Authentication Information</h3>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">User ID (UID)</p>
                        <p className="font-mono text-sm font-semibold bg-white p-2 rounded border break-all">{authUserData?.uid || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold">{authUserData?.email || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Email Verified</p>
                        <p className="font-semibold">{authUserData?.email_verified ? '✅ Yes' : '❌ No'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Account Active</p>
                        <p className="font-semibold">{authUserData?.is_active ? '✅ Active' : '❌ Inactive'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Created At</p>
                        <p className="font-semibold text-xs">
                          {authUserData?.created_at 
                            ? new Date(authUserData.created_at).toLocaleString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Sign In</p>
                        <p className="font-semibold text-xs">
                          {authUserData?.last_sign_in 
                            ? new Date(authUserData.last_sign_in).toLocaleString() 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {authUserData?.phone_number && (
                      <div>
                        <p className="text-sm text-gray-600">Phone Number</p>
                        <p className="font-semibold">{authUserData?.phone_number}</p>
                      </div>
                    )}

                    {authUserData?.ip_address && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">IP Address</p>
                          <p className="font-mono text-sm font-semibold bg-white p-2 rounded border">{authUserData?.ip_address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Session ID</p>
                          <p className="font-mono text-sm font-semibold bg-white p-2 rounded border break-all">{authUserData?.session_id || 'N/A'}</p>
                        </div>
                      </div>
                    )}

                    {authUserData?.device_info && (
                      <div>
                        <p className="text-sm text-gray-600">Device Info</p>
                        <p className="font-semibold text-sm">{authUserData?.device_info}</p>
                      </div>
                    )}

                    {authUserData?.user_agent && (
                      <div>
                        <p className="text-sm text-gray-600">User Agent</p>
                        <p className="font-semibold text-xs break-all bg-white p-2 rounded border">{authUserData?.user_agent}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Role-Specific Data */}
              {roleSpecificData && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {loadingRoleData && <span className="inline-block animate-spin">⚙️</span>}
                    Role-Specific Information
                  </h3>

                  {/* Authentication/Online Status */}
                  <div className="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Database Online Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`h-3 w-3 rounded-full ${roleSpecificData.auth_online_status ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          <p className="font-semibold">{roleSpecificData.auth_online_status ? '🟢 Online' : '⚫ Offline'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Active</p>
                        <p className="font-semibold text-sm">
                          {roleSpecificData.auth_last_active 
                            ? new Date(roleSpecificData.auth_last_active).toLocaleTimeString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Device</p>
                        <p className="font-semibold text-sm">{roleSpecificData.auth_device_info || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedUser?.role === 'seller' && (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Products</p>
                          <p className="font-semibold text-lg">{roleSpecificData.products_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Products Value</p>
                          <p className="font-semibold text-lg">${(roleSpecificData.total_products_value || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Sales</p>
                          <p className="font-semibold text-lg">{roleSpecificData.total_sales || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="font-semibold text-lg">${(roleSpecificData.total_revenue || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Average Rating</p>
                          <p className="font-semibold text-lg">⭐ {(roleSpecificData.average_rating || 0).toFixed(1)} ({roleSpecificData.rating_count || 0} ratings)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedUser?.role === 'customer' && (
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Cart Items</p>
                          <p className="font-semibold text-lg">{roleSpecificData.cart_items || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Cart Value</p>
                          <p className="font-semibold text-lg">${(roleSpecificData.cart_value || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Purchases</p>
                          <p className="font-semibold text-lg">{roleSpecificData.total_purchases || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Spent</p>
                          <p className="font-semibold text-lg">${(roleSpecificData.total_spent || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Loved Items</p>
                        <p className="font-semibold text-lg">❤️ {roleSpecificData.loved_items || 0}</p>
                      </div>
                    </div>
                  )}

                  {(selectedUser?.role === 'editor' || selectedUser?.role === 'content_manager') && (
                    <div className="bg-purple-50 p-4 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Claims Processed</p>
                          <p className="font-semibold text-lg">{roleSpecificData.claims_processed || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Approved</p>
                          <p className="font-semibold text-lg text-green-600">✅ {roleSpecificData.claims_approved || 0}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Rejected</p>
                        <p className="font-semibold text-lg text-red-600">❌ {roleSpecificData.claims_rejected || 0}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser?.role === 'admin' && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Admin - Full System Access</p>
                      <p className="font-semibold text-lg">🔐 System Administrator</p>
                    </div>
                  )}
                </div>
              )}

              {/* Login History */}
              <div className="border-b pb-4">
                <h4 className="font-semibold mb-3">Login History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                  {loginHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No login history</p>
                  ) : (
                    loginHistory.map((log, i) => (
                      <div key={i} className="text-sm border-b pb-2 last:border-b-0">
                        <p className="text-gray-700 font-medium">{log.login_at?.toDate?.().toLocaleString() || 'Unknown'}</p>
                        {log.ip_address && <p className="text-xs text-gray-500">IP: {log.ip_address}</p>}
                        {log.device && <p className="text-xs text-gray-500">Device: {log.device}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Logs */}
              <div className="border-b pb-4">
                <h4 className="font-semibold mb-3">Activity Logs</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                  {activityLogs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity logs</p>
                  ) : (
                    activityLogs.map((log, i) => (
                      <div key={i} className="text-sm border-b pb-2 last:border-b-0">
                        <p className="text-gray-700 font-medium"><strong>{log.action}</strong></p>
                        <p className="text-xs text-gray-500">{log.created_at?.toDate?.().toLocaleString() || 'Unknown'}</p>
                        {log.details && <p className="text-xs text-gray-600">{log.details}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => setSelectedUser(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={handleDeleteUser}
                  variant="destructive"
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? 'Deleting...' : '🗑️ Delete User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ============ CUSTOM CLAIMS TAB (Manage User Roles & Firebase Claims) ============

interface User {
  id: string;
  email: string;
  full_name: string;
  admin?: boolean;
}

interface UserClaims {
  admin: boolean;
}

// ============ NOTIFICATIONS & ANNOUNCEMENTS TAB ============

const AdminNotificationsTab: React.FC<{ userId: string; profile: any; type: 'notification' | 'announcement' }> = ({ userId, profile, type }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadItems();
  }, [type]);

  async function loadItems() {
    setLoading(true);
    try {
      const allItems = await Customer.fetchNotifications();
      const filtered = allItems.filter((item: any) => item.type === type);
      setItems(filtered);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error(`Failed to load ${type}s`);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content required');
      return;
    }
    try {
      await Customer.createNotification(
        title,
        content,
        type,
        userId,
        profile?.full_name || 'Admin',
        profile?.role || 'admin',
        isPublished
      );
      setTitle('');
      setContent('');
      setIsPublished(false);
      await loadItems();
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} created!`);
    } catch (err) {
      console.error(err);
      toast.error(`Error creating ${type}`);
    }
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await Customer.deleteNotification(itemId);
      await loadItems();
      toast.success('Deleted');
    } catch (err) {
      console.error(err);
      toast.error('Error deleting');
    }
  }

  async function handleTogglePublish(item: any) {
    try {
      await Customer.updateNotification(item.id, { is_published: !item.is_published });
      await loadItems();
      toast.success('Updated');
    } catch (err) {
      console.error(err);
      toast.error('Error updating');
    }
  }

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const bgColor = type === 'announcement' ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-300';

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${bgColor}`}>
        <CardHeader>
          <CardTitle>Create {typeLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">Title</Label>
            <Input
              placeholder={`${typeLabel} title...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm">Content</Label>
            <Textarea
              placeholder={`${typeLabel} content...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="publish"
              checked={isPublished}
              onCheckedChange={(checked) => setIsPublished(checked as boolean)}
            />
            <Label htmlFor="publish" className="cursor-pointer">Publish immediately</Label>
          </div>
          <Button onClick={handleCreate} className="w-full">
            Create {typeLabel}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-8 text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No {type}s created yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className="font-bold">{item.title}</p>
                    <p className="text-sm text-gray-700 mt-1">{item.content}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge>{item.is_published ? '✅ Published' : '⏸️ Draft'}</Badge>
                      <Badge variant="secondary">{item.creator_name}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => handleTogglePublish(item)}
                      size="sm"
                      variant="outline"
                      title={item.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {item.is_published ? '📴' : '📡'}
                    </Button>
                    <Button
                      onClick={() => handleDelete(item.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomClaimsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [claims, setClaims] = useState<UserClaims>({ admin: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adminServerUrl, setAdminServerUrl] = useState('http://localhost:4000');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(firebaseDb, 'profiles'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const list: User[] = snap.docs.map((d) => ({
        id: d.id,
        email: d.data().email || '',
        full_name: d.data().full_name || 'User',
        admin: d.data().admin || false,
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
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const idToken = await currentUser.getIdToken();

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

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Admin Server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No users found</p>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedUid === u.id
                      ? 'bg-blue-50 border-blue-500 shadow-md'
                      : 'hover:bg-gray-100'
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
        </CardContent>
      </Card>

      {selectedUid && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Manage Custom Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="admin-claim"
                  checked={claims.admin}
                  onCheckedChange={(checked) =>
                    setClaims(prev => ({ ...prev, admin: checked === true }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="admin-claim" className="cursor-pointer font-semibold text-base">
                    Admin Privileges
                  </Label>
                  <p className="text-sm text-gray-600 mt-2">
                    Grants full platform access including:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                    <li>Manage all users and their roles</li>
                    <li>Edit, delete, hide, unhide, approve products</li>
                    <li>Set custom claims for other users</li>
                    <li>Access all role dashboards</li>
                    <li>View platform analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSetClaims}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              size="lg"
            >
              {submitting ? 'Updating...' : 'Update Claims'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No users found</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{u.full_name}</h3>
                      {u.admin && (
                        <Badge className="bg-red-100 text-red-800">
                          <Lock className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{u.email || u.id}</p>
                  </div>
                  <Button
                    onClick={() => handleSelectUser(u.id)}
                    variant={selectedUid === u.id ? 'default' : 'outline'}
                    size="sm"
                  >
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ SETTINGS TAB ============

const SettingsTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [marketplaceLocked, setMarketplaceLocked] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const siteSettings = await admin.getSiteSettings();
        setSettings(siteSettings);
        setMaintenanceMode(siteSettings.maintenance_mode || false);
        setMarketplaceLocked(siteSettings.marketplace_locked || false);
        setMaintenanceMessage(siteSettings.maintenance_message || '');
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleUpdateSettings = async () => {
    if (!maintenanceMessage.trim()) {
      toast.error('Please enter a maintenance message');
      return;
    }

    setSaving(true);
    try {
      await admin.updateSiteSettings(
        {
          maintenance_mode: maintenanceMode,
          marketplace_locked: marketplaceLocked,
          maintenance_message: maintenanceMessage,
        },
        userId
      );
      toast.success('Site settings updated successfully');
      setSettings({
        ...settings,
        maintenance_mode: maintenanceMode,
        marketplace_locked: marketplaceLocked,
        maintenance_message: maintenanceMessage,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Platform Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Control website access and maintenance status. When enabled, visitors will see a locked/maintenance message instead of the marketplace.
            </p>
          </div>

          {/* Marketplace Lock Control */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="font-semibold text-base">🔒 Marketplace Locked</Label>
                <p className="text-sm text-gray-600">
                  {marketplaceLocked ? 'Currently LOCKED' : 'Currently OPEN'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Lock the marketplace for new orders. Users will see "Marketplace Locked" message.
                </p>
              </div>
              <Button
                onClick={() => setMarketplaceLocked(!marketplaceLocked)}
                variant={marketplaceLocked ? 'destructive' : 'outline'}
                className="ml-4"
              >
                {marketplaceLocked ? 'Unlock' : 'Lock'}
              </Button>
            </div>
            
            {marketplaceLocked && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                <p className="text-sm text-red-900 font-semibold">🔴 Marketplace is Currently Locked</p>
                <p className="text-xs text-red-800 mt-1">
                  New orders are disabled. Existing customers can still browse.
                </p>
              </div>
            )}
          </div>

          {/* Maintenance Mode Control */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="font-semibold text-base">🔧 Maintenance Mode</Label>
                <p className="text-sm text-gray-600">
                  {maintenanceMode ? 'Currently ENABLED' : 'Currently DISABLED'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Full maintenance mode. Only admins can access the site.
                </p>
              </div>
              <Button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                variant={maintenanceMode ? 'destructive' : 'outline'}
                className="ml-4"
              >
                {maintenanceMode ? 'Disable' : 'Enable'}
              </Button>
            </div>
            
            {maintenanceMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-3">
                <p className="text-sm text-yellow-900 font-semibold">⚠️ Full Maintenance Mode Active</p>
                <p className="text-xs text-yellow-800 mt-1">
                  All regular users are blocked. Site shows maintenance message.
                </p>
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm">
                  <p className="text-gray-600 font-medium">Marketplace Status</p>
                  <p className={`text-2xl font-bold ${marketplaceLocked ? 'text-red-600' : 'text-green-600'}`}>
                    {marketplaceLocked ? '🔒 LOCKED' : '✅ OPEN'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="text-sm">
                  <p className="text-gray-600 font-medium">Maintenance Status</p>
                  <p className={`text-2xl font-bold ${maintenanceMode ? 'text-orange-600' : 'text-green-600'}`}>
                    {maintenanceMode ? '🔧 ON' : '✅ OFF'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Message Editor */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Maintenance & Lock Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maintenance-msg">Message to Display</Label>
            <p className="text-sm text-gray-600 mb-2">
              This message will be shown when either marketplace is locked or maintenance mode is enabled
            </p>
            <Textarea
              id="maintenance-msg"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Enter maintenance/lock message..."
              rows={6}
              className="w-full font-mono text-sm"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="font-semibold text-sm mb-3">📋 Live Preview:</p>
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 text-center">
              <div className="mb-4">
                {maintenanceMode ? (
                  <AlertCircle className="h-12 w-12 text-orange-600 mx-auto" />
                ) : marketplaceLocked ? (
                  <Lock className="h-12 w-12 text-red-600 mx-auto" />
                ) : (
                  <span className="text-4xl">✅</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {maintenanceMode ? 'Website Under Maintenance' : marketplaceLocked ? 'Marketplace Locked' : 'Website Operational'}
              </h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{maintenanceMessage || 'No message set'}</p>
            </div>
          </div>

          <Button
            onClick={handleUpdateSettings}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Last Updated Info */}
      {settings?.updated_at && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6 text-sm text-gray-600">
            <p>
              ⏱️ <strong>Last Updated:</strong> {settings.updated_at?.toDate?.().toLocaleString() || 'Unknown'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============

const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalClaims: 0, totalMessages: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const users = await admin.getAllUsers();
        const claims = await admin.fetchAllClaims();
        const messages = await admin.fetchAllMessages();

        setStats({
          totalUsers: users.length,
          totalClaims: claims.length,
          totalMessages: messages.length,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    if (user) loadStats();
  }, [user]);

  return (
    <Layout>
      <div className="site-container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage communications, claims, and user accounts</p>
        </div>

        {/* Quick Links */}
        <div className="mb-6 flex gap-3">
          <Link to="/admin/products">
            <Button>Product Management</Button>
          </Link>
          <Link to="/admin/claims-manager">
            <Button variant="ghost">Claims Manager</Button>
          </Link>
          <Link to="/admin/seller-analytics">
            <Button variant="ghost">Seller Analytics</Button>
          </Link>
          <Link to="/seller/analytics">
            <Button variant="ghost">My Analytics</Button>
          </Link>
          <Link to="/admin/dashboard">
            <Button variant="outline">Refresh</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Claims</p>
                  <p className="text-3xl font-bold">{stats.totalClaims}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Messages</p>
                  <p className="text-3xl font-bold">{stats.totalMessages}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="communication">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="roles">Manage Roles</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="communication">
            {user && <CommunicationTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="claims">
            {user && <ClaimsTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="notifications">
            {user && profile && <AdminNotificationsTab userId={user.uid} profile={profile} type="notification" />}
          </TabsContent>

          <TabsContent value="announcements">
            {user && profile && <AdminNotificationsTab userId={user.uid} profile={profile} type="announcement" />}
          </TabsContent>

          <TabsContent value="roles">
            {user && <CustomClaimsTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="users">
            {user && <UserManagementTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="settings">
            {user && <SettingsTab userId={user.uid} />}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;