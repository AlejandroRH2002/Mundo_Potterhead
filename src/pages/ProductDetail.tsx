import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { products } from '../data/products';

export function ProductDetail() {
  const { id } = useParams();
  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="bg-magical min-h-screen">
        <div className="content-wrapper flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-cinzel font-bold text-yellow-300">Producto no encontrado</h2>
            <Link to="/" className="text-yellow-200 hover:text-yellow-400 mt-4 inline-block">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const whatsappLink = `https://wa.me/9911411561?text=Hola,%20me%20interesa%20el%20producto:%20${encodeURIComponent(product.name)}`;

  return (
    <div className="bg-magical min-h-screen py-12">
      <div className="content-wrapper">
        <div className="max-w-6xl mx-auto px-4">
          <Link to="/" className="inline-flex items-center text-yellow-300 hover:text-yellow-400 mb-8">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al catálogo
          </Link>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border border-yellow-300/30">
            <div className="md:flex">
              <div className="md:w-1/2 relative">
                {product.isOnSale && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-cinzel transform rotate-12">
                    Promoción
                  </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="md:w-1/2 p-8">
                <h1 className="text-3xl font-cinzel font-bold text-red-900 mb-4">{product.name}</h1>
                <p className="text-gray-700 mb-6 text-lg">{product.description}</p>
                <div className="flex items-end gap-3 mb-8">
                  <div className="text-4xl font-bold text-yellow-700 font-cinzel">
                    ${product.price.toFixed(2)}
                  </div>
                  {product.isOnSale && (
                    <div className="text-2xl text-gray-500 line-through">
                      ${product.originalPrice?.toFixed(2)}
                    </div>
                  )}
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-800 to-yellow-700 text-white rounded-lg hover:from-red-700 hover:to-yellow-600 transition-all transform hover:scale-105 font-cinzel text-lg"
                >
                  <MessageCircle className="h-6 w-6 mr-2" />
                  Comprar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}