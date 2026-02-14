import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import * as sellerLib from '@/lib/seller';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';

const SellerAnalytics: React.FC = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ soldCount: number; revenue: number; inCart: number; cached?: boolean }>({ soldCount: 0, revenue: 0, inCart: 0 });
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [chartData, setChartData] = useState([
    { day: '1', revenue: 120, sold: 8 },
    { day: '5', revenue: 250, sold: 14 },
    { day: '10', revenue: 380, sold: 22 },
    { day: '15', revenue: 450, sold: 28 },
    { day: '20', revenue: 520, sold: 32 },
    { day: '25', revenue: 680, sold: 42 },
    { day: '30', revenue: 850, sold: 54 },
  ]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const s = await sellerLib.getSellerStatsWithCache(user.uid, 300);
        setStats({ soldCount: s.soldCount || 0, revenue: s.revenue || 0, inCart: s.inCart || 0, cached: !!s.cached });
      } catch (err) {
        console.error('Failed to load seller analytics', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const pieData = [
    { name: 'In Cart', value: stats.inCart, fill: '#3b82f6' },
    { name: 'Sold', value: stats.soldCount, fill: '#10b981' },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Analytics</h1>
            <p className="text-sm text-gray-600">Overview of your sales and cart interest</p>
          </div>
          <div className="flex gap-2">
            <Link to="/add-product"><Button>Add Product</Button></Link>
            <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
            <Link to="/seller/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          </div>
        </div>

        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <Label className="block mb-3 font-semibold">Date Range</Label>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="from" className="text-sm">From</Label>
              <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label htmlFor="to" className="text-sm">To</Label>
              <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={handleRefresh} variant="outline">Apply</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Items Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : stats.soldCount}</div>
              <div className="text-sm text-gray-500">Total quantity sold (excluding cancelled)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : `$${(stats.revenue || 0).toFixed(2)}`}</div>
              <div className="text-sm text-gray-500">Estimated gross revenue from sold items</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In Cart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{loading ? '—' : stats.inCart}</div>
              <div className="text-sm text-gray-500">Number of your product units currently in carts</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="sold" stroke="#10b981" strokeWidth={2} name="Items Sold" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="mt-6 text-sm text-gray-500">{stats.cached ? 'Stats served from cache' : 'Live stats'}</div>
      </div>
    </Layout>
  );
};

export default SellerAnalytics;
