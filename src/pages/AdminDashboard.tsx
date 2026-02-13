import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { db as firebaseDb } from '@/lib/firebaseClient';
import * as admin from '@/lib/admin';
import * as seller from '@/lib/seller';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await admin.getAllUsers();
        setUsers(allUsers as any);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handleViewUserDetails = async (user: UserDetail) => {
    try {
      const [loginHist, activityLog] = await Promise.all([
        admin.fetchUserLoginHistory(user.id),
        admin.fetchUserActivityLogs(user.id),
      ]);
      setLoginHistory(loginHist);
      setActivityLogs(activityLog);
      setSelectedUser(user);
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      await admin.updateUserStatus(userId, status);
      toast.success('User status updated');
      setUsers(users.map((u) => (u.id === userId ? { ...u, ban_status: status } : u)));
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower);
    return matchesRole && matchesSearch;
  });

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
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
          <div>
            <label className="text-sm font-medium mb-2 block">Filter by Role</label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="seller">Sellers</SelectItem>
                <SelectItem value="editor">Editors</SelectItem>
                <SelectItem value="content_manager">Content Managers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {filteredUsers.map((user) => (
        <Card key={user.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.full_name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge>{user.role}</Badge>
                  {user.ban_status && (
                    <Badge variant="destructive">{user.ban_status}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button onClick={() => handleViewUserDetails(user)} variant="outline">
                  <Users className="h-4 w-4 mr-1" />
                  Details
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

      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedUser.full_name} - Account Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Login History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {loginHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No login history</p>
                  ) : (
                    loginHistory.map((log, i) => (
                      <div key={i} className="text-sm border-b pb-2">
                        <p className="text-gray-700">{log.created_at?.toDate?.().toLocaleString()}</p>
                        {log.ip_address && <p className="text-xs text-gray-500">IP: {log.ip_address}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Activity Logs</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity logs</p>
                  ) : (
                    activityLogs.map((log, i) => (
                      <div key={i} className="text-sm border-b pb-2">
                        <p className="text-gray-700"><strong>{log.action}</strong></p>
                        <p className="text-xs text-gray-500">{log.created_at?.toDate?.().toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button onClick={() => setSelectedUser(null)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// ============ MAIN COMPONENT ============

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
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
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage communications, claims, and user accounts</p>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="communication">
            {user && <CommunicationTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="claims">
            {user && <ClaimsTab userId={user.uid} />}
          </TabsContent>

          <TabsContent value="users">
            {user && <UserManagementTab userId={user.uid} />}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;