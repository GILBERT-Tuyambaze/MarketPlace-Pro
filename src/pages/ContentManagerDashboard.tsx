import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as CM from '../lib/contentManager';
import * as Customer from '../lib/customer';
import Layout from '@/components/Layout/Layout';

export default function ContentManagerDashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'users' | 'claims' | 'messages' | 'notifications' | 'announcements' | 'orders'>('users');

  if (!user || !profile || !CM.canContentManagerPerform(profile.role)) {
    return <div className="p-4">Access denied. Content Manager role required.</div>;
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Content Manager Dashboard</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['users', 'claims', 'messages', 'notifications', 'announcements', 'orders'].map((t) => (
            <button
              key={t}
              className={`px-4 py-2 rounded capitalize transition ${
                tab === t ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
              onClick={() => setTab(t as any)}
            >
              {t === 'users' ? '👥 Users' : t === 'claims' ? '📋 Claims' : t === 'messages' ? '💬 Messages' : t === 'notifications' ? '🔔 Notifications' : t === 'announcements' ? '📢 Announcements' : '📦 Orders'}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab user={user} />}
        {tab === 'claims' && <ClaimsTab user={user} />}
        {tab === 'messages' && <MessagesTab user={user} />}
        {tab === 'notifications' && <NotificationsTab user={user} profile={profile} />}
        {tab === 'announcements' && <AnnouncementsTab user={user} />}
        {tab === 'orders' && <OrdersTab user={user} />}
      </div>
    </Layout>
  );
}

// ============ PRODUCTS TAB ============
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
        const allUsers = await CM.getAllUsers();
        // Filter out admin users - content managers should not see admin info
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
        const authStatusList = await CM.getAllAuthUserStatuses();
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
          {filteredUsers.map((u) => {
            const authData = authStatuses.get(u.id);
            const isUserOnline = authData?.is_online || false;
            
            return (
              <div key={`${u.id}-${refreshTime.getTime()}`} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{u.full_name}</h3>
                    <p className="text-sm text-gray-600">{u.email}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {u.role}
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

// ============ CLAIMS TAB ============
function ClaimsTab({ user }: { user: any }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await CM.fetchClaimsForContentManager();
      setClaims(c as any[]);
      setLoading(false);
    })();
  }, []);

  async function handleStatusChange(claimId: string, status: string) {
    try {
      await CM.updateClaimStatus(claimId, status as any, user.uid, statusNote);
      const updated = claims.map((c) =>
        c.id === claimId ? { ...c, status } : c
      );
      setClaims(updated);
      setStatusNote('');
      alert('Claim status updated!');
    } catch (err) {
      console.error(err);
      alert('Error updating claim');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Content Manager Department Claims</h2>
      {loading && <div>Loading claims...</div>}
      {claims.length === 0 && <div className="text-sm text-gray-500">No claims directed to you.</div>}

      <ul className="space-y-3">
        {claims.map((c) => (
          <li key={c.id} className="border rounded p-4">
            <div
              className="cursor-pointer flex justify-between items-start"
              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            >
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-600">From: {c.sender_id}</div>
                <span className={`inline-block px-2 py-1 rounded text-xs text-white mt-1 ${
                  c.status === 'resolved' ? 'bg-green-600' : 'bg-yellow-600'
                }`}>
                  {c.status}
                </span>
              </div>
            </div>

            {expandedId === c.id && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <div className="text-sm">{c.description}</div>
                <select
                  value={c.status}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="border px-2 py-1 rounded text-sm"
                >
                  <option value="sent">Sent</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note..."
                  rows={2}
                  className="border w-full px-2 py-1 rounded text-sm"
                />
                <button
                  onClick={() => handleStatusChange(c.id, newStatus || c.status)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Update Status
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ MESSAGES TAB ============
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
      await CM.sendMessage(user.uid, recipients, subject, body);
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
    <div className="space-y-4 max-w-lg">
      <h2 className="text-lg font-semibold">Send Message</h2>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={isRoleBased}
          onChange={(e) => setIsRoleBased(e.target.checked)}
          className="mr-2"
        />
        Role-based message {isRoleBased ? '(vs individual user)' : ''}
      </label>

      <div>
        <label className="block text-sm font-medium mb-1">
          Recipient {isRoleBased ? '(role)' : '(user ID)'}
        </label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={isRoleBased ? 'e.g., editor, admin, seller' : 'e.g., user-uid'}
          className="border w-full px-3 py-2 rounded"
        />
        {isRoleBased && (
          <div className="text-xs text-gray-600 mt-1">
            Available roles: editor, admin, seller, content_manager
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border w-full px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="border w-full px-3 py-2 rounded"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Send Message
      </button>
    </div>
  );
}

// ============ NOTIFICATIONS TAB ============
function NotificationsTab({ user, profile }: { user: any; profile: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [activeType, setActiveType] = useState<'notification' | 'announcement'>('notification');


  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const notifs = await Customer.fetchNotifications();
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
      alert('Failed to load notifications');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      alert('Title and content required');
      return;
    }
    try {
      await Customer.createNotification(
        title,
        content,
        activeType,
        user.uid,
        profile?.full_name || user.email,
        profile?.role || 'user',
        isPublished
      );
      setTitle('');
      setContent('');
      setIsPublished(false);
      await loadNotifications();
      alert(`${activeType.charAt(0).toUpperCase() + activeType.slice(1)} created!`);
    } catch (err) {
      console.error(err);
      alert(`Error creating ${activeType}`);
    }
  }

  const filteredNotifications = notifications.filter((n) => n.type === activeType);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setActiveType('notification')}
          className={`px-4 py-2 rounded transition ${
            activeType === 'notification' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          🔔 Notifications
        </button>
        <button
          onClick={() => setActiveType('announcement')}
          className={`px-4 py-2 rounded transition ${
            activeType === 'announcement' ? 'bg-orange-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          📢 Announcements
        </button>
      </div>

      <div className={`p-4 rounded border-2 ${activeType === 'announcement' ? 'border-orange-300 bg-orange-50' : 'border-blue-300 bg-blue-50'}`}>
        <h3 className="font-bold mb-3">Create {activeType}</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1"
          />
          <textarea
            placeholder="Content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-2 py-1 h-20"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              id="publish-now"
            />
            <label htmlFor="publish-now">Publish immediately</label>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredNotifications.length === 0 ? (
        <p className="text-gray-500">No {activeType}s created yet</p>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => (
            <div key={notif.id} className="p-3 border rounded bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{notif.title}</p>
                  <p className="text-sm text-gray-700">{notif.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {notif.is_published ? '✅ Published' : '⏸️ Draft'} • {notif.creator_name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ANNOUNCEMENTS TAB ============
function AnnouncementsTab({ user }: { user: any }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('All users');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    const a = await CM.fetchAnnouncements();
    setAnnouncements(a as any[]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!title || !content) {
      alert('Title and content required');
      return;
    }
    try {
      await CM.createAnnouncement(title, content, audience, undefined, undefined, user.uid);
      setTitle('');
      setContent('');
      setAudience('All users');
      await loadAnnouncements();
      alert('Announcement created!');
    } catch (err) {
      console.error(err);
      alert('Error creating announcement');
    }
  }

  async function handlePublish(announcementId: string) {
    try {
      await CM.publishAnnouncement(announcementId, user.uid);
      await loadAnnouncements();
      alert('Announcement published!');
    } catch (err) {
      console.error(err);
      alert('Error publishing announcement');
    }
  }

  async function handleDelete(announcementId: string) {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await CM.deleteAnnouncement(announcementId, user.uid);
      await loadAnnouncements();
      alert('Announcement deleted!');
    } catch (err) {
      console.error(err);
      alert('Error deleting announcement');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Website Announcements</h2>

      <div className="border rounded p-4 bg-gray-50 space-y-3">
        <h3 className="font-medium">Create Announcement</h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border w-full px-3 py-2 rounded"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          rows={4}
          className="border w-full px-3 py-2 rounded"
        />
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="border w-full px-3 py-2 rounded"
        >
          <option>All users</option>
          <option>Sellers</option>
          <option>Editors</option>
          <option>Admins</option>
          <option>Customers</option>
        </select>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create
        </button>
      </div>

      {loading && <div>Loading announcements...</div>}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-gray-600">Audience: {a.target_audience}</div>
                <span className={`inline-block px-2 py-1 rounded text-xs text-white mt-1 ${
                  a.status === 'published' ? 'bg-green-600' : a.status === 'draft' ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {a.status}
                </span>
              </div>
              <div className="space-x-2">
                {a.status === 'draft' && (
                  <button
                    onClick={() => handlePublish(a.id)}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    Publish
                  </button>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ ORDERS TAB ============
function OrdersTab({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'order_id' | 'buyer_name' | 'seller_name'>('order_id');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageTo, setMessageTo] = useState<'buyer' | 'seller'>('buyer');

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    const o = await CM.fetchOrders();
    setOrders(o as any[]);
    setLoading(false);
  }

  async function handleSearch() {
    setLoading(true);
    const results = await CM.searchOrders(searchTerm, searchBy);
    setOrders(results as any[]);
    setLoading(false);
  }

  async function handleSendOrderMessage() {
    if (!selectedOrderId || !messageSubject || !messageBody) {
      alert('Please fill all fields');
      return;
    }
    try {
      await CM.sendOrderMessage(
        selectedOrderId,
        messageTo,
        messageSubject,
        messageBody,
        user.uid
      );
      setMessageSubject('');
      setMessageBody('');
      alert('Message sent!');
    } catch (err) {
      console.error(err);
      alert('Error sending message');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Order Tracking & Management</h2>

      {/* Search */}
      <div className="border rounded p-4 bg-gray-50 space-y-3">
        <h3 className="font-medium">Search Orders</h3>
        <div className="flex gap-2">
          <select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value as any)}
            className="border px-3 py-2 rounded"
          >
            <option value="order_id">Order ID</option>
            <option value="buyer_name">Buyer Name</option>
            <option value="seller_name">Seller Name</option>
          </select>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search by ${searchBy}...`}
            className="border flex-1 px-3 py-2 rounded"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {loading && <div>Loading orders...</div>}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {orders.map((o) => (
          <div
            key={o.id}
            className={`border rounded p-3 cursor-pointer transition ${
              selectedOrderId === o.id ? 'bg-blue-50 border-blue-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}
            onClick={() => setSelectedOrderId(o.id)}
          >
            <div className="font-medium">Order {o.id?.slice(0, 8)}</div>
            <div className="text-sm text-gray-600">Buyer: {o.buyer_name || 'N/A'}</div>
            <div className="text-sm text-gray-600">Seller: {o.seller_name || 'N/A'}</div>
            <div className="text-sm text-gray-600">Status: {o.status || 'Pending'}</div>
          </div>
        ))}
      </div>

      {/* Order Message */}
      {selectedOrderId && (
        <div className="border rounded p-4 bg-yellow-50 space-y-3">
          <h3 className="font-medium">Send Message for Order</h3>
          <select
            value={messageTo}
            onChange={(e) => setMessageTo(e.target.value as any)}
            className="border w-full px-3 py-2 rounded"
          >
            <option value="buyer">Message Buyer</option>
            <option value="seller">Message Seller</option>
          </select>
          <input
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            placeholder="Subject"
            className="border w-full px-3 py-2 rounded"
          />
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Message"
            rows={3}
            className="border w-full px-3 py-2 rounded"
          />
          <button
            onClick={handleSendOrderMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
}