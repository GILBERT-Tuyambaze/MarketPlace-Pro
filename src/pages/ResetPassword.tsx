import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { auth } from '@/lib/firebaseClient';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeValidity, setCodeValidity] = useState<{
    valid: boolean;
    email?: string;
  }>({ valid: false });

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  const oobCode = searchParams.get('oobCode');

  // Verify the reset code when component loads
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError('Invalid or missing reset link. Please request a new password reset.');
        setVerifying(false);
        return;
      }

      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        setCodeValidity({ valid: true, email });
        setVerifying(false);
      } catch (err) {
        const error = err as Error & { code?: string };
        let errorMessage = 'Invalid reset link';

        if (error.code === 'auth/expired-action-code') {
          errorMessage =
            'This password reset link has expired. Please request a new one.';
        } else if (error.code === 'auth/invalid-action-code') {
          errorMessage = 'This password reset link is invalid. Please request a new one.';
        }

        setError(errorMessage);
        setVerifying(false);
        toast.error(errorMessage);
      }
    };

    verifyCode();
  }, [oobCode]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.password;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    setPasswordStrength(strength);
  }, [formData.password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-yellow-500';
    if (passwordStrength <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (formData.password.length === 0) return '';
    if (passwordStrength === 0) return 'Very Weak';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    if (passwordStrength === 4) return 'Strong';
    return 'Very Strong';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Please enter a new password');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    if (!oobCode) {
      setError('Reset link is missing. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, formData.password);
      setSuccess(true);
      toast.success('Password reset successfully!');

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const error = err as Error & { code?: string };
      let errorMessage = 'Failed to reset password';

      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'This password reset link has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'This password reset link is invalid. Please request a new one.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
          <Card className="shadow-lg border-0 max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full">
                    <Lock className="h-8 w-8" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">Verifying reset link...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!codeValidity.valid) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
          <Card className="shadow-lg border-0 max-w-md w-full">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-red-100 text-red-600 p-3 rounded-full">
                  <AlertCircle className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Invalid Reset Link
                </h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
              <Link to="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  Request New Reset Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
          <Card className="shadow-lg border-0 max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 text-green-600 p-3 rounded-full animate-pulse">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Password Reset</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <p className="text-xs text-gray-500">Redirecting to login...</p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

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
                <Lock className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Set New Password</h2>
            <p className="mt-2 text-sm text-gray-600">
              {codeValidity.email && `Resetting password for ${codeValidity.email}`}
            </p>
          </div>

          {/* Reset Form Card */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Password Input */}
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </Label>
                  <div className="mt-2 relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••••••"
                      className="pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i < passwordStrength ? getPasswordStrengthColor() : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600">
                        Strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                      </p>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Must be at least 8 characters long. Use uppercase, lowercase, numbers, and symbols for a strong password.
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="mt-2 relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••••••"
                      className="pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="mt-2 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={
                    loading ||
                    !formData.password ||
                    formData.password !== formData.confirmPassword
                  }
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Reset Password
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Reset link expired?</strong> You can{' '}
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                request a new one
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
