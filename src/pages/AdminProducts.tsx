import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout/Layout';
import { fetchProducts, updateProductStatus } from '@/lib/firebaseProducts';
import type { FirebaseProduct } from '@/lib/firebaseProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as SellerLib from '@/lib/seller';
import * as Customer from '@/lib/customer';

const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [sellerStats, setSellerStats] = useState<Record<string, { soldCount: number; revenue: number; inCart: number; info?: any }>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [sortBy, setSortBy] = useState<'newest'|'oldest'|'price-high'|'price-low'>('newest');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProducts(undefined, undefined, 'created_at', 500);
      setProducts(res);

      // Compute per-seller stats for unique sellers in this result set
      const sellerIds = Array.from(new Set(res.map(r => r.seller_id).filter(Boolean)));
      const statsMap: Record<string, any> = {};
      await Promise.all(sellerIds.map(async (sid) => {
        try {
          const s = await SellerLib.getSellerStatsWithCache(sid, 300);
          const info = await Customer.fetchSellerInfo(sid).catch(() => null);
          statsMap[sid] = { soldCount: s.soldCount || 0, revenue: s.revenue || 0, inCart: s.inCart || 0, info, cached: !!s.cached };
        } catch (e) {
          console.error('Error computing stats for seller', sid, e);
          statsMap[sid] = { soldCount: 0, revenue: 0, inCart: 0 };
        }
      }));
      setSellerStats(statsMap);
    } catch (error) {
      console.error('Error loading products for admin:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleApprove = async (id: string) => {
    try {
      await updateProductStatus(id, 'approved');
      toast.success('Product approved');
      loadProducts();
    } catch (error) {
      toast.error('Failed to approve product');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateProductStatus(id, 'rejected');
      toast.success('Product rejected');
      loadProducts();
    } catch (error) {
      toast.error('Failed to reject product');
    }
  };

  const filtered = products
    .filter(p => {
      if (statusFilter === 'all') return true;
      return (p.status || 'approved') === statusFilter;
    })
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.name || '').toLowerCase().includes(q) || (p.seller_name || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0);
      if (sortBy === 'oldest') return (a.created_at?.toMillis?.() || 0) - (b.created_at?.toMillis?.() || 0);
      if (sortBy === 'price-high') return b.price - a.price;
      return a.price - b.price;
    });

  return (
    <Layout>
      <div className="site-container py-8">
        <h1 className="text-2xl font-bold mb-4">Admin — Product Management</h1>

        <div className="flex gap-3 mb-6">
          <Input placeholder="Search by name or seller" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="price-high">Price: High → Low</SelectItem>
              <SelectItem value="price-low">Price: Low → High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <Card key={p.id}>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <img src={p.image} alt={p.name} className="w-24 h-24 object-cover rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/120?text=No+Image'; }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{p.name}</h3>
                        <Badge className="bg-gray-100">{p.status || 'approved'}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Seller: {sellerStats[p.seller_id]?.info?.name || p.seller_name || '—'}</p>
                      <p className="text-sm text-gray-600">Price: {p.price}</p>
                      <div className="text-sm text-gray-600 mt-2">
                        <span className="mr-3">Sold: <strong>{sellerStats[p.seller_id]?.soldCount ?? 0}</strong></span>
                        <span className="mr-3">In Cart: <strong>{sellerStats[p.seller_id]?.inCart ?? 0}</strong></span>
                        <span>Revenue: <strong>{(sellerStats[p.seller_id]?.revenue || 0).toFixed(2)}</strong></span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {p.status !== 'approved' && (
                          <Button size="sm" onClick={() => handleApprove(p.id)}>Approve</Button>
                        )}
                        {p.status !== 'rejected' && (
                          <Button variant="destructive" size="sm" onClick={() => handleReject(p.id)}>Reject</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminProductsPage;
