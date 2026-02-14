import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Customer from '@/lib/customer';
import { Send, Plus, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ClaimThread {
  id: string;
  title: string;
  description: string;
  sender_id: string;
  sender_name: string;
  department: string;
  claim_type: string;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_message?: string;
  last_message_at?: Timestamp;
  unread_count?: number;
}

interface ClaimMessage {
  id: string;
  claim_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all claims
  useEffect(() => {
    const loadClaims = async () => {
      try {
        setLoading(true);
        const userClaims = await Customer.fetchCustomerClaims(
          user!.uid,
          profile?.role,
          profile?.department
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
  }, [user, profile?.role, profile?.department]);

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
        newClaimData.department
      );

      // Reload claims with role-based filtering
      const userClaims = await Customer.fetchCustomerClaims(
        user!.uid,
        profile?.role,
        profile?.department
      );
      setClaims(userClaims);

      // Reset form
      setNewClaimData({
        title: '',
        description: '',
        claimType: 'complaint',
        department: 'admin',
      });
      setShowNewForm(false);
      toast.success('Claim submitted successfully');
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim');
    } finally {
      setSubmittingClaim(false);
    }
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
      <div className="flex h-[calc(100vh-200px)] gap-4 p-6">
        {/* Claims List */}
        <div className="w-80 border rounded-lg bg-white flex flex-col">
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
                <option value="admin">Admin Team</option>
                <option value="editor">Editor Team</option>
                <option value="content_manager">Content Manager</option>
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

          {/* Claims List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : claims.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No claims yet. Start a new claim!
              </div>
            ) : (
              claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-3 border-b cursor-pointer transition ${
                    selectedClaim?.id === claim.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {claim.title}
                    </h3>
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
        <div className="flex-1 border rounded-lg bg-white flex flex-col">
          {selectedClaim ? (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="font-semibold text-lg mb-2">{selectedClaim.title}</h2>
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">From:</span> {selectedClaim.sender_name} (Customer)
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => {
                  const isCurrentUser = msg.sender_id === user.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-white text-gray-900 border rounded-bl-none'
                        }`}
                      >
                        <p className="text-xs font-semibold opacity-75 mb-1">
                          {msg.sender_name} ({msg.sender_role})
                        </p>
                        <p className="text-sm break-words">{msg.message}</p>
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
    </Layout>
  );
}
