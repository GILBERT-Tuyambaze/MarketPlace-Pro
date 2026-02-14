import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import * as Customer from '@/lib/customer';
import { Send, Search, Plus, MessageSquare, Phone, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
}

interface ChatListItem {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  last_message: string;
  last_message_time: Timestamp;
  unread: boolean;
  avatar?: string;
}

const ChatPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat list
  useEffect(() => {
    if (!user) return;

    const loadChatList = async () => {
      try {
        const list = await Customer.fetchUserChatList(user.uid);
        setChatList(list);
      } catch (error) {
        console.error('Error loading chat list:', error);
      }
    };

    loadChatList();
    const interval = setInterval(loadChatList, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Load messages when user is selected
  useEffect(() => {
    if (!user || !selectedUser) return;

    let isMounted = true;
    let isFirstLoad = true;

    const loadMessages = async () => {
      try {
        const userMessages = await Customer.fetchChatMessages(user.uid, selectedUser.user_id);
        if (isMounted) {
          setMessages(userMessages);
          await Customer.markChatMessagesAsRead(selectedUser.user_id, user.uid);
          
          // Hide loading state only on first load
          if (isFirstLoad && isMounted) {
            setLoading(false);
            isFirstLoad = false;
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        if (isMounted && isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    // Show loading on initial message load
    setLoading(true);
    loadMessages();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users (non-admin users can't see admins)
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    try {
      const results = await Customer.searchUsers(query, profile?.role === 'admin');
      setAvailableUsers(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    }
  }, [profile?.role]);

  // Handle user search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.trim()) {
        searchUsers(userSearchQuery);
      } else {
        setAvailableUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  const handleSendMessage = async () => {
    if (!user || !selectedUser || !messageInput.trim()) return;

    try {
      setSending(true);
      await Customer.sendChatMessage(
        user.uid,
        profile?.full_name || user.email || 'User',
        selectedUser.user_id,
        selectedUser.user_name,
        messageInput,
        profile?.avatar_url
      );

      setMessageInput('');
      const userMessages = await Customer.fetchChatMessages(user.uid, selectedUser.user_id);
      setMessages(userMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartChat = async (chatUser: ChatUser) => {
    // Add user to chat list and select them
    const newChatUser: ChatListItem = {
      user_id: chatUser.id,
      user_name: chatUser.name,
      user_email: chatUser.email,
      user_role: chatUser.role,
      last_message: 'No messages yet',
      last_message_time: Timestamp.now(),
      unread: false,
      avatar: chatUser.avatar,
    };

    setSelectedUser(newChatUser);
    setShowUserSearch(false);
    setUserSearchQuery('');

    // Send initial message or just open chat
    if (!chatList.find((c) => c.user_id === chatUser.id)) {
      setChatList((prev) => [newChatUser, ...prev]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChatList = chatList.filter((item) =>
    item.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'seller':
        return 'bg-green-100 text-green-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'content_manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Please log in to access chat</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter={true}>
      <div className="h-[calc(100vh-80px)] flex bg-white">
        {/* Left Sidebar - Chat List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowUserSearch(true)}
                title="Start new chat"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full border-gray-300"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <MessageSquare className="h-12 w-12 mb-2 text-gray-400" />
                <p className="text-sm">
                  {searchQuery ? 'No conversations found' : 'No messages yet. Start a new chat!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredChatList.map((chat) => (
                  <button
                    key={chat.user_id}
                    onClick={() => setSelectedUser(chat)}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition flex items-center gap-3 ${
                      selectedUser?.user_id === chat.user_id ? 'bg-gray-100' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {chat.user_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm">{chat.user_name}</p>
                        <p className="text-xs text-gray-500">{formatTime(chat.last_message_time)}</p>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-1">{chat.last_message}</p>
                      <div className="mt-1 flex gap-1">
                        <Badge variant="outline" className={`text-xs py-0 px-2 h-5 ${getRoleColor(chat.user_role)}`}>
                          {chat.user_role}
                        </Badge>
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {chat.unread && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Messages or Empty State */}
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-6">Select a conversation to start chatting</p>
            <Button onClick={() => setShowUserSearch(true)}>Start New Chat</Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedUser.user_name}</h2>
                <p className="text-xs text-gray-500">{selectedUser.user_email}</p>
                <Badge variant="outline" className={`text-xs py-0 px-2 h-5 mt-1 ${getRoleColor(selectedUser.user_role)}`}>
                  {selectedUser.user_role}
                </Badge>
              </div>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-2 text-gray-400" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg break-words ${
                        msg.sender_id === user.uid
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      {msg.sender_id !== user.uid && (
                        <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_id === user.uid ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4 flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 resize-none rounded-lg border-gray-300"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageInput.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* User Search Modal/Overlay */}
        {showUserSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUserSearch(false)}>
            <div className="bg-white rounded-lg shadow-lg w-96 max-h-96 flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Start new chat</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or role..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm">
                      {userSearchQuery ? 'No users found' : 'Start typing to search'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {availableUsers.map((searchUser) => (
                      <button
                        key={searchUser.id}
                        onClick={() => handleStartChat(searchUser)}
                        className="w-full p-3 text-left hover:bg-gray-50 transition flex items-center gap-3"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {searchUser.name.charAt(0).toUpperCase()}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{searchUser.name}</p>
                          <p className="text-xs text-gray-600 truncate">{searchUser.email}</p>
                          <Badge variant="outline" className={`text-xs py-0 px-2 h-5 mt-1 ${getRoleColor(searchUser.role)}`}>
                            {searchUser.role}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ChatPage;
