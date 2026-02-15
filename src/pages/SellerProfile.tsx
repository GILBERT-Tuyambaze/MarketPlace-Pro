import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import * as Customer from '@/lib/customer';
import * as Seller from '@/lib/seller';
import { fetchProducts } from '@/lib/firebaseProducts';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  MessageCircle,
  AlertCircle,
  Shield,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FirebaseProduct } from '@/lib/firebaseProducts';
import type { SellerInfo, ProductComment } from '@/lib/customer';

const SellerProfilePage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<FirebaseProduct[]>([]);
  const [reviews, setReviews] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'message'>('products');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [claimReason, setClaimReason] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        setLoading(true);

        // Fetch seller info
        const seller = await Customer.fetchSellerInfo(sellerId || '');
        if (!seller) {
          toast.error('Seller not found');
          navigate('/products');
          return;
        }
        setSellerInfo(seller);

        // Fetch seller's products
        const sellerProducts = await fetchProducts(undefined, undefined, 'created_at', 50);
        const filtered = sellerProducts.filter((p) => p.seller_id === sellerId);
        setProducts(filtered);

        // Fetch seller reviews
        const sellerReviews = await Customer.fetchSellerReviews(sellerId || '');
        setReviews(sellerReviews);
      } catch (error) {
        console.error('Error fetching seller data:', error);
        toast.error('Failed to load seller profile');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId, navigate]);

  const handleSendMessage = async () => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setSendingMessage(true);
      // Send message to seller
      await Seller.sendSellerMessage(
        user.uid,
        [{ uid: sellerId, role: 'seller' }],
        `Message to ${sellerInfo?.name || 'Seller'}`,
        messageText
      );
      toast.success('Message sent to seller!');
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }

    if (!claimText.trim() || !claimReason) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmittingClaim(true);
      await Seller.submitClaim(
        user.uid,
        profile?.full_name || user.email || 'User',
        'seller',
        sellerId!,
        claimReason,
        claimText
      );
      toast.success('Claim submitted successfully');
      setClaimText('');
      setClaimReason('');
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim');
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="site-container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sellerInfo) {
    return (
      <Layout>
        <div className="site-container py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller not found</h2>
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
      <div className="site-container py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Seller Header Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                {/* Seller Avatar */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {sellerInfo.name.charAt(0).toUpperCase()}
                </div>

                {/* Seller Info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {sellerInfo.name}
                    </h1>
                    {sellerInfo.seller_status === 'approved' && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {sellerInfo.location && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {sellerInfo.location}
                      </div>
                    )}
                    {sellerInfo.response_time && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Avg. response time: {sellerInfo.response_time}
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-bold text-gray-900">
                        {sellerInfo.average_rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({sellerInfo.total_reviews} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setActiveTab('message')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
                <Button variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Report Seller
                </Button>
              </div>
            </div>

            {/* Seller Bio */}
            {sellerInfo.bio && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-gray-700">{sellerInfo.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'reviews' | 'message')}>
          <TabsList className="mb-6">
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-4 w-4 mr-2" />
              Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="message">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message Seller
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">This seller has no products yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden rounded-t-lg">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://via.placeholder.com/300?text=Image+Not+Found';
                          }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Stock: {product.stock}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {review.user_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {review.created_at?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Message Tab */}
          <TabsContent value="message">
            {!user ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                    Sign in
                  </Link>
                  {' '}to contact this seller
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Message
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message here..."
                      className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !messageText.trim()}
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Submit Claim */}
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-red-900 mb-4">
                      Report a Problem with This Seller
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason for Report
                        </label>
                        <select
                          value={claimReason}
                          onChange={(e) => setClaimReason(e.target.value)}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select a reason</option>
                          <option value="poor_quality">Poor Quality Products</option>
                          <option value="not_as_described">Not As Described</option>
                          <option value="rude_behavior">Rude/Inappropriate Behavior</option>
                          <option value="unresponsive">Unresponsive Seller</option>
                          <option value="fraud">Suspected Fraud</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Details
                        </label>
                        <textarea
                          value={claimText}
                          onChange={(e) => setClaimText(e.target.value)}
                          placeholder="Please provide details about your issue..."
                          className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitClaim}
                        disabled={submittingClaim || !claimText.trim() || !claimReason}
                        variant="destructive"
                        className="w-full"
                      >
                        {submittingClaim ? 'Submitting...' : 'Submit Report'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SellerProfilePage;
