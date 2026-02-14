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
      toast.success('Deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete');
    }
  };

  const canEditOrDelete = (notif: Notification) => {
    return profile?.role === 'admin' || notif.created_by === user?.uid;
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
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

  if (!user || !profile) {
    return (
      <Layout>
        <div className="p-4">Access denied. You must be logged in.</div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter={canManageNotifications}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Notifications & Announcements</h1>
          {canManageNotifications && (
            <Button
              onClick={() => {
                setFormData({ title: '', content: '', is_published: false });
                setEditingId(null);
                setShowForm(!showForm);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Item
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        {canManageNotifications && (
          <div className="flex gap-2 border-b">
            <button
              onClick={() => {
                setActiveTab('notification');
                setShowForm(false);
              }}
              className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'notification'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button
              onClick={() => {
                setActiveTab('announcement');
                setShowForm(false);
              }}
              className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'announcement'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Announcements
            </button>
          </div>
        )}

        {/* New/Edit Form */}
        {showForm && canManageNotifications && (
          <Card className={`border-2 ${activeTab === 'announcement' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTypeIcon(activeTab)}
                {editingId ? `Edit ${activeTab}` : `Create ${activeTab}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Content..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="published" className="text-sm font-medium">
                  Publish immediately
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitNotification}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ title: '', content: '', is_published: false });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No {activeTab}s yet
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notif) => (
              <Card key={notif.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(notif.type)}
                          <h3 className="text-lg font-semibold">{notif.title}</h3>
                        </div>
                        {notif.is_published ? (
                          <Badge className="bg-green-600">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                        <Badge className={getTypeColor(notif.type)}>
                          {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-foreground/80 mb-3 whitespace-pre-wrap">
                        {notif.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          By {notif.creator_name} ({notif.creator_role})
                        </span>
                        <span>{formatTime(notif.updated_at)}</span>
                      </div>
                    </div>

                    {canEditOrDelete(notif) && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditNotification(notif)}
                          size="sm"
                          variant="outline"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteNotification(notif.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
