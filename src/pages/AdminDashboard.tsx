import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  LogOut,
  Wand2,
  Search,
  Filter,
  DollarSign,
  Tag,
  Edit,
  Trash2,
  Eye,
  Plus,
  Sparkles,
  Castle,
  BarChart3,
  Users
} from 'lucide-react';
import { Product, products as harryPotterProducts } from '../data/products';
import { otherUniversesProducts } from '../data/otherUniverses';

// Combinar todos los productos
const allProducts = [...harryPotterProducts, ...otherUniversesProducts];

export function AdminDashboard() {
  const navigate = useNavigate();
  
  // Estado para todos los productos
  const [products, setProducts] = useState<Product[]>(allProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('all');
  const [stats, setStats] = useState({
    totalProducts: 0,
    harryPotterCount: 0,
    otrosUniversosCount: 0,
    totalValue: 0,
    onSale: 0,
    categories: {} as Record<string, number>
  });

  // Verificar si el usuario es admin
  useEffect(() => {
    const session = localStorage.getItem('potterhead_session');
    if (!session) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(session);
      if (userData.type !== 'admin') {
        navigate('/');
      }
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  // Actualizar estadísticas
  useEffect(() => {
    const totalProducts = products.length;
    const harryPotterCount = products.filter(p => p.universe === 'harry-potter').length;
    const otrosUniversosCount = products.filter(p => p.universe === 'otros-universos').length;
    const totalValue = products.reduce((sum, product) => sum + product.price, 0);
    const onSale = products.filter(product => product.isOnSale).length;
    
    const categories: Record<string, number> = {};
    products.forEach(product => {
      categories[product.category] = (categories[product.category] || 0) + 1;
    });

    setStats({
      totalProducts,
      harryPotterCount,
      otrosUniversosCount,
      totalValue,
      onSale,
      categories
    });
  }, [products]);

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesUniverse = selectedUniverse === 'all' || product.universe === selectedUniverse;
    return matchesSearch && matchesCategory && matchesUniverse;
  });

  // Categorías disponibles
  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'accessories', label: 'Accesorios' },
    { value: 'clothing', label: 'Ropa' },
    { value: 'footwear', label: 'Calzado' },
    { value: 'toys', label: 'Juguetes' },
    { value: 'bags', label: 'Bolsas' }
  ];

  // Universos disponibles
  const universes = [
    { value: 'all', label: 'Todos los universos', icon: Wand2, color: 'text-[#FDB813]' },
    { value: 'harry-potter', label: 'Harry Potter', icon: Castle, color: 'text-blue-400' },
    { value: 'otros-universos', label: 'Otros Universos', icon: Sparkles, color: 'text-pink-400' }
  ];

  // Función para redirigir a editar producto
  const handleEditProduct = (product: Product) => {
    navigate(`/admin/edit-product/${product.id}`);
  };

  // Función para redirigir a agregar producto
  const handleAddProduct = () => {
    navigate('/admin/add-product');
  };

  // Manejar eliminar producto
  const handleDeleteProduct = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const updatedProducts = products.filter(product => product.id !== id);
      setProducts(updatedProducts);
      alert('Producto eliminado exitosamente!');
    }
  };

  // Manejar logout
  const handleLogout = () => {
    localStorage.removeItem('potterhead_session');
    navigate('/');
    window.location.reload();
  };

  // Obtener icono del universo
  const getUniverseIcon = (universe: string) => {
    const universeObj = universes.find(u => u.value === universe);
    return universeObj?.icon || Wand2;
  };

  // Obtener color del universo
  const getUniverseColor = (universe: string) => {
    const universeObj = universes.find(u => u.value === universe);
    return universeObj?.color || 'text-[#FDB813]';
  };

  // Obtener nombre del universo
  const getUniverseName = (universe: string) => {
    const universeObj = universes.find(u => u.value === universe);
    return universeObj?.label || 'Desconocido';
  };

  return (
    <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24 pb-12">
      <div className="content-wrapper max-w-7xl mx-auto px-4">
        {/* Encabezado */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-cinzel font-bold text-[#FDB813]">
              Panel de Administración
            </h1>
            <p className="text-white/80 font-crimson">
              Gestiona todos los productos de la tienda
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddProduct}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Producto</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-800/50 hover:bg-red-800 rounded-lg transition-colors text-white font-cinzel text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/50 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 font-cinzel text-sm">Total Productos</p>
                <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-purple-700/50 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 font-cinzel text-sm">Harry Potter</p>
                <p className="text-2xl font-bold text-white">{stats.harryPotterCount}</p>
              </div>
              <Castle className="h-8 w-8 text-purple-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-900/50 to-pink-700/50 rounded-xl p-4 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 font-cinzel text-sm">Otros Universos</p>
                <p className="text-2xl font-bold text-white">{stats.otrosUniversosCount}</p>
              </div>
              <Sparkles className="h-8 w-8 text-pink-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-green-700/50 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 font-cinzel text-sm">Valor Total</p>
                <p className="text-2xl font-bold text-white">${stats.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-300" />
            </div>
          </div>
        </div>

        {/* Controles de búsqueda y filtro */}
        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 mb-8 border border-[#FDB813]/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <label className="block text-white font-cinzel mb-2 text-sm">Buscar Productos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#FDB813]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o descripción..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white placeholder-white/50 font-cinzel text-sm focus:outline-none focus:ring-1 focus:ring-[#FDB813]"
                />
              </div>
            </div>

            {/* Filtro por categoría */}
            <div>
              <label className="block text-white font-cinzel mb-2 text-sm">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel text-sm focus:outline-none focus:ring-1 focus:ring-[#FDB813]"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-[#4a0001]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por universo */}
            <div>
              <label className="block text-white font-cinzel mb-2 text-sm">Universo</label>
              <select
                value={selectedUniverse}
                onChange={(e) => setSelectedUniverse(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel text-sm focus:outline-none focus:ring-1 focus:ring-[#FDB813]"
              >
                {universes.map(universe => (
                  <option key={universe.value} value={universe.value} className="bg-[#4a0001]">
                    {universe.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 lg:p-6 border border-[#FDB813]/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className="text-xl font-cinzel font-bold text-[#FDB813]">
              Productos ({filteredProducts.length})
            </h2>
            <div className="flex items-center space-x-3 text-white/70 text-sm">
              <div className="flex items-center space-x-1">
                <Castle className="h-4 w-4 text-blue-400" />
                <span>Harry Potter</span>
              </div>
              <span className="text-white/30">•</span>
              <div className="flex items-center space-x-1">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span>Otros Universos</span>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/70 font-cinzel">No se encontraron productos</p>
              <button
                onClick={handleAddProduct}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-[#FDB813]/30 to-[#FFD700]/30 text-[#FDB813] rounded-lg border border-[#FDB813]/30 font-cinzel text-sm hover:bg-[#FDB813]/10 transition-colors"
              >
                Agregar primer producto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.map(product => {
                const UniverseIcon = getUniverseIcon(product.universe);
                const universeColor = getUniverseColor(product.universe);
                
                return (
                  <div 
                    key={product.id}
                    className="bg-gradient-to-br from-[#4a0001]/50 to-[#740001]/50 rounded-lg p-3 border border-[#FDB813]/20 hover:border-[#FDB813]/40 transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center">
                      {/* Imagen */}
                      <div className="relative">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className={`absolute -top-1 -right-1 ${universeColor}`}>
                          <UniverseIcon className="h-3 w-3" />
                        </div>
                      </div>

                      {/* Información */}
                      <div className="flex-1 ml-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-cinzel font-bold text-white text-sm truncate">
                              {product.name}
                            </h3>
                            <p className="text-white/70 text-xs mt-1 line-clamp-1">
                              {product.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="font-bold text-[#FDB813] text-sm">
                                ${product.price.toFixed(2)}
                              </span>
                              {product.originalPrice && (
                                <span className="text-white/50 line-through text-xs">
                                  ${product.originalPrice.toFixed(2)}
                                </span>
                              )}
                              {product.isOnSale && (
                                <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded-full">
                                  OFERTA
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-white/10 text-white/90 text-xs rounded-full capitalize">
                                {product.category}
                              </span>
                              <span className={`px-1.5 py-0.5 ${universeColor} text-xs rounded-full border ${universeColor.replace('text', 'border')}/30`}>
                                {product.universe === 'harry-potter' ? 'HP' : 'OU'}
                              </span>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => window.open(`/product/${product.id}`, '_blank')}
                              className="p-1.5 hover:bg-white/10 rounded transition-colors group"
                              title="Ver en tienda"
                            >
                              <Eye className="h-3 w-3 text-blue-400 group-hover:text-blue-300" />
                            </button>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-1.5 hover:bg-white/10 rounded transition-colors group"
                              title="Editar"
                            >
                              <Edit className="h-3 w-3 text-[#FDB813] group-hover:text-[#FFD700]" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 hover:bg-red-800/50 rounded transition-colors group"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3 text-red-400 group-hover:text-red-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Información del sistema */}
        <div className="mt-6 text-center text-white/50 text-xs font-cinzel">
          <p>Panel de Administración • Mundo Potterhead • {new Date().getFullYear()}</p>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-1">
            <span className="text-blue-400">
              <Castle className="inline h-3 w-3 mr-1" />
              Harry Potter: {stats.harryPotterCount}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-pink-400">
              <Sparkles className="inline h-3 w-3 mr-1" />
              Otros Universos: {stats.otrosUniversosCount}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-[#FDB813]">
              <Package className="inline h-3 w-3 mr-1" />
              Total: {stats.totalProducts}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}