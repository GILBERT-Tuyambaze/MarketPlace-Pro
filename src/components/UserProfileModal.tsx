import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Calendar, ShieldCheck, Star } from 'lucide-react';
import * as Customer from '@/lib/customer';

interface UserProfileModalProps {
  userId: string;
  userName: string;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (userId: string, userName: string) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  userName,
  userRole,
  isOpen,
  onClose,
  onStartChat,
}) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const profile = await Customer.getUserProfileFull(userId);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [isOpen, userId]);

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
      case 'customer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    try {
      const date = typeof dateString.toDate === 'function' ? dateString.toDate() : new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">Loading profile...</p>
          </div>
        ) : userProfile ? (
          <div className="space-y-6">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-3">
                {userName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{userName}</h2>
              <Badge className={`text-xs py-1 px-2 mt-2 ${getRoleColor(userProfile.role)}`}>
                {userProfile.role}
              </Badge>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900 truncate">{userProfile.email || 'N/A'}</p>
                </div>
              </div>

              {userProfile.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{userProfile.phone}</p>
                  </div>
                </div>
              )}

              {userProfile.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-gray-900">{userProfile.address}</p>
                  </div>
                </div>
              )}

              {userProfile.joined_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="text-sm text-gray-900">{formatDate(userProfile.joined_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Role-Specific Information */}
            {userProfile.role === 'seller' && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Seller Status</p>
                    <p className="text-sm text-gray-900 capitalize">
                      {userProfile.seller_status || 'N/A'}
                    </p>
                  </div>
                </div>

                {userProfile.rating && (
                  <div className="flex items-center gap-3">
                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Rating</p>
                      <p className="text-sm text-gray-900">
                        {userProfile.rating.toFixed(1)} / 5.0
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              {onStartChat && (
                <Button
                  onClick={() => {
                    onStartChat(userId, userName);
                    onClose();
                  }}
                  className="flex-1"
                >
                  Message
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">Failed to load profile</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
