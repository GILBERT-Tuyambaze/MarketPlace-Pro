import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, LogIn, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ensureTestProducts } from '@/lib/seedData';

const LoginPage: React.FC = () => {
  // Default test credentials
  const DEFAULT_TEST_EMAIL = 'test@example.com';
  const DEFAULT_TEST_PASSWORD = 'test123456';

  const [email, setEmail] = useState(DEFAULT_TEST_EMAIL);
  const [password, setPassword] = useState(DEFAULT_TEST_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await signIn(email, password);
      
      // Check for errors
      if (response.error || !response.user) {
        setError(response.error?.message || 'Failed to sign in');
        toast.error(response.error?.message || 'Failed to sign in');
        setLoading(false);
        return;
      }
      
      // Seed test products for the logged-in user
      if (response.user?.id) {
        try {
          await ensureTestProducts(response.user.id);
        } catch (seedError) {
          console.error('Error seeding products:', seedError);
          // Don't fail if seeding fails
        }
      }
      
      toast.success('Welcome back!');
      
      // Add a small delay to ensure auth state updates
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 300);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-gray-900">MarketPlace Pro</span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Or{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                create a new account
              </Link>
            </p>
          </div>

          {/* Login Form */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign in
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo Credentials Info */}
          <Card className="shadow-lg border-0 bg-blue-50">
            <CardContent className="p-4">
              <div className="text-sm">
                <p className="font-semibold text-gray-900 mb-2">Demo Credentials for Testing:</p>
                <div className="bg-white rounded p-3 space-y-1 text-xs font-mono">
                  <p><span className="font-bold">Email:</span> {DEFAULT_TEST_EMAIL}</p>
                  <p><span className="font-bold">Password:</span> {DEFAULT_TEST_PASSWORD}</p>
                </div>
                <p className="text-gray-600 text-xs mt-2">Sample products will be automatically added to your account on first login!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;