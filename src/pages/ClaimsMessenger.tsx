import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserProfileModal from '@/components/UserProfileModal';
import * as Customer from '@/lib/customer';
import { ClaimThread, ClaimMessage } from '@/lib/customer';
import { Send, Plus, MessageSquare, Clock, Edit2, Trash2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClaimsMessenger() {
  const { user, profile } = useAuth();
  const [claims, setClaims] = useState<ClaimThread[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimThread | null>(null);
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClaimData, setNewClaimData] = useState({
    title: '',
    description: '',
    claimType: 'complaint',
    department: 'admin',
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClaimThread[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [selectedProfileUserName, setSelectedProfileUserName] = useState<string | null>(null);
  const [selectedProfileUserRole, setSelectedProfileUserRole] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get allowed directing roles based on user role
  const getAllowedDirectToRoles = () => {
    if (profile?.role === 'customer' || profile?.role === 'seller') {
      // Customers and sellers can only direct to editors and content managers
      return ['editor', 'content_manager'];
    }
    // Editors, content managers, and admins can direct to any role
    return ['admin', 'editor', 'content_manager', 'seller', 'customer'];
  };

  // Load all claims
  useEffect(() => {
    const loadClaims = async () => {
      try {
        setLoading(true);
        const userClaims = await Customer.fetchCustomerClaims(
          user!.uid,
          profile?.role
        );
        setClaims(userClaims);
      } catch (error) {
        console.error('Error loading claims:', error);
        toast.error('Failed to load claims');
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) loadClaims();
  }, [user, profile?.role]);

  // Load messages for selected claim
  useEffect(() => {
    if (!selectedClaim) return;

    const loadMessages = async () => {
      try {
        const claimMessages = await Customer.fetchClaimMessages(selectedClaim.id);
        setMessages(claimMessages);
        await Customer.markClaimMessagesAsRead(selectedClaim.id);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
    // Refresh messages every 5 seconds for real-time effect
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedClaim])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !selectedClaim || !messageInput.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setSending(true);
      await Customer.addClaimReply(
        selectedClaim.id,
        user.uid,
        profile?.full_name || user.email || 'Customer',
        profile?.role || 'customer',
        messageInput.trim()
      );

      // Reload messages
      const claimMessages = await Customer.fetchClaimMessages(selectedClaim.id);
      setMessages(claimMessages);
      setMessageInput('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitNewClaim = async () => {
    if (!newClaimData.title.trim() || !newClaimData.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmittingClaim(true);
      await Customer.submitClaimWithMessage(
        user!.uid,
        profile?.full_name || user!.email || 'Customer',
        newClaimData.title,
        newClaimData.description,
        newClaimData.claimType,
        newClaimData.department,
        profile?.role || 'customer'
      );

      // Reload claims with role-based filtering
      const userClaims = await Customer.fetchCustomerClaims(
        user!.uid,
        profile?.role
      );
      setClaims(userClaims);

      // Reset form
      setNewClaimData({
        title: '',
        description: '',
        claimType: 'complaint',
        department: profile?.role === 'customer' || profile?.role === 'seller' ? 'editor' : 'admin',
      });
      setShowNewForm(false);
      toast.success('Claim submitted successfully');
    } catch (error) {
      console.error('Error submitting claim:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit claim';
      toast.error(errorMsg);
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Search claims by ID
  const handleSearchClaim = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await Customer.searchClaimById(searchQuery, profile?.role, user!.uid);
      if (result) {
        setSearchResults([result as ClaimThread]);
      } else {
        toast.error('Claim not found');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching claim:', error);
      toast.error('Failed to search claim');
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string, claimId: string) => {
    if (!editingMessageText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await Customer.editClaimMessage(claimId, messageId, editingMessageText);
      const claimMessages = await Customer.fetchClaimMessages(claimId);
      setMessages(claimMessages);
      setEditingMessageId(null);
      setEditingMessageText('');
      toast.success('Message edited');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string, claimId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      await Customer.deleteClaimMessage(claimId, messageId, user!.uid, profile?.role || 'customer');
      const claimMessages = await Customer.fetchClaimMessages(claimId);
      setMessages(claimMessages);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete message');
    }
  };

  // Forward claim to another role
  const handleForwardClaim = async (toRole: string) => {
    if (!selectedClaim) return;

    try {
      await Customer.forwardClaimMessage(
        selectedClaim.id,
        selectedClaim as Record<string, unknown> & ClaimThread,
        user!.uid,
        profile?.full_name || user!.email || 'User',
        profile?.role || 'customer',
        toRole
      );
      toast.success(`Claim forwarded to ${toRole}`);
      
      // Reload claims
      const userClaims = await Customer.fetchCustomerClaims(
        user!.uid,
        profile?.role
      );
      setClaims(userClaims);
    } catch (error) {
      console.error('Error forwarding claim:', error);
      toast.error('Failed to forward claim');
    }
  };

  // Open user profile modal
  const handleViewProfile = (userId: string, userName: string, userRole?: string) => {
    setSelectedProfileUserId(userId);
    setSelectedProfileUserName(userName);
    setSelectedProfileUserRole(userRole || '');
    setShowProfileModal(true);
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="site-container flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4 p-3 md:p-6">
        {/* Claims List */}
        <div className="hidden md:flex md:w-80 w-full border rounded-lg bg-white flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Claims
            </h2>
            <Button
              onClick={() => setShowNewForm(!showNewForm)}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {showNewForm && (
            <div className="p-4 border-b bg-blue-50 space-y-3">
              <input
                type="text"
                placeholder="Claim title..."
                value={newClaimData.title}
                onChange={(e) =>
                  setNewClaimData({ ...newClaimData, title: e.target.value })
                }
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                placeholder="Describe your issue..."
                value={newClaimData.description}
                onChange={(e) =>
                  setNewClaimData({
                    ...newClaimData,
                    description: e.target.value,
                  })
                }
                className="w-full border rounded px-2 py-1 text-sm"
                rows={3}
              />
              <select
                value={newClaimData.claimType}
                onChange={(e) =>
                  setNewClaimData({ ...newClaimData, claimType: e.target.value })
                }
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="complaint">Complaint</option>
                <option value="dispute">Dispute</option>
                <option value="feedback">Feedback</option>
                <option value="appeal">Appeal</option>
                <option value="other">Other</option>
              </select>
              <select
                value={newClaimData.department}
                onChange={(e) =>
                  setNewClaimData({
                    ...newClaimData,
                    department: e.target.value,
                  })
                }
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select recipient...</option>
                {getAllowedDirectToRoles().map((role) => (
                  <option key={role} value={role}>
                    {role === 'admin' ? 'Admin Team' : role === 'editor' ? 'Editor Team' : role === 'content_manager' ? 'Content Manager' : role}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitNewClaim}
                  disabled={submittingClaim}
                  size="sm"
                  className="flex-1"
                >
                  {submittingClaim ? 'Submitting...' : 'Submit'}
                </Button>
                <Button
                  onClick={() => setShowNewForm(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Search Claims */}
          <div className="p-3 border-b space-y-2">
            <div className="flex gap-1">
              <Input
                placeholder="Search by Claim ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm flex-1"
              />
              <Button onClick={handleSearchClaim} size="sm" variant="outline">
                Search
              </Button>
            </div>
          </div>

          {/* Claims List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (searchResults.length > 0 ? searchResults : claims).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchResults.length === 0 ? 'No claims found' : 'No claims yet. Start a new claim!'}
              </div>
            ) : (
              (searchResults.length > 0 ? searchResults : claims).map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => {
                    setSelectedClaim(claim);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className={`p-3 border-b cursor-pointer transition ${
                    selectedClaim?.id === claim.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="text-xs font-mono text-blue-600 mb-1">
                        {claim.claim_id || `CLAIM-${claim.id.substring(0, 6).toUpperCase()}`}
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-1">
                        {claim.title}
                      </h3>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(claim.status)}`}>
                      {claim.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {claim.last_message || claim.description}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {claim.department}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(claim.last_message_at || claim.updated_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 border rounded-lg bg-white flex flex-col min-h-0">
          {selectedClaim ? (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-xs font-mono text-blue-600 mb-1">
                      {selectedClaim.claim_id || `CLAIM-${selectedClaim.id.substring(0, 6).toUpperCase()}`}
                    </div>
                    <h2 className="font-semibold text-lg">{selectedClaim.title}</h2>
                  </div>
                  {/* Forward button for admins and authorized users */}
                  {(profile?.role === 'admin' || profile?.role === 'editor' || profile?.role === 'content_manager') && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Forward claim"
                        onClick={() => {
                          const toRole = prompt('Forward to role (editor, content_manager, admin):');
                          if (toRole) handleForwardClaim(toRole);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">From:</span> {selectedClaim.sender_name} ({selectedClaim.sender_role})
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">To:</span> {selectedClaim.department.charAt(0).toUpperCase() + selectedClaim.department.slice(1)} Team
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge className={getStatusColor(selectedClaim.status)}>
                    {selectedClaim.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedClaim.claim_type}
                  </Badge>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(selectedClaim.created_at)}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
                {messages.map((msg: ClaimMessage) => {
                  const isCurrentUser = msg.sender_id === user?.uid;
                  const canEdit = isCurrentUser || profile?.role === 'admin';
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="max-w-sm space-y-1">
                        {isEditing ? (
                          <div className={`px-4 py-2 rounded-lg border-2 border-blue-400 ${
                            isCurrentUser
                              ? 'bg-blue-100'
                              : 'bg-white'
                          }`}>
                            <Textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2 mt-2">
                              <Button
                                onClick={() => handleEditMessage(msg.id, selectedClaim.id)}
                                size="sm"
                                className="text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => setEditingMessageId(null)}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              isCurrentUser
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-white text-gray-900 border rounded-bl-none'
                            }`}
                          >
                            <button
                              onClick={() => handleViewProfile(msg.sender_id, msg.sender_name, msg.sender_role)}
                              className="text-xs font-semibold opacity-75 mb-1 hover:opacity-100 cursor-pointer underline"
                            >
                              {msg.sender_name} ({msg.sender_role})
                            </button>
                            {msg.deleted ? (
                              <p className="text-xs italic opacity-50">Message deleted</p>
                            ) : (
                              <>
                                <p className="text-sm break-words">{msg.message}</p>
                                {msg.edited && <p className="text-xs opacity-50 italic">Edited</p>}
                              </>
                            )}
                            <p
                              className={`text-xs mt-1 ${
                                isCurrentUser
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        )}

                        {/* Message action buttons */}
                        {!msg.deleted && !isEditing && canEdit && (
                          <div className="flex gap-1 px-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditingMessageText(msg.message);
                              }}
                              title="Edit message"
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMessage(msg.id, selectedClaim.id)}
                              title="Delete message"
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  rows={3}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  size="lg"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a claim to view messages</p>
                <p className="text-sm">or create a new claim to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          userName={selectedProfileUserName || ''}
          userRole={selectedProfileUserRole || ''}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </Layout>
  );
}
