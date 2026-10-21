import type { SellableModel, InventoryMode } from '../../shared/inventory.ts';
export interface Product {
  id: string;
  models?: SellableModel[];
  inventoryMode?: InventoryMode;
  archived?: boolean;
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
