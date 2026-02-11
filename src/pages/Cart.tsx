import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  ArrowLeft, 
  AlertTriangle,
  Package,
  Truck,
  Shield,
  CreditCard,
  Home
} from 'lucide-react';

export function Cart() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-[#0a000a] via-[#1a0a1a] to-[#0a000a] min-h-screen pt-24">
      <div className="content-wrapper max-w-6xl mx-auto px-4">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-[#FDB813] hover:text-[#FFD700] font-cinzel mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Seguir Comprando</span>
            </button>
            <h1 className="text-4xl font-cinzel font-bold text-[#FDB813] flex items-center">
              <ShoppingCart className="h-10 w-10 mr-4" />
              Mi Carrito
            </h1>
            <p className="text-white/80 font-crimson mt-2">
              Gestiona tus productos mágicos
            </p>
          </div>
        </div>

        {/* Mensaje de funcionalidad no disponible */}
        <div className="bg-gradient-to-br from-[#4a0001]/50 to-[#740001]/50 rounded-xl p-8 border border-[#FDB813]/30 mb-8">
          <div className="flex flex-col items-center text-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FDB813] blur-xl opacity-20 rounded-full"></div>
              <AlertTriangle className="h-24 w-24 text-[#FDB813] relative z-10" />
            </div>
            
            <h2 className="text-3xl font-cinzel font-bold text-[#FDB813] mb-4">
              ¡Funcionalidad en Desarrollo!
            </h2>
            
            <p className="text-white/90 text-lg font-crimson max-w-2xl mb-8">
              Estamos trabajando en el sistema de carrito de compras para ofrecerte 
              una experiencia mágica. Pronto podrás agregar productos de Harry Potter 
              y otros universos a tu carrito y completar tus compras.
            </p>

            {/* Iconos de características futuras */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-lg">
                <Package className="h-8 w-8 text-[#FDB813] mb-2" />
                <span className="text-white font-cinzel text-sm">Agregar Productos</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-lg">
                <CreditCard className="h-8 w-8 text-[#FDB813] mb-2" />
                <span className="text-white font-cinzel text-sm">Pago Seguro</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-lg">
                <Truck className="h-8 w-8 text-[#FDB813] mb-2" />
                <span className="text-white font-cinzel text-sm">Envío Rápido</span>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-white/5 rounded-lg">
                <Shield className="h-8 w-8 text-[#FDB813] mb-2" />
                <span className="text-white font-cinzel text-sm">Compra Protegida</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center space-x-2 px-8 py-3 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold"
              >
                <Home className="h-5 w-5" />
                <span>Volver al Inicio</span>
              </button>
              
              <button
                onClick={() => navigate('/otros-universos')}
                className="flex items-center justify-center space-x-2 px-8 py-3 border-2 border-[#FDB813] text-[#FDB813] rounded-lg hover:bg-[#FDB813]/10 transition-all font-cinzel font-bold"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Explorar Productos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Información sobre el futuro carrito */}
        <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-white/10">
          <h3 className="text-2xl font-cinzel font-bold text-[#FDB813] mb-6 text-center">
            Próximas Funcionalidades del Carrito
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#4a0001]/30 to-transparent p-6 rounded-lg">
              <h4 className="text-lg font-cinzel font-bold text-white mb-3">🎯 Características Principales</h4>
              <ul className="text-white/80 space-y-2 font-crimson">
                <li>• Agregar/eliminar productos</li>
                <li>• Cantidades ajustables</li>
                <li>• Cálculo automático de total</li>
                <li>• Cupones de descuento</li>
                <li>• Guardar para más tarde</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#FDB813]/10 to-transparent p-6 rounded-lg">
              <h4 className="text-lg font-cinzel font-bold text-white mb-3">⚡ Experiencia de Compra</h4>
              <ul className="text-white/80 space-y-2 font-crimson">
                <li>• Checkout en 3 pasos</li>
                <li>• Múltiples métodos de pago</li>
                <li>• Historial de pedidos</li>
                <li>• Seguimiento de envío</li>
                <li>• Soporte 24/7</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-[#740001]/30 to-transparent p-6 rounded-lg">
              <h4 className="text-lg font-cinzel font-bold text-white mb-3">🛡️ Seguridad y Garantía</h4>
              <ul className="text-white/80 space-y-2 font-crimson">
                <li>• Pago seguro SSL</li>
                <li>• Protección de datos</li>
                <li>• Garantía de 30 días</li>
                <li>• Devoluciones fáciles</li>
                <li>• Certificado oficial</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contador regresivo simulado */}
        <div className="text-center mt-10">
          <div className="inline-flex items-center space-x-2 bg-white/5 px-6 py-3 rounded-full">
            <div className="animate-pulse h-3 w-3 bg-[#FDB813] rounded-full"></div>
            <span className="text-[#FDB813] font-cinzel text-sm">
              Funcionalidad disponible próximamente
            </span>
          </div>
          
          <p className="text-white/50 text-sm font-crimson mt-6">
            ¿Tienes sugerencias para el carrito? <br />
            <button 
              onClick={() => navigate('/contact')}
              className="text-[#FDB813] hover:text-[#FFD700] underline font-cinzel"
            >
              Contáctanos
            </button> y ayúdanos a crear la mejor experiencia mágica.
          </p>
        </div>
      </div>
    </div>
  );
}