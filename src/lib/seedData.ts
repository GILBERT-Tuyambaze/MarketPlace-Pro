import { supabase } from '@/context/AuthContext';

export const SAMPLE_PRODUCTS = [
  {
    title: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
    price: 79.99,
    stock: 50,
    category: 'electronics',
    tags: ['headphones', 'bluetooth', 'audio'],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Premium Cotton T-Shirt',
    description: 'Comfortable 100% cotton t-shirt, perfect for everyday wear. Available in multiple colors.',
    price: 24.99,
    stock: 100,
    category: 'fashion',
    tags: ['clothing', 'cotton', 'casual'],
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Smart Home LED Light Bulb',
    description: 'WiFi-enabled LED bulb with 16 million color options and voice control compatible.',
    price: 19.99,
    stock: 75,
    category: 'electronics',
    tags: ['smart', 'lighting', 'home'],
    images: [
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Yoga Mat with Carrying Strap',
    description: 'Non-slip, eco-friendly yoga mat (6mm thick) perfect for exercise and fitness.',
    price: 34.99,
    stock: 45,
    category: 'sports',
    tags: ['yoga', 'exercise', 'fitness'],
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Stainless Steel Water Bottle',
    description: 'Insulated water bottle keeps beverages cold for 24 hours or hot for 12 hours.',
    price: 29.99,
    stock: 60,
    category: 'sports',
    tags: ['bottle', 'hydration', 'outdoor'],
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e9?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Bestseller Fiction Novel',
    description: 'Award-winning fiction novel by renowned author. A thrilling page-turner you won\'t be able to put down.',
    price: 14.99,
    stock: 30,
    category: 'books-media',
    tags: ['book', 'fiction', 'bestseller'],
    images: [
      'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Natural Face Moisturizer',
    description: 'Organic, hypoallergenic moisturizer enriched with natural ingredients. Suitable for all skin types.',
    price: 24.99,
    stock: 80,
    category: 'beauty',
    tags: ['skincare', 'moisturizer', 'natural'],
    images: [
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Ceramic Kitchen Knife Set',
    description: 'Professional 3-piece ceramic knife set with protective sheaths. Perfect for home cooking.',
    price: 44.99,
    stock: 35,
    category: 'home-garden',
    tags: ['kitchen', 'knives', 'cooking'],
    images: [
      'https://images.unsplash.com/photo-1591618264537-b7a6be3a0b00?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Portable Phone Charger',
    description: '20000mAh power bank with fast charging support. Charge your devices multiple times.',
    price: 34.99,
    stock: 70,
    category: 'electronics',
    tags: ['charger', 'power', 'mobile'],
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&q=80'
    ],
    status: 'approved'
  },
  {
    title: 'Cozy Winter Beanie',
    description: 'Warm and comfortable winter beanie in various colors. Perfect for cold weather.',
    price: 16.99,
    stock: 120,
    category: 'fashion',
    tags: ['hat', 'winter', 'accessories'],
    images: [
      'https://images.unsplash.com/photo-1540962351506-b8f7c027d8da?w=500&q=80'
    ],
    status: 'approved'
  }
];

export const seedTestProducts = async (sellerId: string) => {
  try {
    // Check if products already exist
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)
      .limit(1);

    if (fetchError) {
      console.error('Error checking for existing products:', fetchError);
      return;
    }

    if (existingProducts && existingProducts.length > 0) {
      console.log('Test products already exist for this seller');
      return;
    }

    // Insert sample products
    const productsToInsert = SAMPLE_PRODUCTS.map(product => ({
      ...product,
      seller_id: sellerId,
    }));

    console.log('Attempting to insert products:', productsToInsert.length);
    
    const { data: insertedData, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (insertError) {
      console.error('Error seeding products:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        hint: insertError.hint,
        details: insertError.details
      });
    } else {
      console.log('Sample products seeded successfully!', insertedData?.length || 0, 'products');
    }
  } catch (error) {
    console.error('Error in seedTestProducts:', error);
  }
};

// Check and seed products when user logs in
export const ensureTestProducts = async (userId: string) => {
  try {
    const { data: userProducts, error } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('seller_id', userId);

    if (error) {
      console.error('Error checking products:', error);
      return;
    }

    // If user has no products, seed them
    if (!userProducts || userProducts.length === 0) {
      console.log('No products found for user, starting seed...');
      await seedTestProducts(userId);
    } else {
      console.log(`User already has ${userProducts.length} products`);
    }
  } catch (error) {
    console.error('Error in ensureTestProducts:', error);
  }
};
