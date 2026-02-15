import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/Layout/Layout';
import { Search, Filter, Grid, List, Star, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { fetchProducts, getProductCategories } from '@/lib/firebaseProducts';
import type { FirebaseProduct } from '@/lib/firebaseProducts';

const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [priceRange, setPriceRange] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const { addToCart, isInCart, getCartItemQuantity } = useCart();

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await getProductCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products from Firebase
      let filtered = await fetchProducts(
        searchQuery || undefined,
        category || undefined,
        'created_at',
        200
      );

      // Apply price range filter
      if (priceRange !== 'all') {
        const [min, max] = priceRange.split('-').map(Number);
        filtered = filtered.filter(p => {
          if (max) {
            return p.price >= min && p.price <= max;
          } else {
            return p.price >= min;
          }
        });
      }

      // Apply sorting
      const sortField = sortBy.includes('price') ? 'price' : 'created_at';
      const sortDir = sortBy.includes('desc') ? 'desc' : 'asc';
      filtered.sort((a, b) => {
        let aVal = (a as any)[sortField];
        let bVal = (b as any)[sortField];
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      console.log('Firebase products loaded:', filtered.length, 'items');
      setProducts(filtered);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, priceRange, sortBy]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]); 


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleAddToCart = async (productId: string) => {
    try {
      addToCart(productId, 1);
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    }
  };

  const handleProductClick = (productId: string, e?: React.MouseEvent) => {
    // Don't navigate if clicking the add to cart button
    if (e?.target instanceof HTMLElement && (
      e.target.closest('button') || 
      e.target.closest('a')
    )) {
      e.preventDefault();
      return;
    }
    navigate(`/products/${productId}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Layout>
      <div className="site-container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Products</h1>
          <p className="text-lg text-gray-600">
            Discover amazing products from verified sellers worldwide
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </form>

             {/* Category Filter */}
             <Select
                value={category || "all"}
                onValueChange={(val) => setCategory(val === "all" ? "" : val)}
              >
                <SelectTrigger>
                   <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " & ")}
                      </SelectItem>
                    ))}
                </SelectContent>
            </Select>


            {/* Price Range */}
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-25">$0 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100-500">$100 - $500</SelectItem>
                <SelectItem value="500">$500+</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="title-asc">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {products.length} products found
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 
            'space-y-4'
          }>
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={(e) => handleProductClick(product.id, e)}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="relative overflow-hidden rounded-t-lg">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Image+Not+Available'; }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <Package className="h-12 w-12 mb-2" />
                            <span className="text-sm">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-white/90">
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-sm text-gray-500">
                          Stock: {product.stock}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          by {product.seller_name}
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stock === 0}
                          className={
                            isInCart(product.id)
                              ? 'bg-green-600 hover:bg-green-700'
                              : ''
                          }
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          {isInCart(product.id) 
                            ? `In Cart (${getCartItemQuantity(product.id)})` 
                            : 'Add to Cart'
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image'; }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h3>
                          <Badge variant="secondary">{product.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-blue-600">
                              {formatPrice(product.price)}
                            </span>
                            <span className="text-sm text-gray-500">
                              Stock: {product.stock}
                            </span>
                            <span className="text-xs text-gray-500">
                              by {product.seller_name}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAddToCart(product.id)}
                            disabled={product.stock === 0}
                            className={
                              isInCart(product.id)
                                ? 'bg-green-600 hover:bg-green-700'
                                : ''
                            }
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            {isInCart(product.id) 
                              ? `In Cart (${getCartItemQuantity(product.id)})` 
                              : 'Add to Cart'
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductsPage;