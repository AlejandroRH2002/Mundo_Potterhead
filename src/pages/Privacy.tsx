import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Cookie, 
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Trash2,
  Share2,
  MessageCircle
} from 'lucide-react';

export function Privacy() {
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
              <Shield className="h-10 w-10 text-[#FDB813]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-[#FDB813]">
                Política de Privacidad
              </h1>
              <p className="text-white/70 font-crimson text-lg mt-2">
                Última actualización: 15 de Febrero, 2025
              </p>
            </div>
          </div>
          
          <div className="h-1 w-32 bg-gradient-to-r from-[#FDB813] to-[#FFD700] rounded-full mb-8"></div>
          
          <p className="text-white/90 font-crimson text-lg leading-relaxed">
            En <span className="text-[#FDB813] font-bold">Mundo Potterhead</span>, nos tomamos muy en serio tu privacidad. 
            Esta política describe cómo recopilamos, usamos y protegemos tu información personal.
          </p>
        </div>

        {/* Contenido principal */}
        <div className="space-y-8">
          
          {/* 1. Información que recopilamos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Database className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">1. Información que recopilamos</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p><span className="text-[#FDB813] font-bold">• Información de cuenta:</span> Nombre, correo electrónico, dirección de envío y datos de pago.</p>
              <p><span className="text-[#FDB813] font-bold">• Información de navegación:</span> Dirección IP, tipo de navegador, páginas visitadas y tiempo de sesión.</p>
              <p><span className="text-[#FDB813] font-bold">• Historial de compras:</span> Productos adquiridos, fechas y montos.</p>
              <p><span className="text-[#FDB813] font-bold">• Comunicaciones:</span> Consultas realizadas a través del formulario de contacto.</p>
            </div>
          </div>

          {/* 2. Uso de la información */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Eye className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">2. Uso de la información</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Procesar y gestionar tus pedidos.</p>
              <p>• Mejorar nuestra tienda y experiencia de usuario.</p>
              <p>• Enviar actualizaciones sobre tus compras.</p>
              <p>• Enviar promociones y novedades (solo si aceptaste).</p>
              <p>• Prevenir fraudes y garantizar la seguridad.</p>
            </div>
          </div>

          {/* 3. Protección de datos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Lock className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">3. Protección de tus datos</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>• Usamos cifrado SSL para proteger la información sensible.</p>
              <p>• No compartimos tus datos personales con terceros sin tu consentimiento.</p>
              <p>• Implementamos medidas de seguridad físicas, electrónicas y administrativas.</p>
              <p>• Realizamos copias de seguridad periódicas.</p>
            </div>
          </div>

          {/* 4. Tus derechos */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">4. Tus derechos</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p><span className="text-[#FDB813] font-bold">• Acceso:</span> Puedes solicitar una copia de tus datos personales.</p>
              <p><span className="text-[#FDB813] font-bold">• Rectificación:</span> Puedes corregir información inexacta.</p>
              <p><span className="text-[#FDB813] font-bold">• Eliminación:</span> Puedes solicitar la eliminación de tu cuenta.</p>
              <p><span className="text-[#FDB813] font-bold">• Oposición:</span> Puedes negarte al procesamiento de tus datos.</p>
            </div>
          </div>

          {/* 5. Cookies */}
          <div className="bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-[#FDB813]/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-[#FDB813]/10 rounded-lg">
                <Cookie className="h-6 w-6 text-[#FDB813]" />
              </div>
              <h2 className="text-2xl font-cinzel font-bold text-white">5. Uso de Cookies</h2>
            </div>
            <div className="space-y-4 text-white/80 font-crimson pl-4">
              <p>Utilizamos cookies para mejorar tu experiencia, recordar tus preferencias y analizar el tráfico del sitio. Puedes desactivarlas desde la configuración de tu navegador.</p>
            </div>
          </div>

        {/* 6. Contacto */}
        <div className="bg-gradient-to-br from-[#4a0001]/30 to-transparent rounded-xl p-6 border border-[#FDB813]/40">
        <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-[#FDB813]/20 rounded-lg">
            <Mail className="h-6 w-6 text-[#FDB813]" />
            </div>
            <h2 className="text-2xl font-cinzel font-bold text-white">6. Contacto</h2>
        </div>
        <p className="text-white/90 font-crimson mb-4">
            Si tienes preguntas sobre esta política de privacidad, contáctanos:
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
                Nos reservamos el derecho de modificar esta política de privacidad en cualquier momento. 
                Los cambios serán publicados en esta página. Te recomendamos revisarla periódicamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}