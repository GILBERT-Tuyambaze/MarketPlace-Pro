import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as Customer from '@/lib/customer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MessageCircle,
  Send,
  Search,
  X,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage, ChatListItem } from '@/lib/customer';

interface GlobalChatProps {
  className?: string;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ className = '' }) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
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
    const interval = setInterval(loadChatList, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [user]);

  // Load messages when user is selected
  useEffect(() => {
    if (!user || !selectedUser) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const userMessages = await Customer.fetchChatMessages(user.uid, selectedUser.user_id);
        setMessages(userMessages);

        // Mark as read
        await Customer.markChatMessagesAsRead(selectedUser.user_id, user.uid);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [user, selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !selectedUser || !messageText.trim()) return;

    try {
      setSending(true);
      await Customer.sendChatMessage(
        user.uid,
        profile?.full_name || user.email || 'User',
        selectedUser.user_id,
        selectedUser.user_name,
        messageText,
        profile?.avatar_url || undefined
      );

      setMessageText('');

      // Refresh messages
      const userMessages = await Customer.fetchChatMessages(user.uid, selectedUser.user_id);
      setMessages(userMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredChat = chatList.filter((item) =>
    item.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = chatList.filter((item) => item.unread).length;

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
          title="Global Chat"
        >
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 h-96 p-0 flex flex-col" align="end">
        {!selectedUser ? (
          // Chat List View
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
              <h3 className="font-semibold text-lg mb-3">Messages</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {filteredChat.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    {searchQuery ? 'No conversations found' : 'No messages yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredChat.map((chat) => (
                    <button
                      key={chat.user_id}
                      onClick={() => setSelectedUser(chat)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition flex items-center gap-3"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {chat.user_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {chat.user_name}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {chat.last_message}
                        </p>
                      </div>

                      {/* Status */}
                      {chat.unread && (
                        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs flex-shrink-0">
                          •
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Chat View
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{selectedUser.user_name}</h3>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setMessages([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 text-center">
                  <div>
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No messages yet. Start a conversation!</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === user.uid ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_id === user.uid
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-gray-900 rounded-bl-none border'
                        }`}
                      >
                        <p className="break-words text-sm">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender_id === user.uid
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {new Date(msg.created_at?.toDate?.() || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default GlobalChat;
