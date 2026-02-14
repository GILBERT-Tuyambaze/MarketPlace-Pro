import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as Editor from '../lib/editor';
import Layout from '@/components/Layout/Layout';

export default function EditorDashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'approvals' | 'claims' | 'messages' | 'users'>('approvals');

  if (!user || !profile || !(Editor.canEditorPerform(profile.role))) {
    return <div className="p-4">Access denied. Editor role required.</div>;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Editor Dashboard</h1>
        
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${tab === 'approvals' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('approvals')}
          >
            Approvals
          </button>
          <button
            className={`px-4 py-2 rounded ${tab === 'claims' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('claims')}
          >
            Claims
          </button>
          <button
            className={`px-4 py-2 rounded ${tab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('users')}
          >
            Users
          </button>
          <button
            className={`px-4 py-2 rounded ${tab === 'messages' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTab('messages')}
          >
            Messages
          </button>
        </div>

        {tab === 'approvals' && <ApprovalsTab user={user} />}
        {tab === 'claims' && <ClaimsTab user={user} />}
        {tab === 'users' && <UsersTab user={user} />}
        {tab === 'messages' && <MessagesTab user={user} />}
      </div>
    </Layout>
  );
}

function ApprovalsTab({ user }: { user: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const p = await Editor.fetchPendingProducts();
      const s = await Editor.fetchPendingSellers();
      if (!mounted) return;
      setProducts(p as any[]);
      setSellers(s as any[]);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {loading && <div>Loading pending requests...</div>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Pending Product Requests</h2>
        {products.length === 0 && <div className="text-sm text-muted-foreground">No pending products.</div>}
        <ul className="space-y-3 mt-3">
          {products.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{p.title || p.name}</div>
                  <div className="text-sm text-gray-600">Seller: {p.seller_name}</div>
                </div>
                <div className="space-x-2">
                  <ApproveButtons
                    itemId={p.id}
                    type="product"
                    onDone={() => setProducts((cur) => cur.filter((x) => x.id !== p.id))}
                    actorId={user.uid}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Pending Seller Requests</h2>
        {sellers.length === 0 && <div className="text-sm text-muted-foreground">No pending sellers.</div>}
        <ul className="space-y-3 mt-3">
          {sellers.map((s) => (
            <li key={s.id} className="border rounded p-3 flex justify-between">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-sm text-gray-600">ID: {s.id}</div>
              </div>
              <div className="space-x-2">
                <ApproveButtons
                  itemId={s.id}
                  type="seller"
                  onDone={() => setSellers((cur) => cur.filter((x) => x.id !== s.id))}
                  actorId={user.uid}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ClaimsTab({ user }: { user: any }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadClaims(dept: string) {
    setLoading(true);
    const fetched = await Editor.fetchClaimsForDepartment(dept || 'Editor Department');
    setClaims(fetched as any[]);
    setLoading(false);
  }

  useEffect(() => {
    loadClaims('Editor Department');
  }, []);

  async function handleStatusChange(claimId: string, newStatus: string) {
    try {
      await Editor.updateClaimStatus(claimId, newStatus as any, user.uid, 'editor');
      setClaims((cur) => cur.map((c) => (c.id === claimId ? { ...c, status: newStatus } : c)));
    } catch (err) {
      console.error(err);
      alert('Error updating claim status');
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Claims for Editor Department</h2>
      {loading && <div>Loading...</div>}
      {claims.length === 0 && <div className="text-sm text-muted-foreground">No claims.</div>}
      <ul className="space-y-3">
        {claims.map((c) => (
          <li key={c.id} className="border rounded p-3">
            <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-600">From: {c.sender_id}</div>
                <div className="text-sm">Status: <span className={`px-2 py-1 rounded text-white ${c.status === 'resolved' ? 'bg-green-600' : 'bg-yellow-600'}`}>{c.status}</span></div>
              </div>
            </div>
            {expandedId === c.id && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm mb-2">{c.description}</div>
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c.id, e.target.value)}
                  className="border px-2 py-1 rounded"
                >
                  <option value="sent">Sent</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessagesTab({ user }: { user: any }) {
  const [recipient, setRecipient] = useState('');
  const [isRoleBased, setIsRoleBased] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject || !body || !recipient) {
      alert('Please fill all fields');
      return;
    }
    setSending(true);
    try {
      const recipients = isRoleBased ? [{ role: recipient }] : [{ uid: recipient }];
      await Editor.sendMessage(user.uid, 'editor', recipients, subject, body);
      setSubject('');
      setBody('');
      setRecipient('');
      alert('Message sent!');
    } catch (err) {
      console.error(err);
      alert('Error sending message');
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Send Message</h2>
      <label>
        <input type="checkbox" checked={isRoleBased} onChange={(e) => setIsRoleBased(e.target.checked)} />
        &nbsp;Role-based (vs individual user)
      </label>
      <div>
        <label className="block text-sm font-medium">Recipient {isRoleBased ? '(role)' : '(user ID)'}</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={isRoleBased ? 'e.g., seller, admin, editor' : 'e.g., user-uid'}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded">
        Send
      </button>
    </div>
  );
}

function UsersTab({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [filterOnlineStatus, setFilterOnlineStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [authStatuses, setAuthStatuses] = useState<Map<string, any>>(new Map());
  const [refreshTime, setRefreshTime] = useState(new Date());

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await Editor.getAllUsers();
        // Filter out admin users - editors should not see admin info
        const filteredUsers = (allUsers || []).filter((u: any) => u.role !== 'admin');
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Refresh online status every 30 seconds
  useEffect(() => {
    const refreshAuthStatuses = async () => {
      try {
        const authStatusList = await Editor.getAllAuthUserStatuses();
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
    return diffMins < 5;
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    let matchesOnlineStatus = filterOnlineStatus === 'all';
    if (filterOnlineStatus === 'online') {
      const authData = authStatuses.get(u.id);
      matchesOnlineStatus = authData?.is_online || false;
    } else if (filterOnlineStatus === 'offline') {
      const authData = authStatuses.get(u.id);
      matchesOnlineStatus = !authData?.is_online;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower);
    
    return matchesRole && matchesOnlineStatus && matchesSearch;
  });

  if (loading) return <div className="text-center py-8">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Search by Name or Email</label>
          <input
            placeholder="Type name or email..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="seller">Sellers</option>
              <option value="editor">Editors</option>
              <option value="content_manager">Content Managers</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filter by Online Status</label>
            <select
              value={filterOnlineStatus}
              onChange={(e) => setFilterOnlineStatus(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              <option value="all">All Users</option>
              <option value="online">🟢 Online Now</option>
              <option value="offline">⚫ Offline</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            📊 Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No users found matching your filters</p>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user_item) => {
            const authData = authStatuses.get(user_item.id);
            const isUserOnline = authData?.is_online || false;
            
            return (
              <div key={`${user_item.id}-${refreshTime.getTime()}`} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{user_item.full_name}</h3>
                    <p className="text-sm text-gray-600">{user_item.email}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {user_item.role}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded flex items-center ${isUserOnline ? 'bg-green-50 border border-green-500 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                        <span className={`h-2 w-2 rounded-full mr-2 inline-block ${isUserOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {isUserOnline ? '🟢 Online' : `⏱️ ${formatLastOnline(authData?.last_active)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApproveButtons({ itemId, type, onDone, actorId }: { itemId: string; type: 'product' | 'seller'; onDone: () => void; actorId: string }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function doDecision(status: string) {
    setBusy(true);
    try {
      if (type === 'product') {
        await Editor.setProductRequestStatus(itemId, status as any, actorId, comment || undefined);
      } else {
        await Editor.setSellerRequestStatus(itemId, status === 'approved' ? 'approved' : 'rejected', actorId, comment || undefined);
      }
      onDone();
    } catch (err) {
      console.error(err);
      alert('Error processing decision');
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center">
      <input
        aria-label="Comment"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="border px-2 py-1 mr-2"
      />
      <button className="btn btn-sm bg-green-600 text-white mr-1" disabled={busy} onClick={() => doDecision('approved')}>
        Approve
      </button>
      <button className="btn btn-sm bg-yellow-600 text-white mr-1" disabled={busy} onClick={() => doDecision('needs_revision')}>
        Needs Revision

      </button>
      <button className="btn btn-sm bg-red-600 text-white" disabled={busy} onClick={() => doDecision('rejected')}>
        Reject
      </button>
    </div>
  );
}