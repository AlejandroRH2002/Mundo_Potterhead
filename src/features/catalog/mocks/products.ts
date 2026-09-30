import type { Product } from '@/types/product';

export const products: Product[] = [
  {
    id: '1',
    name: 'Collar Giratiempo Hermione',
    description: 'Réplica exacta del Giratiempo usado por Hermione en su tercer año en Hogwarts. Bañado en oro de 24k con detalles precisos y cadena ajustable.',
    price: 449.99,
    originalPrice: 599.99,
    isOnSale: true,
    image: '/images/product-placeholder.svg',
    category: 'accessories',
    universe: 'harry-potter'
  },
  {
    id: '2',
    name: 'Túnica Gryffindor Deluxe',
    description: 'Túnica oficial de Hogwarts con los colores de Gryffindor. Incluye escudo bordado, detalles en oro y forro de seda premium.',
    price: 899.99,
    image: '/images/product-placeholder.svg',
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
    image: '/images/product-placeholder.svg',
    category: 'footwear',
    universe: 'harry-potter'
  },
  {
    id: '4',
    name: 'Peluche Hedwig Deluxe',
    description: 'Peluche de alta calidad de Hedwig con sonidos auténticos y alas articuladas. Tamaño real.',
    price: 349.99,
    image: '/images/product-placeholder.svg',
    category: 'toys',
    universe: 'harry-potter'
  },
  {
    id: '5',
    name: 'Mochila Hogwarts Premium',
    description: 'Mochila de cuero con el escudo de Hogwarts, compartimentos mágicamente expandibles y protección contra lluvia.',
    price: 749.99,
    image: '/images/product-placeholder.svg',
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
    image: '/images/product-placeholder.svg',
    category: 'accessories',
    universe: 'harry-potter'
  },
  {
    id: '7',
    name: 'Varita Mágica Personalizada',
    description: 'Varita de saúco con núcleo de pluma de fénix. Cada varita es única y selecciona a su mago.',
    price: 599.99,
    image: '/images/product-placeholder.svg',
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
    image: '/images/product-placeholder.svg',
    category: 'accessories',
    universe: 'harry-potter'
  }
];
