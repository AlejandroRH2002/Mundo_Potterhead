import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Wand2 } from 'lucide-react';
import { products } from "../data/products";
import { ProductCard } from '../components/ProductCard';
import { PageTransition } from '../components/PageTransition';

export function Home() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDobbyMessage, setShowDobbyMessage] = useState(false);
  
  // Filtrar solo productos de Harry Potter
  const harryPotterProducts = products.filter(p => p.universe === 'harry-potter');
  
  const filteredProducts = harryPotterProducts
    .filter(product => !category || product.category === category)
    .filter(product => 
      searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const onSaleProducts = filteredProducts.filter(product => product.isOnSale);
  const regularProducts = filteredProducts.filter(product => !product.isOnSale);

  return (
    <PageTransition>
      <div className="bg-magical min-h-screen pb-12 relative">
        
        {/* 🧦 EASTER EGG - DOBBY (minúsculo, en la esquina) */}
        <div className="fixed bottom-1 right-1 opacity-[0.08] hover:opacity-100 transition-opacity duration-300 z-50 cursor-pointer group">
          <div 
            className="relative"
            onClick={() => setShowDobbyMessage(!showDobbyMessage)}
          >
            {/* Calcetín de Dobby - tamaño reducido */}
            <span className="text-xs block transform group-hover:scale-110 transition-transform">
              🧦
            </span>
            
            {/* Mensaje del easter egg */}
            {showDobbyMessage && (
              <div className="absolute bottom-6 right-0 w-72 p-3 bg-gradient-to-br from-[#2a1a0a] to-[#4a2a1a] border border-[#FDB813]/40 rounded-lg shadow-2xl font-crimson">
                <div className="flex items-start space-x-2">
                  <span className="text-xl">🧦</span>
                  <div>
                    <p className="text-[#FDB813] font-cinzel font-bold mb-1 text-[10px]">Dobby dice:</p>
                    <p className="text-white/90 text-[10px] leading-relaxed">
                      "Cuando auron no entendía me daba mucha ansiedad, me puse mal porque clínicamente sufro de ansiedad, 
                      me llevaron a urgencias por su culpa, Pero lo entiendo, está grande el viejo calvo, aprende más lento que antes."
                    </p>
                    <div className="mt-1 text-[#FDB813]/70 text-[8px] italic">
                      — Dobby es libre
                    </div>
                  </div>
                </div>
                {/* Triángulo decorativo */}
                <div className="absolute bottom-[-4px] right-2 w-2 h-2 bg-[#4a2a1a] border-r border-b border-[#FDB813]/40 transform rotate-45"></div>
              </div>
            )}
          </div>
        </div>

        {/* Contenido principal - IGUAL QUE ANTES */}
        <div className="content-wrapper">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-cinzel font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FDB813] via-yellow-400 to-[#FDB813] magical-shine">
                Mundo Potterhead
              </h1>
              <p className="text-xl text-yellow-200/90 font-crimson italic">
                Donde la magia cobra vida
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Buscar productos mágicos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-4 pl-12 rounded-lg bg-white/90 backdrop-blur-sm border-2 border-yellow-300/30 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-yellow-300/50 focus:ring-2 focus:ring-yellow-300/20 transition-all duration-300 font-crimson"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-yellow-700/50 group-hover:text-yellow-700 transition-colors" />
                <Wand2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-yellow-700/50 group-hover:text-yellow-700 transition-colors" />
              </div>
            </div>

            {/* Promotions Section */}
            {onSaleProducts.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center justify-center mb-8">
                  <h2 className="text-3xl font-cinzel font-bold text-[#FDB813] px-6 py-2 rounded-lg bg-black/30 backdrop-blur-sm border border-yellow-300/30 inline-flex items-center magical-shine">
                    <span className="mr-2">✨</span>
                    Ofertas Mágicas
                    <span className="ml-2">✨</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {onSaleProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Products Section */}
            <div>
              <div className="flex items-center justify-center mb-8">
                <h2 className="text-3xl font-cinzel font-bold text-[#FDB813] px-6 py-2 rounded-lg bg-black/30 backdrop-blur-sm border border-yellow-300/30 inline-flex items-center magical-shine">
                  Catálogo Completo
                </h2>
              </div>
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