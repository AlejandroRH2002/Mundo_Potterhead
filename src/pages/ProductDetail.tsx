import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Sparkles, Castle } from 'lucide-react';
import { products } from "../data/products";
import { otherUniversesProducts } from "../data/otherUniverses";
import { motion } from 'framer-motion';

export function ProductDetail() {
  const { id } = useParams();
  const [isImageHovered, setIsImageHovered] = useState(false);
  
  // Combinar todos los productos
  const allProducts = [...products, ...otherUniversesProducts];
  
  // Buscar el producto por ID
  const product = allProducts.find(p => p.id === id);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!product) {
    return (
      <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen">
        <div className="content-wrapper flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-cinzel font-bold text-[#FDB813]">Producto no encontrado</h2>
            <p className="text-white/80 mt-2 mb-6">El producto que buscas no existe o ha sido removido.</p>
            <Link 
              to="/" 
              onClick={scrollToTop}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const whatsappLink = `https://wa.me/9911411561?text=Hola,%20me%20interesa%20el%20producto:%20${encodeURIComponent(product.name)}%20(Precio:%20$${product.price.toFixed(2)})`;
  
  // Determinar el universo del producto
  const isHarryPotter = product.universe === 'harry-potter';
  const universeIcon = isHarryPotter ? Castle : Sparkles;
  const UniverseIcon = universeIcon;
  const bgGradient = isHarryPotter 
    ? 'bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001]' 
    : 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]';
  const accentColor = isHarryPotter ? 'text-[#FDB813]' : 'text-[#FF5733]';
  const accentBorder = isHarryPotter ? 'border-[#FDB813]/30' : 'border-[#FF5733]/30';
  const accentBg = isHarryPotter ? 'from-red-800 to-yellow-700' : 'from-[#FF5733] to-[#C70039]';

  return (
    <div className={`${bgGradient} min-h-screen py-12`}>
      <div className="content-wrapper">
        <div className="max-w-6xl mx-auto px-4">
          <Link 
            to={isHarryPotter ? "/" : "/otros-universos"} 
            onClick={scrollToTop}
            className="inline-flex items-center text-[#FDB813] hover:text-[#FFD700] mb-8 font-cinzel"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al catálogo
          </Link>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border border-yellow-300/30">
            <div className="md:flex">
              {/* Contenedor de la imagen con efecto de zoom */}
              <div className="md:w-1/2 relative">
                {/* Badges */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${isHarryPotter ? 'bg-blue-900/80' : 'bg-purple-900/80'} text-white font-cinzel text-sm`}>
                      <UniverseIcon className="h-3 w-3" />
                      <span>{isHarryPotter ? 'Harry Potter' : 'Otros Universos'}</span>
                    </div>
                    {product.isOnSale && (
                      <div className="px-3 py-1 bg-red-600 text-white rounded-full font-cinzel text-sm">
                        ¡En Oferta!
                      </div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="w-full h-[500px] overflow-hidden cursor-pointer"
                  onMouseEnter={() => setIsImageHovered(true)}
                  onMouseLeave={() => setIsImageHovered(false)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ease-in-out ${
                      isImageHovered ? 'scale-110' : 'scale-100'
                    }`}
                  />
                </div>
              </div>
              
              {/* Información del producto */}
              <div className="md:w-1/2 p-8">
                {/* Categoría */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-cinzel capitalize">
                    {product.category === 'accessories' && 'Accesorio'}
                    {product.category === 'clothing' && 'Ropa'}
                    {product.category === 'footwear' && 'Calzado'}
                    {product.category === 'toys' && 'Juguete'}
                    {product.category === 'bags' && 'Bolso'}
                  </span>
                </div>
                
                {/* Nombre */}
                <h1 className="text-3xl font-cinzel font-bold text-gray-900 mb-4">{product.name}</h1>
                
                {/* Descripción */}
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">{product.description}</p>
                
                {/* Precios */}
                <div className="flex items-end gap-3 mb-8">
                  {product.isOnSale ? (
                    <>
                      <div className="text-4xl font-bold text-red-600 font-cinzel">
                        ${product.price.toFixed(2)}
                      </div>
                      <div className="text-2xl text-gray-500 line-through">
                        ${product.originalPrice?.toFixed(2)}
                      </div>
                      <div className="ml-auto px-3 py-1 bg-green-600 text-white rounded-lg font-cinzel">
                        Ahorras ${((product.originalPrice || product.price) - product.price).toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900 font-cinzel">
                      ${product.price.toFixed(2)}
                    </div>
                  )}
                </div>
                
                {/* Información adicional */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-cinzel font-bold text-gray-800 mb-2">Información del producto:</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Categoría: <span className="font-medium capitalize">{product.category}</span></li>
                    <li>• Universo: <span className="font-medium">{isHarryPotter ? 'Harry Potter' : 'Otros Universos'}</span></li>
                    <li>• Garantía de 14 días o 2 semanas.</li>
                  </ul>
                </div>
                
                {/* Botón de compra */}
                <div className="space-y-4">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] font-cinzel text-lg shadow-lg"
                  >
                    <MessageCircle className="h-6 w-6 mr-2" />
                    Comprar por WhatsApp
                  </a>
                  
                  <p className="text-center text-gray-600 text-sm">
                    ¿Tienes preguntas? <br/>
                    <span className="text-gray-500">Escríbenos al WhatsApp: +51 991 141 561</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Sección de recomendaciones */}
            <div className="border-t border-gray-200 p-8">
              <motion.h3 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xl font-cinzel font-bold text-gray-800 mb-6"
              >
                También te podría interesar
              </motion.h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allProducts
                  .filter(p => p.id !== product.id && p.universe === product.universe)
                  .slice(0, 4)
                  .map((relatedProduct, index) => (
                    <motion.div
                      key={relatedProduct.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ 
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <Link 
                        to={`/product/${relatedProduct.id}`} 
                        onClick={scrollToTop}
                        className="group block"
                      >
                        <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-yellow-300 hover:shadow-lg transition-shadow">
                          <motion.img 
                            src={relatedProduct.image} 
                            alt={relatedProduct.name}
                            className="w-full h-32 object-cover rounded-md mb-2"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                          />
                          <h4 className="font-cinzel font-bold text-gray-800 text-sm group-hover:text-yellow-700 line-clamp-1">
                            {relatedProduct.name}
                          </h4>
                          <p className="text-gray-600 font-bold">${relatedProduct.price.toFixed(2)}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}