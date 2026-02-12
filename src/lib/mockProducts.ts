// Mock product data for local testing without Supabase
export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  seller_id: string;
  seller_name: string;
  rating: number;
  reviews_count: number;
  stock: number;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation, 30-hour battery life, and premium sound quality.',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    category: 'electronics',
    seller_id: 'seller-1',
    seller_name: 'TechStore',
    rating: 4.7,
    reviews_count: 342,
    stock: 25,
    status: 'approved',
    created_at: '2025-12-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Comfortable Cotton T-Shirt',
    description: 'Soft, breathable cotton t-shirt perfect for everyday wear. Available in multiple sizes and colors.',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    category: 'clothing',
    seller_id: 'seller-2',
    seller_name: 'FashionHub',
    rating: 4.5,
    reviews_count: 128,
    stock: 50,
    status: 'approved',
    created_at: '2025-12-02T11:30:00Z',
  },
  {
    id: '3',
    name: 'Smart LED Bulb',
    description: 'WiFi-enabled LED bulb with 16 million color options, voice control compatible, and energy efficient.',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400&h=400&fit=crop',
    category: 'home',
    seller_id: 'seller-1',
    seller_name: 'TechStore',
    rating: 4.3,
    reviews_count: 215,
    stock: 100,
    status: 'approved',
    created_at: '2025-12-03T14:00:00Z',
  },
  {
    id: '4',
    name: 'Exercise Yoga Mat',
    description: 'Non-slip yoga mat with carrying strap. 6mm thickness provides excellent support and cushioning.',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    category: 'sports',
    seller_id: 'seller-3',
    seller_name: 'FitnessPro',
    rating: 4.6,
    reviews_count: 89,
    stock: 40,
    status: 'approved',
    created_at: '2025-12-04T09:15:00Z',
  },
  {
    id: '5',
    name: 'Stainless Steel Water Bottle',
    description: '32oz double-wall insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours.',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1602524206684-88c5dbe5b4a1?w=400&h=400&fit=crop',
    category: 'accessories',
    seller_id: 'seller-4',
    seller_name: 'OutdoorGear',
    rating: 4.8,
    reviews_count: 456,
    stock: 75,
    status: 'approved',
    created_at: '2025-12-05T16:45:00Z',
  },
  {
    id: '6',
    name: 'Bestselling Novel - The Adventure',
    description: 'An epic adventure novel with twists and turns. Perfect for readers who love mystery and action.',
    price: 14.99,
    image: 'https://images.unsplash.com/photo-1507842217343-583f7270bfba?w=400&h=400&fit=crop',
    category: 'books',
    seller_id: 'seller-5',
    seller_name: 'BookStore',
    rating: 4.4,
    reviews_count: 567,
    stock: 88,
    status: 'approved',
    created_at: '2025-12-06T12:00:00Z',
  },
  {
    id: '7',
    name: 'Organic Face Moisturizer',
    description: 'Natural, organic face moisturizer with aloe vera and vitamin E. Suitable for all skin types.',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1556228578-326c85291e2f?w=400&h=400&fit=crop',
    category: 'beauty',
    seller_id: 'seller-6',
    seller_name: 'BeautyPlus',
    rating: 4.7,
    reviews_count: 234,
    stock: 60,
    status: 'approved',
    created_at: '2025-12-07T13:20:00Z',
  },
  {
    id: '8',
    name: 'Professional Knife Set',
    description: '5-piece stainless steel knife set with cutting board. German-forged blades sharp and durable.',
    price: 44.99,
    image: 'https://images.unsplash.com/photo-1568308868901-57f06e4acfa7?w=400&h=400&fit=crop',
    category: 'kitchen',
    seller_id: 'seller-7',
    seller_name: 'ChefDelight',
    rating: 4.9,
    reviews_count: 112,
    stock: 35,
    status: 'approved',
    created_at: '2025-12-08T10:30:00Z',
  },
  {
    id: '9',
    name: 'Fast USB-C Phone Charger',
    description: '65W USB-C charger, charges your phone in 30 minutes. Compact design with travel case included.',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1591290621749-8d437538e9b6?w=400&h=400&fit=crop',
    category: 'electronics',
    seller_id: 'seller-1',
    seller_name: 'TechStore',
    rating: 4.6,
    reviews_count: 289,
    stock: 45,
    status: 'approved',
    created_at: '2025-12-09T15:45:00Z',
  },
  {
    id: '10',
    name: 'Warm Winter Beanie',
    description: 'Soft acrylic beanie hat keeps you warm in winter. Available in 8 different colors.',
    price: 16.99,
    image: 'https://images.unsplash.com/photo-1571110177098-24ec42ed204d?w=400&h=400&fit=crop',
    category: 'clothing',
    seller_id: 'seller-2',
    seller_name: 'FashionHub',
    rating: 4.5,
    reviews_count: 178,
    stock: 120,
    status: 'approved',
    created_at: '2025-12-10T11:00:00Z',
  },
];

// Search and filter mock products
export function searchMockProducts(
  query?: string,
  category?: string,
  minPrice?: number,
  maxPrice?: number
): MockProduct[] {
  let results = [...MOCK_PRODUCTS];

  if (query && query.trim()) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
  }

  if (category && category.trim()) {
    results = results.filter((p) => p.category === category);
  }

  if (minPrice !== undefined) {
    results = results.filter((p) => p.price >= minPrice);
  }

  if (maxPrice !== undefined) {
    results = results.filter((p) => p.price <= maxPrice);
  }

  return results;
}

// Get a single product by ID
export function getMockProductById(id: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

// Get categories from mock products
export function getMockCategories(): string[] {
  const categories = new Set(MOCK_PRODUCTS.map((p) => p.category));
  return Array.from(categories).sort();
}

// Get price range from mock products
export function getMockPriceRange(): [number, number] {
  const prices = MOCK_PRODUCTS.map((p) => p.price);
  return [Math.min(...prices), Math.max(...prices)];
}
