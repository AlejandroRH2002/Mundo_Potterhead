import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { otherUniversesProducts } from '../data/otherUniverses'; // CAMBIÉ ESTA LÍNEA
import { ProductCard } from '../components/ProductCard';
import { PageTransition } from '../components/PageTransition';

export function OtherUniverses() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = otherUniversesProducts.filter(product => 
    searchTerm === '' || 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSaleProducts = filteredProducts.filter(product => product.isOnSale);
  const regularProducts = filteredProducts.filter(product => !product.isOnSale);

  return (
    <PageTransition isOtherUniverses>
      <div className="min-h-screen pb-12 bg-gradient-to-b from-[#FF5733] via-[#581845] to-[#900C3F] relative">
        {/* Decorative background pattern inspired by Demon Slayer's geometric patterns */}
        <div className="absolute inset-0 bg-[url('https://wallpapercave.com/wp/wp7182890.jpg')] bg-cover bg-center opacity-50"></div>
        
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-5xl font-cinzel font-bold text-center mb-4 text-white">
              Otros Universos
            </h1>
            <p className="text-center text-xl text-white/80 mb-12 font-cinzel">
              Descubre productos de tus franquicias favoritas
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FF5733]"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50" />
              </div>
            </div>

            {/* Promotions Section */}
            {onSaleProducts.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-cinzel font-bold text-[#FF5733] mb-8 flex items-center justify-center">
                  <span className="bg-white/10 px-6 py-2 rounded-full backdrop-blur-sm border border-[#FF5733]/20">
                    Ofertas Especiales ✨
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {onSaleProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Products Section */}
            <div>
              <h2 className="text-3xl font-cinzel font-bold text-white mb-8 flex items-center justify-center">
                <span className="bg-white/10 px-6 py-2 rounded-full backdrop-blur-sm border border-white/20">
                  Todos los Productos
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}