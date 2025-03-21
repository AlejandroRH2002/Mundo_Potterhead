import React from 'react';
import { Mail, Phone, MapPin, Facebook } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function Contact() {
  return (
    <PageTransition>
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
                        <p className="text-gray-600">+52 9911411561</p>
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
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.7626837013445!2d-89.59659942440523!3d20.962043380670764!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f567770e1998fd9%3A0x5da3f69cb5ddb815!2sMundo%20Potterhead%20y%20Otros%20Universos!5e0!3m2!1ses-419!2smx!4v1741651206481!5m2!1ses-419!2smx"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="rounded-lg shadow-lg"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}