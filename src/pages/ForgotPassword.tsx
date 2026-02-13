import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { auth } from '@/lib/firebaseClient';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      toast.success('Password reset email sent!');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const error = err as Error & { code?: string };
      let errorMessage = 'Failed to send reset email';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many reset requests. Please try again later.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Back Button */}
          <Link
            to="/login"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Link>

          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full">
                <Mail className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Reset Your Password</h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Reset Form Card */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              {!success ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2"
                      disabled={loading}
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      We'll send a password reset link to this email address.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Reset Link...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Reset Link
                      </div>
                    )}
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    Remember your password?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Back to Login
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-green-100 text-green-600 p-3 rounded-full animate-pulse">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
                    <p className="text-sm text-gray-600">
                      We've sent a password reset link to <strong>{email}</strong>
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    <p>
                      💡 <strong>Tip:</strong> Check your spam folder if you don't see the email in your inbox.
                    </p>
                  </div>

                  <div className="pt-4 text-sm text-gray-600">
                    Redirecting to login in a few seconds...
                  </div>

                  <Button
                    onClick={() => navigate('/login')}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Didn't receive the email?</strong> Make sure to check your spam folder, or{' '}
              <button
                onClick={() => {
                  if (email) {
                    setError('');
                    setSuccess(false);
                  }
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                try again with a different email
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
