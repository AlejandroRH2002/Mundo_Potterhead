import React from 'react';
import { Product } from '../data/products';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-yellow-300/30 hover:border-yellow-300/50 relative magical-shine">
        {product.isOnSale && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-full font-cinzel text-sm transform rotate-12 shadow-lg">
            Promoción
          </div>
        )}
        <div className="h-64 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transform transition-all duration-500 group-hover:scale-110"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-cinzel font-bold text-red-900 mb-2 group-hover:text-red-700 transition-colors">
            {product.name}
          </h3>
          <p className="text-gray-600 font-crimson mb-4 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-end gap-3">
            <p className="text-2xl font-bold text-yellow-700 font-cinzel">
              ${product.price.toFixed(2)}
            </p>
            {product.isOnSale && product.originalPrice && (
              <p className="text-lg text-gray-500 line-through font-crimson">
                ${product.originalPrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}