import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Shirt, Footprints, Gamepad2, Backpack, Menu, X, MessageCircle, Sparkles } from 'lucide-react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuItems = [
    { to: "/?category=accessories", icon: ShoppingBag, text: "Accesorios" },
    { to: "/?category=clothing", icon: Shirt, text: "Ropa" },
    { to: "/?category=footwear", icon: Footprints, text: "Calzado" },
    { to: "/?category=toys", icon: Gamepad2, text: "Juguetes" },
    { to: "/?category=bags", icon: Backpack, text: "Bolsas" },
    { to: "/otros-universos", icon: Sparkles, text: "Otros Universos" },
    { to: "/contact", icon: MessageCircle, text: "Contacto" }
  ];

  const isActive = (path: string) => {
    if (path.includes('category')) {
      return location.search.includes(path.split('category=')[1]);
    }
    return location.pathname === path;
  };

  return (
    <nav className={`bg-gradient-to-r from-[#4a0001] via-[#740001] to-[#4a0001] text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'shadow-xl' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Mobile Menu Button - Moved to the left */}
          <button 
            onClick={toggleMenu}
            className="md:hidden z-20 text-[#FDB813] hover:text-[#FDB813]/80 transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo and Title - Centered on mobile, left-aligned on desktop */}
          <Link 
            to="/" 
            className={`flex items-center space-x-3 z-20 group hover-glow p-2 rounded-lg md:ml-0 ${
              isMenuOpen ? 'bg-[#4a0001]/95 backdrop-blur-sm' : ''
            } transition-all duration-300`}
          >
            <div className="w-12 h-12 transform group-hover:scale-105 transition-transform">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTfhAcjnttoaHg-nVqwlOa3T435rvBY46_8CQ&s" 
                alt="MP Logo"
                className="w-full h-full object-contain rounded-full border-2 border-[#FDB813]/30"
              />
            </div>
            <div>
              <span className="text-2xl font-cinzel font-bold text-[#FDB813] group-hover:text-[#FDB813]/80 transition-colors">
                Mundo Potterhead
              </span>
              <span className="block text-sm text-[#FDB813]/80 font-crimson italic">
                y otros universos
              </span>
            </div>
          </Link>

          {/* Spacer div for mobile layout */}
          <div className="w-10 md:hidden"></div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.text}
                  to={item.to} 
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                    isActive(item.to)
                      ? 'bg-white/20 text-[#FDB813]'
                      : 'hover:bg-white/10 hover:text-[#FDB813] text-white/90'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-cinzel text-sm">{item.text}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu */}
          <div 
            className={`fixed top-0 left-0 w-64 h-full bg-gradient-to-b from-[#4a0001] to-[#740001] shadow-lg transform transition-transform duration-300 ease-in-out ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } md:hidden z-10`}
          >
            <div className="flex flex-col pt-24 px-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.text}
                    to={item.to}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                      isActive(item.to)
                        ? 'bg-white/20 text-[#FDB813]'
                        : 'hover:bg-white/10 hover:text-[#FDB813] text-white/90'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-cinzel">{item.text}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}