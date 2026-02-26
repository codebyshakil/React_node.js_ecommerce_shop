export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  image: string;
  gallery: string[];
  regularPrice: number;
  discountPrice?: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  variations?: { type: string; options: string[] }[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  author: string;
  date: string;
  category: string;
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

export const categories: Category[] = [
  { id: '1', name: 'Spices & Seasonings', slug: 'spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop', productCount: 24 },
  { id: '2', name: 'Organic Oils', slug: 'oils', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop', productCount: 18 },
  { id: '3', name: 'Dried Fruits & Nuts', slug: 'dried-fruits', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop', productCount: 32 },
  { id: '4', name: 'Grains & Pulses', slug: 'grains', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop', productCount: 15 },
  { id: '5', name: 'Beverages', slug: 'beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop', productCount: 20 },
  { id: '6', name: 'Dairy Products', slug: 'dairy', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&h=300&fit=crop', productCount: 12 },
];

export const products: Product[] = [
  {
    id: '1', name: 'Premium Saffron Threads', slug: 'premium-saffron', description: 'Hand-picked premium saffron threads sourced from the finest farms. Known for its rich color, distinct aroma, and exceptional flavor that elevates every dish.', shortDescription: 'Hand-picked premium saffron threads', categoryId: '1', categoryName: 'Spices & Seasonings',
    image: 'https://images.unsplash.com/photo-1625178551411-62eae9e0438e?w=500&h=500&fit=crop', gallery: [], regularPrice: 45.99, discountPrice: 39.99, stockStatus: 'in_stock', stockQuantity: 150, rating: 4.8, reviewCount: 124,
    variations: [{ type: 'Weight', options: ['1g', '5g', '10g', '25g'] }],
  },
  {
    id: '2', name: 'Cold-Pressed Virgin Olive Oil', slug: 'olive-oil', description: 'Extra virgin olive oil cold-pressed from handpicked olives. Perfect for salads, cooking, and finishing dishes with a smooth, fruity flavor.', shortDescription: 'Extra virgin cold-pressed olive oil', categoryId: '2', categoryName: 'Organic Oils',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&h=500&fit=crop', gallery: [], regularPrice: 28.99, discountPrice: 24.99, stockStatus: 'in_stock', stockQuantity: 200, rating: 4.6, reviewCount: 89,
    variations: [{ type: 'Size', options: ['250ml', '500ml', '1L'] }],
  },
  {
    id: '3', name: 'Organic Cashew Nuts', slug: 'cashew-nuts', description: 'Premium whole cashew nuts organically grown and carefully processed. Rich in healthy fats, protein, and essential minerals.', shortDescription: 'Premium organic whole cashews', categoryId: '3', categoryName: 'Dried Fruits & Nuts',
    image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&h=500&fit=crop', gallery: [], regularPrice: 18.99, stockStatus: 'in_stock', stockQuantity: 300, rating: 4.7, reviewCount: 156,
    variations: [{ type: 'Weight', options: ['250g', '500g', '1kg'] }],
  },
  {
    id: '4', name: 'Basmati Rice Premium', slug: 'basmati-rice', description: 'Aged premium basmati rice with extra-long grains. Known for its aromatic fragrance and fluffy texture when cooked.', shortDescription: 'Aged premium basmati rice', categoryId: '4', categoryName: 'Grains & Pulses',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&h=500&fit=crop', gallery: [], regularPrice: 12.99, discountPrice: 10.99, stockStatus: 'in_stock', stockQuantity: 500, rating: 4.5, reviewCount: 203,
    variations: [{ type: 'Weight', options: ['1kg', '5kg', '10kg', '25kg'] }],
  },
  {
    id: '5', name: 'Ceylon Cinnamon Sticks', slug: 'ceylon-cinnamon', description: 'Authentic Ceylon cinnamon sticks with a delicate, sweet flavor. Perfect for baking, beverages, and savory dishes.', shortDescription: 'Authentic Ceylon cinnamon sticks', categoryId: '1', categoryName: 'Spices & Seasonings',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&h=500&fit=crop', gallery: [], regularPrice: 15.99, stockStatus: 'in_stock', stockQuantity: 180, rating: 4.9, reviewCount: 67,
    variations: [{ type: 'Weight', options: ['50g', '100g', '250g'] }],
  },
  {
    id: '6', name: 'Organic Green Tea', slug: 'green-tea', description: 'Premium organic green tea leaves hand-harvested from mountain plantations. Rich in antioxidants with a smooth, refreshing taste.', shortDescription: 'Premium organic green tea leaves', categoryId: '5', categoryName: 'Beverages',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=500&h=500&fit=crop', gallery: [], regularPrice: 22.99, discountPrice: 19.99, stockStatus: 'low_stock', stockQuantity: 25, rating: 4.4, reviewCount: 91,
    variations: [{ type: 'Weight', options: ['100g', '250g', '500g'] }],
  },
];

export const blogPosts: BlogPost[] = [
  { id: '1', title: 'The Art of Spice Blending: A Beginner\'s Guide', slug: 'spice-blending-guide', excerpt: 'Discover the secrets behind creating perfect spice blends that will transform your cooking from ordinary to extraordinary.', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=400&fit=crop', author: 'Chef Amara', date: '2026-02-10', category: 'Recipes' },
  { id: '2', title: 'Health Benefits of Cold-Pressed Oils', slug: 'cold-pressed-oils-benefits', excerpt: 'Learn why cold-pressed oils are superior to refined alternatives and how they can boost your overall health.', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=400&fit=crop', author: 'Dr. Singh', date: '2026-02-05', category: 'Health' },
  { id: '3', title: 'Sustainable Sourcing: Our Commitment to Quality', slug: 'sustainable-sourcing', excerpt: 'How we partner with local farmers to bring you the finest, ethically sourced products from around the world.', image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop', author: 'Team Editorial', date: '2026-01-28', category: 'Company' },
];

export const testimonials: Testimonial[] = [
  { id: '1', name: 'Sarah Mitchell', company: 'The Gourmet Kitchen', content: 'Exceptional quality products and outstanding customer service. The saffron threads are the finest I\'ve sourced in 15 years of professional cooking.', rating: 5, avatar: 'SM' },
  { id: '2', name: 'David Chen', company: 'OrganicMart Wholesale', content: 'Reliable supplier with consistent quality. Their bulk pricing and RFQ process makes procurement seamless for our chain of stores.', rating: 5, avatar: 'DC' },
  { id: '3', name: 'Priya Sharma', company: 'Spice Route Restaurant', content: 'We switched all our spice sourcing to this company. The difference in flavor is remarkable. Our customers have noticed the upgrade immediately.', rating: 4, avatar: 'PS' },
  { id: '4', name: 'James O\'Brien', company: 'FreshFoods Inc.', content: 'Professional, responsive, and their products speak for themselves. The olive oil range is particularly impressive. Highly recommended!', rating: 5, avatar: 'JO' },
];

export const partners = [
  'FreshMart', 'OrganicWorld', 'SpiceRoute', 'NaturalGoods', 'PureHarvest', 'GreenChoice',
];
