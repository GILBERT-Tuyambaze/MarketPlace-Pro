import React, { useState } from 'react';
import { Lock, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const MarketplaceLocked: React.FC = () => {
  const { platformSettings, profile } = useAuth();
  const [showAdminAccess, setShowAdminAccess] = useState(false);
  const [secretCode, setSecretCode] = useState('');

  // Admin secret code - in production, this should be from env var
  const ADMIN_SECRET = import.meta.env.VITE_ADMIN_UNLOCK_SECRET || 'admin-unlock-2024';

  const handleAdminAccess = () => {
    if (secretCode === ADMIN_SECRET) {
      toast.success('Access granted');
      // Use window.location for navigation outside router context
      window.location.href = '/admin/dashboard';
    } else {
      toast.error('Invalid access code');
      setSecretCode('');
    }
  };

  const maintenanceMessage = platformSettings?.maintenance_message && platformSettings.maintenance_message.trim()
    ? platformSettings.maintenance_message
    : 'The marketplace is currently locked for maintenance.';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDuration: '4s'}}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDuration: '5s', animationDelay: '1s'}}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDuration: '6s', animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDuration: '7s', animationDelay: '3s'}}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 max-w-2xl w-full">
        <div className="text-center mb-12">
          {/* Animated Lock Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-full blur-3xl opacity-75 animate-pulse" style={{animationDuration: '2s'}}></div>
              <div className="relative bg-slate-800 p-8 rounded-full border-4 border-red-500" style={{animation: 'bounce 2s ease-in-out infinite'}}>
                <Lock className="h-20 w-20 text-red-500 animate-pulse" style={{animationDuration: '3s'}} />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 mb-4 animate-pulse" style={{animationDuration: '2s'}}>
            Marketplace Locked
          </h1>
          
          {/* Divider */}
          <div className="h-1 w-24 bg-gradient-to-r from-red-500 to-orange-500 mx-auto mb-8 animate-pulse" style={{animationDuration: '2s'}}></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Message Card */}
          <Card className="border-2 border-red-500 bg-slate-800/80 backdrop-blur-sm shadow-2xl col-span-1 md:col-span-2" style={{animation: 'slideUp 1s ease-out'}}>
            <CardContent className="pt-8">
              <div className="flex gap-4">
                <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0 mt-1 animate-pulse" style={{animationDuration: '2s'}} />
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">We're Under Maintenance</h2>
                  <p className="text-xl text-gray-300 leading-relaxed border-l-4 border-orange-500 pl-4">
                    {maintenanceMessage}
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 mt-8">
                <p className="text-base text-amber-200">
                  ⏱️ Thank you for your patience. We're working hard to improve your experience. Expected to be back online shortly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Access Section - Only show for logged-in admins */}
          {profile?.role === 'admin' && (
            <Card className="border-2 border-green-500 bg-slate-800/80 backdrop-blur-sm shadow-2xl">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center">
                  <KeyRound className="h-5 w-5 mr-2" />
                  Admin Dashboard Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showAdminAccess ? (
                  <Button
                    onClick={() => setShowAdminAccess(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg"
                  >
                    <KeyRound className="h-5 w-5 mr-2" />
                    Unlock Dashboard
                  </Button>
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div>
                      <Label htmlFor="secret-code" className="text-green-300 font-semibold">
                        Enter Secret Code
                      </Label>
                      <Input
                        id="secret-code"
                        type="password"
                        placeholder="••••••••••"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                        className="mt-2 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleAdminAccess}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2"
                    >
                      Unlock & Access Dashboard
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAdminAccess(false);
                        setSecretCode('');
                      }}
                      variant="outline"
                      className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(40px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};

export default MarketplaceLocked;
