import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { fetchProductById } from '@/lib/firebaseProducts';
import * as Customer from '@/lib/customer';
import type { FirebaseProduct } from '@/lib/firebaseProducts';
import type { ProductComment, ProductSummary } from '@/lib/customer';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Star, 
  Heart, 
  Share2, 
  Package, 
  Shield,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  User,
  Bookmark,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<FirebaseProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, isInCart, getCartItemQuantity } = useCart();
  const { user, profile } = useAuth();

  // New state for reviews and products
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoved, setIsLoved] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<ProductSummary[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

 

  const fetchProduct = useCallback(async () => {
    try {
      if (!id) {
        console.error('No product ID provided');
        toast.error('Invalid product ID');
        navigate('/products');
        return;
      }

      console.log('Loading product with ID:', id);
      const fbProduct = await fetchProductById(id);
      
      if (!fbProduct) {
        console.error('Product returned null for ID:', id);
        toast.error('Product not found');
        navigate('/products');
        setLoading(false);
        return;
      }

      console.log('Product loaded successfully:', fbProduct);
      setProduct(fbProduct);

      // Fetch comments
      try {
        const productComments = await Customer.fetchProductComments(id);
        setComments(productComments);
      } catch (commentError) {
        console.error('Error fetching comments:', commentError);
      }

      // Fetch similar products
      try {
        const similar = await Customer.getSimilarProducts(id, fbProduct.category);
        setSimilarProducts(similar);
      } catch (similarError) {
        console.error('Error fetching similar products:', similarError);
      }

      // Check if product is saved/loved
      if (user) {
        try {
          const saved = await Customer.isProductSaved(id, user.uid);
          const loved = await Customer.isProductLoved(id, user.uid);
          setIsSaved(saved);
          setIsLoved(loved);
        } catch (statusError) {
          console.error('Error checking product save/love status:', statusError);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product. Please try again.');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user]);

   useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      await addToCart(id!, quantity);
      toast.success(`Added ${quantity} item(s) to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleSaveProduct = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      if (isSaved) {
        await Customer.unsaveProduct(id!, user.uid);
        setIsSaved(false);
        toast.success('Removed from saved products');
      } else {
        await Customer.saveProduct(id!, user.uid);
        setIsSaved(true);
        toast.success('Saved for later!');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to save product');
    }
  };

  const handleLoveProduct = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      if (isLoved) {
        await Customer.unloveProduct(id!, user.uid);
        setIsLoved(false);
        toast.success('Removed from loved products');
      } else {
        await Customer.loveProduct(id!, user.uid);
        setIsLoved(true);
        toast.success('Added to loved products!');
      }
    } catch (error) {
      console.error('Error toggling love:', error);
      toast.error('Failed to update favorites');
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !profile) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }

    try {
      setSubmittingReview(true);
      await Customer.submitProductReview(
        id!,
        user.uid,
        profile.full_name || user.email || 'Anonymous',
        reviewText,
        reviewRating
      );
      toast.success('Review submitted!');
      setReviewText('');
      setReviewRating(5);
      
      // Refresh comments
      const updated = await Customer.fetchProductComments(id!);
      setComments(updated);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
            <Button asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/products" className="hover:text-gray-900">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/600?text=Image+Unavailable'; }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Package className="h-20 w-20 mb-4" />
                  <span className="text-lg">No Image Available</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {/* Verified seller badge - can be enabled when seller data is attached to product */}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold text-blue-600">
                  {formatPrice(product.price)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span>{product.rating} ({product.reviews_count} reviews)</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Seller Info */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sold by</p>
                  <a href={`/seller/${product.seller_id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                    {product.seller_name}
                  </a>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/seller/${product.seller_id}`}>
                    View Store
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Stock and Quantity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stock:</span>
                <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </span>
              </div>

              {product.stock > 0 && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value);
                        if (newQuantity > 0 && newQuantity <= product.stock) {
                          setQuantity(newQuantity);
                        }
                      }}
                      className="w-20 h-10 text-center border-0 focus:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className={`w-full ${
                  isInCart(id!)
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
                onClick={() => {
                  if (isInCart(id!)) {
                    navigate('/cart');
                  } else {
                    handleAddToCart();
                  }
                }}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.stock === 0 
                  ? 'Out of Stock' 
                  : isInCart(id!)
                  ? `In Cart (${getCartItemQuantity(id!)})`
                  : 'Add to Cart'
                }
              </Button>

              <div className="flex gap-3">
                <Button 
                  variant={isSaved ? 'default' : 'outline'} 
                  size="lg" 
                  className="flex-1"
                  onClick={handleSaveProduct}
                >
                  <Bookmark className={`h-5 w-5 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save for Later'}
                </Button>
                <Button 
                  variant={isLoved ? 'default' : 'outline'} 
                  size="lg"
                  onClick={handleLoveProduct}
                  className={isLoved ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <Heart className={`h-5 w-5 ${isLoved ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Truck className="h-4 w-4 mr-3 text-green-600" />
                Free shipping on orders over $50
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <RotateCcw className="h-4 w-4 mr-3 text-blue-600" />
                30-day return policy
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-3 text-purple-600" />
                Buyer protection guarantee
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="border-t pt-6">
                <p className="text-sm text-gray-600 mb-3">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        <div className="mt-16">
          <Tabs defaultValue="similar" className="w-full">
            <TabsList>
              <TabsTrigger value="similar">Similar Products</TabsTrigger>
              <TabsTrigger value="reviews">Reviews & Ratings ({comments.length})</TabsTrigger>
            </TabsList>

            {/* Similar Products Tab */}
            <TabsContent value="similar">
              {similarProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No similar products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {similarProducts.map((sim) => (
                    <Link key={sim.id} to={`/products/${sim.id}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden rounded-t-lg">
                          <img
                            src={sim.image}
                            alt={sim.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://via.placeholder.com/300?text=Image+Not+Found';
                            }}
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600">
                            {sim.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-blue-600">
                              ${sim.price.toFixed(2)}
                            </span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-gray-600 ml-1">
                                {sim.rating || 0}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-6">
              {/* Write Review Form */}
              {user ? (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rating
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 cursor-pointer transition ${
                                  star <= reviewRating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Review
                        </label>
                        <Textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Share your experience with this product..."
                          className="min-h-32"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewText.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                      Sign in
                    </Link>
                    {' '}to write a review
                  </AlertDescription>
                </Alert>
              )}

              {/* Reviews List */}
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <p className="font-semibold text-gray-900">
                                {comment.user_name}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {comment.created_at?.toDate().toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < comment.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 mb-4">{comment.comment}</p>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="bg-gray-50 p-3 rounded">
                                <p className="font-semibold text-sm text-gray-900">
                                  {reply.user_name}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">{reply.reply}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPage;