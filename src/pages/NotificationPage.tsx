import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Customer from '@/lib/customer';
import { Plus, Trash2, Edit2, Bell, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'notification' | 'announcement';
  created_by: string;
  creator_name: string;
  creator_role: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_published: boolean;
  read_by?: string[];
}

export default function NotificationPage() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notification' | 'announcement'>('notification');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_published: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if user can create/edit notifications
  const canManageNotifications = profile?.role === 'admin' || profile?.role === 'content_manager';

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const notifs = await Customer.fetchNotifications(profile?.role);
        setNotifications(notifs);
      } catch (error) {
        console.error('Error loading notifications:', error);
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      loadNotifications();
      // Refresh every 10 seconds
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, profile?.role]);

  const handleSubmitNotification = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // Update existing
        await Customer.updateNotification(editingId, {
          title: formData.title,
          content: formData.content,
          is_published: formData.is_published,
        });
        toast.success('Item updated');
      } else {
        // Create new
        await Customer.createNotification(
          formData.title,
          formData.content,
          activeTab,
          user!.uid,
          profile?.full_name || user!.email || 'User',
          profile?.role || 'user',
          formData.is_published
        );
        toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} created`);
      }

      // Reload notifications
      const notifs = await Customer.fetchNotifications(profile?.role);
      setNotifications(notifs);

      // Reset form
      setFormData({ title: '', content: '', is_published: false });
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving notification:', error);
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditNotification = (notif: Notification) => {
    // Only allow editing own notifications (unless admin)
    if (profile?.role !== 'admin' && notif.created_by !== user?.uid) {
      toast.error('You can only edit your own items');
      return;
    }

    setFormData({
      title: notif.title,
      content: notif.content,
      is_published: notif.is_published,
    });
    setActiveTab(notif.type);
    setEditingId(notif.id);
    setShowForm(true);
  };

  const handleDeleteNotification = async (notifId: string) => {
    const notif = notifications.find((n) => n.id === notifId);
    
    // Only allow deletion by creator (unless admin)
    if (profile?.role !== 'admin' && notif?.created_by !== user?.uid) {
      toast.error('You can only delete your own items');
      return;
    }

    if (!window.confirm('Delete this item?')) return;

    try {
      await Customer.deleteNotification(notifId);
      setNotifications(notifications.filter((n) => n.id !== notifId));
      if (selectedNotification?.id === notifId) {
        setSelectedNotification(null);
      }
      toast.success('Deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setSelectedNotification(notif);
    // Mark as read
    if (user?.uid) {
      try {
        await Customer.markNotificationAsRead(notif.id, user.uid);
        // Update local state
        setNotifications(
          notifications.map((n) =>
            n.id === notif.id
              ? { ...n, read_by: [...(n.read_by || []), user.uid] }
              : n
          )
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const canEditOrDelete = (notif: Notification) => {
    return profile?.role === 'admin' || notif.created_by === user?.uid;
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || (timestamp instanceof Date ? timestamp : new Date());
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((n) => n.type === activeTab);

  const getTypeIcon = (type: 'notification' | 'announcement') => {
    return type === 'announcement' ? <Megaphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />;
  };

  const getTypeColor = (type: 'notification' | 'announcement') => {
    return type === 'announcement' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
  };

  const isNotificationUnread = (notif: Notification) => {
    return user?.uid && !(notif.read_by?.includes(user.uid) || false);
  };

  if (!user || !profile) {
    return (
      <Layout>
        <div className="p-4">Access denied. You must be logged in.</div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter={true}>
      {/* Create/Edit modal for notifications/announcements */}
      <Dialog open={showForm} onOpenChange={(open) => setShowForm(open)}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Item' : `Create ${activeTab === 'announcement' ? 'Announcement' : 'Notification'}`}</DialogTitle>
          </DialogHeader>
          <div className={`p-4 ${activeTab === 'announcement' ? 'bg-orange-50' : 'bg-blue-50'}`}>
            <Input
              placeholder="Title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-sm w-full"
            />
            <Textarea
              placeholder="Content..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              className="text-sm w-full mt-3"
            />
            <div className="flex items-center gap-3 mt-3">
              <input
                type="checkbox"
                id="pub_modal"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              />
              <label htmlFor="pub_modal" className="text-sm">Publish now</label>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmitNotification} disabled={submitting} className="flex-1">
                Save
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setFormData({ title: '', content: '', is_published: false }); }} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="site-container flex flex-col md:flex-row h-[calc(100vh-80px)] bg-background">
        {/* Left Panel - Notification List */}
        <div className="w-full md:w-96 border-r bg-background flex flex-col">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Notifications</h1>
              {canManageNotifications && (
                <Button
                  onClick={() => {
                    setFormData({ title: '', content: '', is_published: false });
                    setEditingId(null);
                    setShowForm(!showForm);
                  }}
                  size="sm"
                  variant="outline"
                  title="Create new"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Tabs */}
            {canManageNotifications && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('notification')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    activeTab === 'notification'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  🔔 Notifications
                </button>
                <button
                  onClick={() => setActiveTab('announcement')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    activeTab === 'announcement'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  📢 Announcements
                </button>
              </div>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No {activeTab}s</div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notif) => {
                  const isUnread = isNotificationUnread(notif);
                  const isSelected = selectedNotification?.id === notif.id;
                  
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 cursor-pointer transition hover:bg-muted border-l-4 ${
                        isSelected ? 'bg-muted border-l-blue-600' : 'border-l-transparent hover:border-l-gray-300'
                      } ${isUnread ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isUnread ? 'font-bold' : 'font-medium'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notif.content.split('\n')[0]}
                          </p>
                        </div>
                        {isUnread && <div className="h-2 w-2 bg-blue-600 rounded-full mt-1 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-1">
                          {notif.type === 'announcement' ? (
                            <Badge className="text-xs bg-orange-100 text-orange-800">Announcement</Badge>
                          ) : (
                            <Badge className="text-xs bg-blue-100 text-blue-800">Notification</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatTime(notif.updated_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Email Detail View */}
        <div className="flex-1 flex flex-col bg-background min-h-0">
          {selectedNotification ? (
            <>
              {/* Email Header */}
              <div className="border-b p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedNotification.title}</h2>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getTypeColor(selectedNotification.type)}>
                        {selectedNotification.type.charAt(0).toUpperCase() + selectedNotification.type.slice(1)}
                      </Badge>
                      {selectedNotification.is_published ? (
                        <Badge className="bg-green-600">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                  </div>

                  {canEditOrDelete(selectedNotification) && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditNotification(selectedNotification)}
                        size="sm"
                        variant="ghost"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNotification(selectedNotification.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">From:</span> {selectedNotification.creator_name} ({selectedNotification.creator_role})
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {selectedNotification.updated_at?.toDate?.().toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Readers:</span> {selectedNotification.read_by?.length || 0}
                  </p>
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 overflow-y-auto p-6 text-foreground">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
                  {selectedNotification.content}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Select a {activeTab} to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
