import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Layout from '@/components/Layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { storage, db } from '@/lib/firebaseClient';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFormData {
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  tags: string[];
}

const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editId = searchParams.get('edit');
  const [isEdit, setIsEdit] = useState(!!editId);
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    images: [],
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'home-garden', label: 'Home & Garden' },
    { value: 'books-media', label: 'Books & Media' },
    { value: 'sports', label: 'Sports' },
    { value: 'beauty', label: 'Beauty' },
  ];

  // Check if user has permission to add products
  const canAddProduct = profile?.role === 'seller' || profile?.role === 'admin';

  // Load product if editing
  useEffect(() => {
    if (isEdit && editId) {
      loadProduct(editId);
    }
  }, [isEdit, editId]);

  const loadProduct = async (productId: string) => {
    setPageLoading(true);
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        toast.error('Product not found');
        navigate('/seller/dashboard');
        return;
      }

      const product = productSnap.data();
      
      // Check if user owns the product (or is admin)
      if (product.seller_id !== user?.uid && profile?.role !== 'admin') {
        toast.error('You do not have permission to edit this product');
        navigate('/seller/dashboard');
        return;
      }

      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || 0,
        stock: product.stock || 0,
        category: product.category || '',
        images: product.images || [],
        tags: product.tags || []
      });
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
      navigate('/seller/dashboard');
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImageUploading(true);
    const uploadedImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Max size is 5MB.`);
          continue;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image.`);
          continue;
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `product-images/${user?.uid}/${Date.now()}-${Math.random()}.${fileExt}`;

          // Upload to Firebase Storage
          const fileRef = ref(storage, fileName);
          await uploadBytes(fileRef, file);

          // Get download URL
          const downloadURL = await getDownloadURL(fileRef);
          uploadedImages.push(downloadURL);
        } catch (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedImages.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedImages]
        }));
        toast.success(`${uploadedImages.length} image(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      // Reset the file input to allow re-selecting the same files
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImageUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to add products');
      return;
    }

    if (!canAddProduct) {
      toast.error('You do not have permission to add products');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Product description is required');
      return;
    }
    if (formData.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (formData.stock < 0) {
      toast.error('Stock cannot be negative');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    setLoading(true);

    try {
      const productData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price,
        stock: formData.stock,
        category: formData.category,
        images: formData.images,
        tags: formData.tags,
        status: profile?.role === 'admin' ? 'approved' : 'pending',
        ...(isEdit ? { updated_at: Timestamp.now() } : { 
          seller_id: user.uid,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        }),
      };

      if (isEdit && editId) {
        // Update existing product
        const productRef = doc(db, 'products', editId);
        await updateDoc(productRef, productData);
        
        toast.success('Product updated successfully!');
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), productData);
        
        toast.success(
          profile?.role === 'admin' 
            ? 'Product added successfully!' 
            : 'Product submitted for approval!'
        );
      }
      
      // Navigate back to dashboard
      if (profile?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/seller/dashboard');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!canAddProduct) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                You do not have permission to add products. Only sellers and admins can add products.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (pageLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading product...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update your product details' : 'Create a new product listing for your store'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Product Information */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Product Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter product title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe your product in detail"
                        rows={5}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price ($) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="stock">Stock Quantity *</Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={formData.stock}
                          onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Images */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="images">Upload Images</Label>
                        <Input
                          ref={fileInputRef}
                          id="images"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={imageUploading}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Select multiple images (max 5MB each)
                        </p>
                      </div>

                      {/* Image Preview */}
                      {formData.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {formData.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Product ${index + 1}`}
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Unavailable'; }}
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {imageUploading && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Uploading images...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="Enter tag"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="hover:text-blue-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || imageUploading}
                      >
                        {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Product' : 'Add Product')}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(-1)}
                      >
                        Cancel
                      </Button>

                      {profile?.role === 'seller' && (
                        <p className="text-sm text-gray-500 text-center">
                          Your product will be submitted for admin approval
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddProduct;