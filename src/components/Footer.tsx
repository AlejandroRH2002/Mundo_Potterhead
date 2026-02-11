import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-[#740001] text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-cinzel font-bold text-[#FDB813] mb-4">Mundo Potterhead</h3>
            <p className="text-[#FDB813]/80 text-sm">
              Tu destino mágico para productos exclusivos del mundo de Harry Potter y otros universos fantásticos.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-cinzel font-bold text-[#FDB813] mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  onClick={scrollToTop}
                  className="text-[#FDB813]/80 hover:text-[#FDB813] transition-colors"
                >
                  Inicio
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  onClick={scrollToTop}
                  className="text-[#FDB813]/80 hover:text-[#FDB813] transition-colors"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link 
                  to="/?category=accessories" 
                  onClick={scrollToTop}
                  className="text-[#FDB813]/80 hover:text-[#FDB813] transition-colors"
                >
                  Productos
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-cinzel font-bold text-[#FDB813] mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/privacy" 
                  onClick={scrollToTop}
                  className="text-[#FDB813]/80 hover:text-[#FDB813] transition-colors"
                >
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  onClick={scrollToTop}
                  className="text-[#FDB813]/80 hover:text-[#FDB813] transition-colors"
                >
                  Términos y Condiciones
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-[#FDB813]/20 pt-8 text-center">
          <p className="text-[#FDB813]/80 text-sm">
            © {currentYear} Mundo Potterhead. Todos los derechos reservados.
          </p>
          <p className="text-[#FDB813]/60 text-xs mt-2">
            HARRY POTTER, personajes, nombres y todos los elementos relacionados son marcas registradas de Warner Bros. Entertainment Inc. Derechos de autor © JK Rowling.
          </p>
        </div>
      </div>
    </footer>
  );
}