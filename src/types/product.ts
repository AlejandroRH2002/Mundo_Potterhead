export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  isOnSale?: boolean;
  image: string;
  images?: string[];
  subcategory?: string | null;
  category: 'accessories' | 'clothing' | 'footwear' | 'toys' | 'bags';
  universe: 'harry-potter' | 'otros-universos';
}
