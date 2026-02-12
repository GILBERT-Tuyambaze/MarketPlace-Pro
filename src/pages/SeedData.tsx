import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/context/AuthContext';
import { SAMPLE_PRODUCTS, seedTestProducts } from '@/lib/seedData';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Plus } from 'lucide-react';

export default function SeedDataPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellerId, setSellerId] = useState('test-seller-' + Date.now());
  const [error, setError] = useState('');

  const checkProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .limit(100);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        setError(`Error: ${fetchError.message}`);
        setProducts([]);
        return;
      }

      console.log('Fetched products:', data?.length || 0);
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedProducts = async () => {
    setLoading(true);
    try {
      const testSellerId = 'test-seller-' + Date.now();
      setSellerId(testSellerId);
      
      const productsToInsert = SAMPLE_PRODUCTS.map(product => ({
        ...product,
        seller_id: testSellerId,
      }));

      const { data, error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert)
        .select();

      if (insertError) {
        setError(`Insert error: ${insertError.message}`);
        console.error('Insert error details:', insertError);
        return;
      }

      toast.success(`Seeded ${data?.length || 0} products!`);
      await checkProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllProducts = async () => {
    if (!window.confirm('Are you sure you want to delete ALL products?')) return;
    
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', ''); // Delete all

      if (deleteError) {
        setError(`Delete error: ${deleteError.message}`);
        return;
      }

      toast.success('All products deleted!');
      await checkProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProducts();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">🌱 Seed Test Data</h1>
        
        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Product Status</h2>
              <div className="space-y-2">
                <p className="text-lg">
                  <strong>Approved Products in Database:</strong> <span className="text-blue-600 text-2xl font-bold">{products.length}</span>
                </p>
                <p className="text-gray-600">Sample products available: {SAMPLE_PRODUCTS.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Seed Status */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Test Seller ID</h2>
              <div className="bg-gray-100 p-4 rounded break-all font-mono text-sm">
                {sellerId}
              </div>
              <p className="text-gray-600 text-sm mt-2">This ID is used when seeding products</p>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <h3 className="text-red-900 font-bold mb-2">Error:</h3>
                <p className="text-red-700 font-mono text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={checkProducts}
                  disabled={loading}
                  className="h-12"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Refresh
                </Button>
                <Button
                  onClick={seedProducts}
                  disabled={loading}
                  className="h-12 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Seed Products
                </Button>
                <Button
                  onClick={deleteAllProducts}
                  disabled={loading}
                  className="h-12 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Products ({products.length})</h2>
              {products.length === 0 ? (
                <p className="text-gray-600">No approved products found. Click "Seed Products" to add test data.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded p-4 hover:bg-gray-50">
                      <h3 className="font-bold">{product.title}</h3>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>Price: ${product.price}</p>
                        <p>Category: {product.category}</p>
                        <p>Stock: {product.stock}</p>
                        <p>Status: {product.status}</p>
                        <p className="font-mono text-xs break-all">ID: {product.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Instructions:</h2>
              <ol className="space-y-2 text-sm">
                <li>1. Click "Seed Products" to add 10 test products to the database</li>
                <li>2. Products will be created with status "approved" so they're immediately visible</li>
                <li>3. Go to <a href="/products" className="text-blue-600 underline">/products</a> to see the products</li>
                <li>4. Use "Refresh" to check for new products without reloading</li>
                <li>5. Use "Delete All" to clear products (be careful!)</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
