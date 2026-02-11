import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  X, 
  ArrowLeft,
  Type,
  FileText,
  DollarSign,
  Tag,
  Image as ImageIcon,
  Sparkles,
  Castle
} from 'lucide-react';

export function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    originalPrice: undefined as number | undefined,
    isOnSale: false,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    category: 'accessories' as 'accessories' | 'clothing' | 'footwear' | 'toys' | 'bags',
    universe: 'harry-potter' as 'harry-potter' | 'otros-universos'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verificar si el usuario es admin y cargar producto
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
        return;
      }

      // Cargar datos del producto si hay ID
      if (id) {
        loadProduct();
      } else {
        setMessage({
          type: 'error',
          text: 'No se especificó un producto para editar'
        });
        setTimeout(() => navigate('/admin'), 2000);
      }
    } catch {
      navigate('/login');
    }
  }, [id, navigate]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      
      // Simulamos la carga de datos
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Datos de ejemplo - reemplazar con API real
      const mockProduct = {
        name: 'Varita de Saúco',
        description: 'La varita más poderosa del mundo mágico, con núcleo de pelo de cola de Thestral',
        price: 299.99,
        originalPrice: 399.99,
        isOnSale: true,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
        category: 'accessories' as const,
        universe: 'harry-potter' as const
      };
      
      setFormData(mockProduct);
      setIsLoading(false);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Error al cargar el producto'
      });
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'accessories', label: 'Accesorios' },
    { value: 'clothing', label: 'Ropa' },
    { value: 'footwear', label: 'Calzado' },
    { value: 'toys', label: 'Juguetes' },
    { value: 'bags', label: 'Bolsas' }
  ];

  const universes = [
    { value: 'harry-potter', label: 'Harry Potter', icon: Castle },
    { value: 'otros-universos', label: 'Otros Universos', icon: Sparkles }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'price' || name === 'originalPrice') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validaciones
      if (!formData.name.trim()) {
        throw new Error('El nombre del producto es obligatorio');
      }

      if (!formData.description.trim()) {
        throw new Error('La descripción es obligatoria');
      }

      if (formData.price <= 0) {
        throw new Error('El precio debe ser mayor a 0');
      }

      if (formData.originalPrice && formData.originalPrice <= 0) {
        throw new Error('El precio original debe ser mayor a 0');
      }

      // Simular actualización en API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Aquí normalmente harías una petición PUT a tu API
      // await axios.put(`/api/products/${id}`, formData);
      
      setMessage({
        type: 'success',
        text: 'Producto actualizado exitosamente! Redirigiendo...'
      });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/admin');
      }, 2000);

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Error al actualizar el producto'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  // Obtener icono del universo
  const UniverseIcon = universes.find(u => u.value === formData.universe)?.icon || Castle;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24">
        <div className="content-wrapper max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-[#FDB813] border-t-transparent rounded-full mb-4"></div>
            <span className="text-white font-cinzel text-lg">Cargando producto...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24">
      <div className="content-wrapper max-w-4xl mx-auto px-4">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 text-[#FDB813] hover:text-[#FFD700] font-cinzel mb-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Volver al Panel</span>
            </button>
            <h1 className="text-3xl font-cinzel font-bold text-[#FDB813]">
              Editar Producto
            </h1>
            <p className="text-white/80 font-crimson">
              Editando producto #{id}
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-cinzel ${message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#FDB813]/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda - Formulario */}
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                  <Type className="h-4 w-4 text-[#FDB813]" />
                  <span>Nombre del Producto *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                  placeholder="Ej: Varita de Saúco"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                  <FileText className="h-4 w-4 text-[#FDB813]" />
                  <span>Descripción *</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                  placeholder="Describe el producto..."
                />
              </div>

              {/* Precios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <DollarSign className="h-4 w-4 text-[#FDB813]" />
                    <span>Precio ($) *</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <DollarSign className="h-4 w-4 text-[#FDB813]" />
                    <span>Precio Original</span>
                  </label>
                  <input
                    type="number"
                    name="originalPrice"
                    value={formData.originalPrice || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                  <Tag className="h-4 w-4 text-[#FDB813]" />
                  <span>Categoría *</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value} className="bg-[#4a0001]">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Universo */}
              <div>
                <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                  <UniverseIcon className="h-4 w-4 text-[#FDB813]" />
                  <span>Universo *</span>
                </label>
                <select
                  name="universe"
                  value={formData.universe}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                >
                  {universes.map(universe => (
                    <option key={universe.value} value={universe.value} className="bg-[#4a0001]">
                      {universe.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Oferta y Imagen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="isOnSale"
                        checked={formData.isOnSale}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full ${formData.isOnSale ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.isOnSale ? 'transform translate-x-6' : 'transform translate-x-1'}`}></div>
                      </div>
                    </div>
                    <span className="text-white font-cinzel text-sm">En Oferta</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <ImageIcon className="h-4 w-4 text-[#FDB813]" />
                    <span>URL de la Imagen</span>
                  </label>
                  <input
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha - Vista previa */}
            <div>
              <h3 className="text-lg font-cinzel font-bold text-[#FDB813] mb-4">
                Vista Previa
              </h3>
              <div className="bg-gradient-to-br from-[#4a0001]/50 to-[#740001]/50 rounded-lg p-4 border border-[#FDB813]/30">
                <img 
                  src={formData.image} 
                  alt="Vista previa" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <div className="flex items-center space-x-2 mb-2">
                  <UniverseIcon className={`h-4 w-4 ${
                    formData.universe === 'harry-potter' 
                      ? 'text-blue-400' 
                      : 'text-pink-400'
                  }`} />
                  <span className="text-xs font-cinzel text-white/70 capitalize">
                    {formData.universe === 'harry-potter' ? 'Harry Potter' : 'Otros Universos'}
                  </span>
                </div>
                <h4 className="font-cinzel font-bold text-[#FDB813] text-lg">
                  {formData.name || 'Nombre del Producto'}
                </h4>
                <p className="text-white/80 text-sm mt-2 line-clamp-2">
                  {formData.description || 'Descripción del producto'}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <span className="text-xl font-bold text-white">${formData.price.toFixed(2)}</span>
                    {formData.originalPrice && (
                      <span className="text-white/50 line-through text-sm ml-2">
                        ${formData.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {formData.isOnSale && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                      EN OFERTA
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="px-2 py-1 bg-white/10 text-white/90 text-xs rounded-full capitalize">
                    {categories.find(c => c.value === formData.category)?.label || formData.category}
                  </span>
                </div>
              </div>

              {/* Consejos para edición */}
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-[#FDB813]/20">
                <h4 className="text-white font-cinzel font-bold mb-2 text-sm">Consejos para editar:</h4>
                <ul className="text-white/70 text-xs space-y-1">
                  <li>Verifica que todos los campos obligatorios estén completos (*)</li>
                  <li>Actualiza la imagen si es necesario</li>
                  <li>Revisa que los precios sean correctos</li>
                  <li>Marca "En Oferta" solo si hay descuento real</li>
                  <li>Guarda los cambios al finalizar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-white/20">
            <button
              onClick={handleCancel}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-cinzel text-sm"
            >
              <X className="h-4 w-4" />
              <span>Cancelar</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold text-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-[#4a0001] border-t-transparent rounded-full"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 text-center text-white/50 text-xs font-cinzel">
          <p>
            Los cambios se aplicarán inmediatamente en la tienda.
            <br />
            <span className="text-[#FDB813]">Producto ID: {id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}