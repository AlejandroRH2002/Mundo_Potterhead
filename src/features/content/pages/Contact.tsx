import { Phone, MapPin, Facebook } from 'lucide-react';

export function Contact() {
  return (
    <div className="contact-enter">
      <div className="bg-magical min-h-screen">
        <div className="content-wrapper py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl font-cinzel font-bold text-center text-yellow-300 mb-12">
              Contáctanos
            </h1>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-yellow-300/30">
              <div className="grid md:grid-cols-2 gap-12">
                {/* Contact Information */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-cinzel font-bold text-red-900 mb-6">
                    Información de Contacto
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-yellow-700" />
                      <div>
                        <p className="font-bold text-gray-800">WhatsApp</p>
                        <p className="text-gray-600">{import.meta.env.VITE_WHATSAPP_NUMBER ? `+${import.meta.env.VITE_WHATSAPP_NUMBER}` : 'Consulta nuestros canales de contacto.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Facebook className="h-5 w-5 text-yellow-700" />
                      <div>
                        <p className="font-bold text-gray-800">Facebook</p>
                        <a 
                          href="https://www.facebook.com/people/Mundo-Potterhead-y-Otros-Universos/100080211423270/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          @MundoPotterheadyOtrosUniversos
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-yellow-700" />
                      <div>
                        <p className="font-bold text-gray-800">Ubicación</p>
                        <p className="text-gray-600"> Calle 63B x 8 local 4 Plaza                                   Cortés. Colonia Cortes Sarmiento.</p>
                        <p className="text-gray-600">Mérida Yucatán</p>
                      </div>
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className="mt-8">
                    <h2 className="text-2xl font-cinzel font-bold text-red-900 mb-6">
                      Horario de Atención
                    </h2>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">Lunes - Jueves</span>
                        <span className="text-gray-600">4:00 PM - 8:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">Viernes</span>
                        <div className="text-right">
                          <div className="text-gray-600">10:00 AM - 1:00 PM</div>
                          <div className="text-gray-600">4:00 PM - 8:00 PM</div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">Sábado</span>
                        <span className="text-gray-600">10:00 AM - 6:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">Domingo</span>
                        <span className="text-gray-600">Cerrado</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Map */}
                <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden">
                  <a className="inline-block rounded-lg bg-red-950 px-5 py-3 text-white underline" href="https://www.google.com/maps/search/?api=1&amp;query=Mundo+Potterhead+y+Otros+Universos+Merida" target="_blank" rel="noopener noreferrer">Ver ubicación en Google Maps (abre otra pestaña)</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
