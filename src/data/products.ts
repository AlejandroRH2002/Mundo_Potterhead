// src/data/products.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  isOnSale?: boolean;
  image: string;
  category: 'accessories' | 'clothing' | 'footwear' | 'toys' | 'bags';
  universe: 'harry-potter' | 'otros-universos';
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Collar Giratiempo Hermione',
    description: 'Réplica exacta del Giratiempo usado por Hermione en su tercer año en Hogwarts. Bañado en oro de 24k con detalles precisos y cadena ajustable.',
    price: 449.99,
    originalPrice: 599.99,
    isOnSale: true,
    image: 'https://images.unsplash.com/photo-1509868918748-a554ad25f858?w=800',
    category: 'accessories',
    universe: 'harry-potter'
  },
  {
    id: '2',
    name: 'Túnica Gryffindor Deluxe',
    description: 'Túnica oficial de Hogwarts con los colores de Gryffindor. Incluye escudo bordado, detalles en oro y forro de seda premium.',
    price: 899.99,
    image: 'https://images.unsplash.com/photo-1598153346810-860daa814c4b?w=800',
    category: 'clothing',
    universe: 'harry-potter'
  },
  {
    id: '3',
    name: 'Zapatos Quidditch Pro',
    description: 'Calzado deportivo diseñado para jugadores de Quidditch. Suela antideslizante y materiales impermeables.',
    price: 399.99,
    originalPrice: 599.99,
    isOnSale: true,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    category: 'footwear',
    universe: 'harry-potter'
  },
  {
    id: '4',
    name: 'Peluche Hedwig Deluxe',
    description: 'Peluche de alta calidad de Hedwig con sonidos auténticos y alas articuladas. Tamaño real.',
    price: 349.99,
    image: 'https://images.unsplash.com/photo-1535634262096-3fc4e0e73c3f?w=800',
    category: 'toys',
    universe: 'harry-potter'
  },
  {
    id: '5',
    name: 'Mochila Hogwarts Premium',
    description: 'Mochila de cuero con el escudo de Hogwarts, compartimentos mágicamente expandibles y protección contra lluvia.',
    price: 749.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    category: 'bags',
    universe: 'harry-potter'
  },
  {
    id: '6',
    name: 'Bufanda Gryffindor Deluxe',
    description: 'Bufanda oficial de Gryffindor tejida a mano con lana merino y detalles en oro. Perfecta para el invierno en Hogwarts.',
    price: 199.99,
    originalPrice: 299.99,
    isOnSale: true,
    image: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=800',
    category: 'accessories',
    universe: 'harry-potter'
  },
  {
    id: '7',
    name: 'Varita Mágica Personalizada',
    description: 'Varita de saúco con núcleo de pluma de fénix. Cada varita es única y selecciona a su mago.',
    price: 599.99,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800',
    category: 'accessories',
    universe: 'harry-potter'
  },
  {
    id: '8',
    name: 'Cáliz de Fuego Réplica',
    description: 'Réplica detallada del Cáliz de Fuego usado en el Torneo de los Tres Magos. Tallado en madera de roble.',
    price: 1299.99,
    originalPrice: 1599.99,
    isOnSale: true,
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
    category: 'accessories',
    universe: 'harry-potter'
  }
];