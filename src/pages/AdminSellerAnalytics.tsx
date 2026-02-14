import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import * as admin from '@/lib/admin';
import * as sellerLib from '@/lib/seller';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

interface SellerProfile {
  id: string;
  role?: string;
  full_name?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface SellerMetrics {
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  soldCount: number;
  revenue: number;
  inCart: number;
  productCount: number;
}

const AdminSellerAnalytics: React.FC = () => {
  const [sellers, setSellers] = useState<SellerMetrics[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<SellerMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'sold' | 'inCart' | 'name'>('revenue');

  useEffect(() => {
    const loadSellers = async () => {
      try {
        setLoading(true);
        
        // Fetch all profiles to get sellers
        const profilesSnap = await getDocs(collection(db, 'profiles'));
        const sellerProfiles: SellerProfile[] = profilesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as SellerProfile))
          .filter((p: SellerProfile) => p.role === 'seller');

        // Compute stats for each seller
        const metricsPromises = sellerProfiles.map(async (profile: SellerProfile) => {
          try {
            const [soldRevenue, inCart, products] = await Promise.all([
              sellerLib.getSellerSoldAndRevenue(profile.id),
              sellerLib.getSellerInCartCount(profile.id),
              sellerLib.getSellerProducts(profile.id).catch(() => ([] as Record<string, unknown>[])),
            ]);

            return {
              sellerId: profile.id,
              sellerName: (profile.full_name || profile.name || 'Unknown') as string,
              sellerEmail: (profile.email || '') as string,
              soldCount: soldRevenue.soldCount || 0,
              revenue: soldRevenue.revenue || 0,
              inCart: inCart || 0,
              productCount: Array.isArray(products) ? products.length : 0,
            } as SellerMetrics;
          } catch (err) {
            console.error('Error computing metrics for seller', profile.id, err);
            return {
              sellerId: profile.id,
              sellerName: (profile.full_name || profile.name || 'Unknown') as string,
              sellerEmail: (profile.email || '') as string,
              soldCount: 0,
              revenue: 0,
              inCart: 0,
              productCount: 0,
            } as SellerMetrics;
          }
        });

        const metricsArray = await Promise.all(metricsPromises);
        setSellers(metricsArray);
        setFilteredSellers(metricsArray);
      } catch (err) {
        console.error('Error loading sellers:', err);
        toast.error('Failed to load seller analytics');
      } finally {
        setLoading(false);
      }
    };

    loadSellers();
  }, []);

  useEffect(() => {
    const filtered = sellers.filter(s =>
      s.sellerName.toLowerCase().includes(search.toLowerCase()) ||
      s.sellerEmail.toLowerCase().includes(search.toLowerCase())
    );

    // Sort by the selected metric
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'sold') return b.soldCount - a.soldCount;
      if (sortBy === 'inCart') return b.inCart - a.inCart;
      return a.sellerName.localeCompare(b.sellerName);
    });

    setFilteredSellers(sorted);
  }, [search, sortBy, sellers]);

  const chartData = sellers.slice(0, 10).map(s => ({
    name: s.sellerName.split(' ')[0],
    revenue: s.revenue,
    sold: s.soldCount,
  }));

  const totalRevenue = sellers.reduce((sum, s) => sum + s.revenue, 0);
  const totalSold = sellers.reduce((sum, s) => sum + s.soldCount, 0);
  const totalInCart = sellers.reduce((sum, s) => sum + s.inCart, 0);

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Analytics Overview</h1>
            <p className="text-sm text-gray-600">Monitor all sellers' performance and metrics</p>
          </div>
          <Link to="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : sellers.length}</div>
              <div className="text-sm text-gray-500">Active seller accounts</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : `$${totalRevenue.toFixed(2)}`}</div>
              <div className="text-sm text-gray-500">Gross revenue across all sellers</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : totalSold}</div>
              <div className="text-sm text-gray-500">Total items sold</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In Cart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : totalInCart}</div>
              <div className="text-sm text-gray-500">Items waiting to be purchased</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Sellers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Sellers by Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sold" stroke="#10b981" strokeWidth={2} name="Items Sold" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sellers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Sellers</CardTitle>
              <div className="flex gap-3">
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={sortBy} onValueChange={(v: string) => setSortBy(v as 'revenue' | 'sold' | 'inCart' | 'name')}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue (High to Low)</SelectItem>
                    <SelectItem value="sold">Items Sold (High to Low)</SelectItem>
                    <SelectItem value="inCart">In Cart (High to Low)</SelectItem>
                    <SelectItem value="name">Name (A to Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading sellers...</div>
            ) : filteredSellers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No sellers found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b-2">
                    <tr>
                      <th className="text-left py-3 px-2">Seller Name</th>
                      <th className="text-left py-3 px-2">Email</th>
                      <th className="text-right py-3 px-2">Revenue</th>
                      <th className="text-right py-3 px-2">Items Sold</th>
                      <th className="text-right py-3 px-2">In Cart</th>
                      <th className="text-right py-3 px-2">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellers.map((seller) => (
                      <tr key={seller.sellerId} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 px-2 font-medium">{seller.sellerName}</td>
                        <td className="py-3 px-2 text-gray-600 text-xs">{seller.sellerEmail}</td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant="outline" className="bg-blue-50">${seller.revenue.toFixed(2)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant="outline" className="bg-green-50">{seller.soldCount}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant="outline" className="bg-yellow-50">{seller.inCart}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-gray-700">{seller.productCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminSellerAnalytics;
