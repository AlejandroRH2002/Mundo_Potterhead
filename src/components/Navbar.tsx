import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Shirt, 
  Footprints, 
  Gamepad2, 
  Backpack, 
  Menu, 
  X, 
  MessageCircle, 
  Sparkles,
  User,
  LogOut,
  Shield,
  ShoppingCart,
  Wand2,
  ChevronDown,
  Home
} from 'lucide-react';

// Función para obtener usuario actual
const getCurrentUser = () => {
  const session = localStorage.getItem('potterhead_session');
  if (!session) return null;
  
  try {
    const userData = JSON.parse(session);
    // Verificar si la sesión expiró (24 horas)
    const sessionAge = Date.now() - userData.timestamp;
    if (sessionAge < 24 * 60 * 60 * 1000) {
      return userData;
    } else {
      localStorage.removeItem('potterhead_session');
      return null;
    }
  } catch {
    return null;
  }
};

// Función para cerrar sesión
const logout = () => {
  localStorage.removeItem('potterhead_session');
  window.location.href = '/';
};

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Verificar usuario al cargar y cuando cambie la ubicación
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, [location]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
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

  // Cerrar menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-container') && !target.closest('.mobile-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className={`bg-gradient-to-r from-[#4a0001] via-[#740001] to-[#4a0001] text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'shadow-xl' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden z-50 text-[#FDB813] hover:text-[#FDB813]/80 transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo and Title */}
          <Link 
            to="/" 
            className={`flex items-center space-x-3 z-50 group hover-glow p-2 rounded-lg md:ml-0 transition-all duration-300`}
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

          {/* Desktop Menu Items */}
          <div className="hidden md:flex items-center space-x-1">
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
            
            {/* User Section - Desktop */}
            <div className="flex items-center space-x-2 ml-4 user-menu-container">
              {user ? (
                <>
                  {/* Contenedor del dropdown del usuario */}
                  <div className="relative">
                    <button 
                      onClick={toggleUserMenu}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-all duration-200 cursor-pointer"
                    >
                      {/* Avatar con inicial */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FDB813] to-[#FFD700] flex items-center justify-center">
                        <span className="font-cinzel font-bold text-[#4a0001] text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Nombre del usuario */}
                      <div className="text-left">
                        <span className="font-cinzel text-sm text-white block leading-tight">
                          {user.name.split(' ')[0]}
                        </span>
                        <span className="text-xs text-[#FDB813]/80 font-cinzel">
                          {user.type === 'admin' ? 'Administrador' : 'Mi cuenta'}
                        </span>
                      </div>
                      
                      <ChevronDown className={`h-4 w-4 text-[#FDB813] transition-transform duration-200 ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {/* Dropdown menu */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-gradient-to-b from-[#4a0001] to-[#740001] rounded-lg shadow-xl border border-[#FDB813]/30 z-50">
                        <div className="py-2">
                          {/* Información del usuario */}
                          <div className="px-4 py-3 border-b border-white/10">
                            <p className="font-cinzel font-bold text-white">{user.name}</p>
                            <p className="text-sm text-[#FDB813]/80">{user.email}</p>
                          </div>
                          
                          {/* Opciones del menú */}
                          <div className="py-2">
                            <Link 
                              to="/profile" 
                              className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 text-white font-cinzel transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <User className="h-4 w-4 text-[#FDB813]" />
                              <span>Mi Perfil</span>
                            </Link>
                            
                            <Link 
                              to="/" 
                              className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 text-white font-cinzel transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Home className="h-4 w-4 text-[#FDB813]" />
                              <span>Inicio</span>
                            </Link>
                            
                            {user.type === 'admin' && (
                              <Link
                                to="/admin"
                                className="flex items-center space-x-3 px-4 py-3 hover:bg-white/10 text-white font-cinzel transition-colors"
                                onClick={() => setIsUserMenuOpen(false)}
                              >
                                <Shield className="h-4 w-4 text-[#FDB813]" />
                                <span>Panel de Administración</span>
                              </Link>
                            )}
                            
                            <div className="border-t border-white/20 my-1"></div>
                            
                            <button
                              onClick={handleLogout}
                              className="flex items-center space-x-3 w-full px-4 py-3 hover:bg-red-800/50 text-red-200 font-cinzel text-left transition-colors"
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Cerrar Sesión</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Botón de carrito */}
                  <button 
                    className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => navigate('/cart')}
                    title="Carrito de compras"
                  >
                    <ShoppingCart className="h-5 w-5 text-[#FDB813]" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      0
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold text-sm"
                  >
                    <User className="h-4 w-4" />
                    <span>Ingresar</span>
                  </Link>
                  
                  {/* Carrito para usuarios no logueados */}
                  <button 
                    className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => navigate('/cart')}
                    title="Carrito de compras"
                  >
                    <ShoppingCart className="h-5 w-5 text-[#FDB813]" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      0
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {isMenuOpen && (
            <div 
              className="fixed top-0 left-0 w-full h-full bg-black/50 backdrop-blur-sm md:hidden z-40 mobile-menu-container"
              onClick={() => setIsMenuOpen(false)}
            >
              {/* Mobile Menu Panel */}
              <div 
                className="fixed top-0 left-0 w-4/5 max-w-xs h-full bg-gradient-to-b from-[#4a0001] to-[#740001] shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col pt-24 px-4 space-y-1">
                  {/* User Info at Top of Mobile Menu */}
                  {user ? (
                    <div className="bg-white/10 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FDB813] to-[#FFD700] flex items-center justify-center">
                          <span className="font-cinzel font-bold text-[#4a0001] text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-cinzel text-white font-semibold">{user.name}</p>
                          <p className="text-sm text-[#FDB813]/80">{user.email}</p>
                          <p className="text-xs text-white/60">
                            {user.type === 'admin' ? 'Administrador' : 'Usuario'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mb-6">
                      <p className="text-white/80 font-cinzel mb-3">¿Aún no tienes cuenta?</p>
                      <Link
                        to="/login"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg font-cinzel font-bold"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        <span>Iniciar Sesión</span>
                      </Link>
                    </div>
                  )}

                  {/* Menu Items */}
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.text}
                        to={item.to}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
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

                  {/* User Actions in Mobile Menu */}
                  <div className="border-t border-white/20 pt-4 mt-4">
                    {user && (
                      <>
                        <Link
                          to="/profile"
                          className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-cinzel mb-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <User className="h-5 w-5 text-[#FDB813]" />
                          <span>Mi Perfil</span>
                        </Link>
                        
                        <Link
                          to="/"
                          className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 text-white/90 font-cinzel"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Home className="h-5 w-5" />
                          <span>Inicio</span>
                        </Link>
                        
                        {user.type === 'admin' && (
                          <Link
                            to="/admin"
                            className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 text-white/90 font-cinzel"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Shield className="h-5 w-5 text-purple-400" />
                            <span>Panel Admin</span>
                          </Link>
                        )}
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-red-800/50 text-red-200 font-cinzel text-left mt-2"
                        >
                          <LogOut className="h-5 w-5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </>
                    )}
                    
                    {/* Carrito en móvil */}
                    <button 
                      className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-white/10 text-white/90 font-cinzel mt-4"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/cart');
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span>Carrito de Compras</span>
                      <span className="ml-auto bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        0
                      </span>
                    </button>
                    
                    {/* Contacto y ayuda */}
                    <div className="pt-4 border-t border-white/20">
                      <Link
                        to="/contact"
                        className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white/10 text-white/90 font-cinzel"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span>Contacto y Ayuda</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}