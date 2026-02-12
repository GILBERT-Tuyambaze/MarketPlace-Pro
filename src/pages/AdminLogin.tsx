import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Shield, Package } from 'lucide-react';
import { toast } from 'sonner';

const AdminLoginPage: React.FC = () => {
  // Default test credentials for admin
  const DEFAULT_TEST_EMAIL = 'admin@example.com';
  const DEFAULT_TEST_PASSWORD = 'admin123456';

  const [email, setEmail] = useState(DEFAULT_TEST_EMAIL);
  const [password, setPassword] = useState(DEFAULT_TEST_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await signIn(email, password);
      
      // Navigation will be handled by the auth context and protected routes
      toast.success('Admin access granted');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to sign in');
      toast.error('Access denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-2 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-gray-900">Admin Access</span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">Secure Admin Portal</h2>
            <p className="mt-2 text-sm text-gray-600">
              Authorized personnel only
            </p>
          </div>

          {/* Admin Login Form */}
          <Card className="shadow-lg border-0 border-red-200">
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    placeholder="Enter admin email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Access Admin Portal
                    </div>
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">Secure Access</p>
                      <p className="text-xs text-red-700">
                        All admin activities are logged and monitored
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Credentials Info */}
          <Card className="shadow-lg border-0 bg-red-50">
            <CardContent className="p-4">
              <div className="text-sm">
                <p className="font-semibold text-gray-900 mb-2">Demo Admin Credentials for Testing:</p>
                <div className="bg-white rounded p-3 space-y-1 text-xs font-mono">
                  <p><span className="font-bold">Email:</span> {DEFAULT_TEST_EMAIL}</p>
                  <p><span className="font-bold">Password:</span> {DEFAULT_TEST_PASSWORD}</p>
                </div>
                <p className="text-gray-600 text-xs mt-2">Sample products will be automatically added on first login!</p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLoginPage;