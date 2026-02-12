import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '@/lib/firebaseClient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { seedProducts, getProductCount } from '@/lib/firebaseProductsSeeder';
import { toast } from 'sonner';
import { RefreshCw, Plus, CheckCircle } from 'lucide-react';

export default function SeedDataPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'products'), where('status', '==', 'approved'));
      const snapshot = await getDocs(q);
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log('Fetched products:', productsList.length);
      setProducts(productsList);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    setLoading(true);
    try {
      const result = await seedProducts();
      if (result.success) {
        toast.success(`Successfully seeded ${result.count} products!`);
        // Refresh the products list
        setTimeout(() => {
          checkProducts();
        }, 1000);
      } else {
        toast.error('Failed to seed products');
      }
    } catch (err: any) {
      console.error('Error seeding products:', err);
      toast.error(err.message);
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
        <h1 className="text-4xl font-bold mb-8">🌱 Firebase Product Seeder</h1>
        
        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Product Status</h2>
              <div className="space-y-2">
                <p className="text-lg">
                  <strong>Approved Products in Database:</strong> <span className="text-blue-600 text-2xl font-bold">{products.length}</span>
                </p>
                <p className="text-gray-600">Total available to seed: {getProductCount()} products</p>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={checkProducts}
                  disabled={loading}
                  className="h-12"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Refresh Count
                </Button>
                <Button
                  onClick={handleSeedProducts}
                  disabled={loading}
                  className="h-12 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {loading ? 'Seeding...' : 'Seed All Products'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Products ({products.length})</h2>
              {products.length === 0 ? (
                <p className="text-gray-600">No approved products found. Click "Seed All Products" to add test data.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="border rounded p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold">{product.title || product.name}</h3>
                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            <p>Price: ${product.price}</p>
                            <p>Category: {product.category}</p>
                            <p>Stock: {product.stock}</p>
                            <p>Seller: {product.seller_name}</p>
                            <p>Rating: ⭐ {product.rating} ({product.reviews_count} reviews)</p>
                          </div>
                        </div>
                        <div className="ml-2 pt-1">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
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
              <h2 className="text-xl font-bold mb-4">📋 Instructions:</h2>
              <ol className="space-y-2 text-sm">
                <li>✅ Click "Seed All Products" to add 140+ test products to Firebase</li>
                <li>✅ Products cover: Electronics, Fashion, Home & Garden, Sports, Beauty, Books</li>
                <li>✅ All products will be created with status "approved"</li>
                <li>✅ Go to <a href="/products" className="text-blue-600 underline">/products</a> to browse all products</li>
                <li>✅ Use "Refresh Count" to check product count</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

