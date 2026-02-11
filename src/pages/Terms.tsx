import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Scale, 
  Shield, 
  DollarSign, 
  Truck, 
  RotateCcw,
  AlertCircle,
  FileText,
  BookOpen,
  CheckCircle,
  ArrowLeft,
  CreditCard,
  Package,
  XCircle,
  Mail, 
  MessageCircle 
} from 'lucide-react';

export function Terms() {
  return (
    <div className="bg-gradient-to-br from-[#0a000a] via-[#1a0a1a] to-[#0a000a] min-h-screen pt-24">
      <div className="content-wrapper max-w-5xl mx-auto px-4 py-12">
        
        {/* Encabezado */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center space-x-2 text-[#FDB813] hover:text-[#FFD700] font-cinzel mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al inicio</span>
          </Link>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-[#FDB813]/20 to-[#FFD700]/20 rounded-lg">
              <Scale className="h-10 w-10 text-[#FDB813]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-[#FDB813]">
                Términos y Condiciones
              </h1>
              <p className="text-white/70 font-crimson text-lg mt-2">
                Última actualización: 15 de Febrero, 2025
              </p>
            </div>
          </div>
          
          <div className="h-1 w-32 bg-gradient-to-r from-[#FDB813] to-[#FFD700] rounded-full mb-8"></div>
          
          <p className="text-white/90 font-crimson text-lg leading-relaxed">
            Bienvenido a <span className="text-[#FDB813] font-bold">Mundo Potterhead</span>. Al acceder y utilizar este sitio web, 
            aceptas cumplir y estar sujeto a los siguientes términos y condiciones. 
            Por favor, léelos cuidadosamente antes de realizar cualquier compra.
          </p>
        </div>

        {/* Contenido principal */}
        <div className="space-y-8">
          
          {/* 1. Aceptación de los términos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">1. Aceptación de los términos</h2>
            </div>
            <p className="text-white/80 font-crimson pl-4">
              Al utilizar nuestro sitio web, declaras que tienes al menos 18 años o que cuentas con el consentimiento de tus padres o tutores legales. Si no estás de acuerdo con estos términos, no debes utilizar nuestros servicios.
            </p>
          </div>

          {/* 2. Productos y precios */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">2. Productos y precios</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Nos esforzamos por mostrar los colores y detalles de nuestros productos con la mayor precisión posible, pero no podemos garantizar que tu monitor muestre los colores exactamente como son.</p>
              <p>• Los precios están sujetos a cambios sin previo aviso.</p>
              <p>• Nos reservamos el derecho de modificar o descontinuar cualquier producto en cualquier momento.</p>
              <p>• No somos responsables de errores tipográficos en las descripciones o precios.</p>
            </div>
          </div>

         {/* 3. Pagos */}
        <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
        <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-[#FDB813]/10 rounded-lg">
            <CreditCard className="h-6 w-6 text-[#FDB813]" />
            </div>
            <h2 className="text-2xl font-cinzel font-bold text-white">3. Pagos y facturación</h2>
        </div>
        <div className="space-y-4 text-white/80 font-crimson pl-4">
            <p>• Aceptamos tarjetas de débito y crédito (disponibles únicamente en tienda física).</p>
            <p>• Transferencias bancarias: gestionadas a través de nuestro <Link to="/contact" className="text-[#FDB813] hover:text-[#FFD700] underline underline-offset-2">formulario de contacto</Link>.</p>
            <p>• Todos los precios están expresados en pesos mexicanos (MXN) e incluyen impuestos.</p>
            <p>• La facturación se realiza bajo los datos fiscales que nos proporciones.</p>
            <div className="bg-[#FDB813]/10 p-3 rounded-lg border border-[#FDB813]/30 mt-2">
            <p className="text-[#FDB813] font-cinzel text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                ⚠️ El sistema de carrito en línea y pagos electrónicos estará disponible próximamente.
            </p>
            </div>
        </div>
        </div>

          {/* 4. Envíos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Truck className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">4. Política de envíos</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Realizamos envíos a toda la República Mexicana.</p>
              <p>• Los tiempos de entrega son de 3 a 7 días hábiles.</p>
              <p>• El costo de envío se calcula al finalizar la compra según tu ubicación.</p>
              <p>• No nos hacemos responsables por retrasos de la paquetería.</p>
            </div>
          </div>

          {/* 5. Devoluciones y reembolsos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <RotateCcw className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">5. Devoluciones y reembolsos</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Aceptamos devoluciones dentro de los primeros 14 días posteriores a la compra.</p>
              <p>• El producto debe estar en su empaque original y sin usar.</p>
              <p>• Los gastos de envío de la devolución corren por cuenta del cliente.</p>
              <p>• Los reembolsos se procesan en un plazo de 5 a 10 días hábiles.</p>
              <p className="text-[#FDB813]">✧ No aplica devolución en productos en oferta o liquidación.</p>
            </div>
          </div>

          {/* 6. Propiedad intelectual */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">6. Propiedad intelectual</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Todo el contenido de este sitio web (logos, imágenes, textos) es propiedad de Mundo Potterhead o tiene licencia para su uso.</p>
              <p>• HARRY POTTER, personajes, nombres y todos los elementos relacionados son marcas registradas de Warner Bros. Entertainment Inc. y JK Rowling.</p>
              <p>• No está permitido copiar, distribuir o modificar nuestro contenido sin autorización expresa.</p>
            </div>
          </div>

          {/* 7. Limitación de responsabilidad */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Shield className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">7. Limitación de responsabilidad</h2>
            </div>
            <p className="text-white/80 font-crimson pl-4">
              Mundo Potterhead no será responsable por daños directos, indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de usar nuestros productos o servicios.
            </p>
          </div>

          {/* 8. Cancelaciones */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <XCircle className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">8. Cancelaciones</h2>
            </div>
            <p className="text-white/80 font-crimson pl-4">
              Puedes cancelar tu pedido dentro de las primeras 2 horas posteriores a la compra. Pasado ese tiempo, el pedido ya estará en proceso de preparación y no será posible cancelarlo.
            </p>
          </div>

          {/* 9. Contacto legal */}
            <div className="bg-gradient-to-br from-[#4a0001]/30 to-transparent rounded-xl p-6 border border-[#FDB813]/40">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-[#FDB813]/20 rounded-lg">
                <FileText className="h-6 w-6 text-[#FDB813]" />
                </div>
                <h2 className="text-2xl font-cinzel font-bold text-white">9. Contacto legal</h2>
            </div>
            <p className="text-white/90 font-crimson mb-4">
                Para asuntos legales o consultas sobre estos términos, contáctanos:
            </p>
            <div className="bg-black/20 p-4 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                <MessageCircle className="h-5 w-5 text-[#FDB813]" />
                <span className="text-[#FDB813] font-cinzel">WhatsApp: +52 9911411561</span>
                </div>
                <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-[#FDB813]" />
                <Link 
                    to="/contact" 
                    className="text-[#FDB813] font-cinzel hover:text-[#FFD700] transition-colors underline underline-offset-2"
                >
                    Página de Contacto
                </Link>
                </div>
                
                {/* Horario de atención detallado */}
                <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-[#FDB813] font-cinzel text-sm mb-2">⏰ Horario de atención:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/70 text-sm font-crimson">
                    <span>Lunes - Jueves:</span>
                    <span>4:00 PM - 8:00 PM</span>
                    <span>Viernes:</span>
                    <span>10:00 AM - 1:00 PM, 4:00 PM - 8:00 PM</span>
                    <span>Sábado:</span>
                    <span>10:00 AM - 6:00 PM</span>
                    <span>Domingo:</span>
                    <span className="text-red-400">Cerrado</span>
                </div>
                </div>
            </div>
            </div>

          {/* Aviso final */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-[#FDB813] flex-shrink-0 mt-1" />
              <p className="text-white/70 text-sm font-crimson">
                Estos términos y condiciones fueron actualizados por última vez el 15 de Febrero de 2025. 
                Nos reservamos el derecho de modificarlos en cualquier momento. Te recomendamos revisar esta página periódicamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}