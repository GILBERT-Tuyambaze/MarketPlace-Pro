import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const testSupabaseConnection = async () => {
    setTesting(true);
    const results: any = {};

    try {
      // Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      results.env_url = {
        status: supabaseUrl ? 'configured' : 'missing',
        value: supabaseUrl || 'NOT SET',
        message: supabaseUrl ? '✅ Supabase URL is set' : '❌ Supabase URL is NOT set'
      };

      results.env_key = {
        status: supabaseKey ? 'configured' : 'missing',
        value: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET',
        message: supabaseKey ? '✅ Supabase Key is set' : '❌ Supabase Key is NOT set'
      };

      // Try to import Supabase
      try {
        const { supabase } = await import('@/context/AuthContext');
        results.supabase_import = {
          status: 'success',
          message: '✅ Supabase client imported successfully'
        };

        // Try a simple query
        try {
          const { data, error } = await supabase
            .from('products')
            .select('count()', { count: 'exact' })
            .limit(1);

          if (error) {
            results.supabase_query = {
              status: 'error',
              message: `❌ Supabase query failed: ${error.message}`,
              details: error
            };
          } else {
            results.supabase_query = {
              status: 'success',
              message: '✅ Supabase query successful!',
              details: `Can read from products table`
            };
          }
        } catch (queryError: any) {
          results.supabase_query = {
            status: 'error',
            message: `❌ Query error: ${queryError.message}`,
            details: queryError
          };
        }
      } catch (importError: any) {
        results.supabase_import = {
          status: 'error',
          message: `❌ Failed to import Supabase: ${importError.message}`
        };
      }

      // Test network connectivity to Supabase
      if (supabaseUrl) {
        try {
          const response = await fetch(supabaseUrl, { 
            method: 'OPTIONS',
            headers: { 
              'Content-Type': 'application/json'
            }
          });
          results.network = {
            status: 'success',
            message: '✅ Network connection to Supabase successful',
            statusCode: response.status
          };
        } catch (networkError: any) {
          results.network = {
            status: 'error',
            message: `❌ Network error: ${networkError.message}`,
            details: networkError.toString()
          };
        }
      }

    } catch (error: any) {
      results.general_error = {
        status: 'error',
        message: `Diagnostic error: ${error.message}`
      };
    }

    setDiagnostics(results);
    setTesting(false);
  };

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'success':
      case 'configured':
        return <CheckCircle className="text-green-600 h-5 w-5" />;
      case 'error':
      case 'missing':
        return <AlertCircle className="text-red-600 h-5 w-5" />;
      default:
        return <AlertTriangle className="text-yellow-600 h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'success':
      case 'configured':
        return 'bg-green-50 border-green-200';
      case 'error':
      case 'missing':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">🔧 Supabase Diagnostics</h1>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-2">Issue Detected</h2>
            <p className="text-gray-700 mb-4">
              Your app cannot connect to Supabase. This page will help diagnose the issue.
            </p>
            <Button 
              onClick={testSupabaseConnection} 
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {testing ? 'Testing...' : 'Run Diagnostics'}
            </Button>
          </CardContent>
        </Card>

        {/* Diagnostics Results */}
        <div className="space-y-4">
          {Object.entries(diagnostics).map(([key, value]: [string, any]) => (
            <Card key={key} className={`border-2 ${getStatusColor(value.status)}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(value.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{key.replace(/_/g, ' ').toUpperCase()}</h3>
                    <p className="text-gray-700 mb-2">{value.message}</p>
                    {value.value && (
                      <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all mb-2">
                        {value.value}
                      </p>
                    )}
                    {value.details && typeof value.details === 'string' && (
                      <p className="text-sm text-gray-600 font-mono">{value.details}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Solutions */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">🛠️ How to Fix</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">1. Check Environment Variables</h3>
                <p className="text-gray-600 mb-2">Create or update your `.env.local` file with:</p>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
                </pre>
                <p className="text-sm text-gray-600 mt-2">
                  Replace with your actual Supabase project URL and anonymous key from your Supabase dashboard.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">2. Get Your Supabase Credentials</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                  <li>Go to <a href="https://app.supabase.com" className="text-blue-600 underline">app.supabase.com</a></li>
                  <li>Sign in to your account</li>
                  <li>Click on your project</li>
                  <li>Go to Settings → API</li>
                  <li>Copy the "Project URL" and "anon public" key</li>
                  <li>Paste them into `.env.local`</li>
                </ol>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">3. Restart Development Server</h3>
                <p className="text-gray-600 text-sm">
                  After updating `.env.local`, you must restart the development server:
                </p>
                <pre className="bg-gray-100 p-4 rounded text-sm mt-2">
{`# Stop the server (Ctrl+C)
# Then restart it:
pnpm run dev`}
                </pre>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">4. Verify Network Connection</h3>
                <p className="text-gray-600 text-sm">
                  Make sure your Supabase URL is accessible. Check browser console (F12) for exact error messages.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card className="mt-8 bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">⚠️ Common Issues</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li>
                <strong>❌ net::ERR_NAME_NOT_RESOLVED:</strong> Supabase URL is incorrect or unreachable
                <br />→ Verify the URL in `.env.local` matches your Supabase project
              </li>
              <li>
                <strong>❌ Failed to fetch:</strong> Environment variables not loaded
                <br />→ Restart the dev server after updating `.env.local`
              </li>
              <li>
                <strong>❌ 401 Unauthorized:</strong> Invalid anon key
                <br />→ Copy the correct API key from Supabase dashboard
              </li>
              <li>
                <strong>❌ CORS Error:</strong> Supabase CORS settings
                <br />→ Check your Supabase project CORS settings
              </li>
              <li>
                <strong>❌ Products table not found:</strong> Database not set up
                <br />→ Create the products table in Supabase with required columns
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Debug Tips */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">💡 Debug Tips</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open browser DevTools: <code className="bg-gray-100 px-2 py-1 rounded">F12</code></li>
              <li>Go to Console tab to see detailed error messages</li>
              <li>Go to Network tab to see failed requests to Supabase</li>
              <li>Look for requests to <code className="bg-gray-100 px-2 py-1 rounded">supabase.co</code></li>
              <li>Check the response to see what error Supabase is returning</li>
              <li>Click "Run Diagnostics" above to test connection</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
