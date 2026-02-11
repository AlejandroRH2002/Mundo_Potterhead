import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Key,
  Eye,
  EyeOff,
  ShoppingBag,
  Star,
  DollarSign
} from 'lucide-react';

// Definir el tipo aquí mismo (no importar de sí mismo)
interface UserProfile {
  id: string;
  email: string;
  name: string;
  type: 'admin' | 'user';
  phone?: string;
  address?: string;
  joinDate: string;
  orders: number;
  totalSpent: number;
  favoriteCategory?: string;
}

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; } | null>(null);

  // Cargar datos del usuario - VERSIÓN SIMPLIFICADA
  useEffect(() => {
    const session = localStorage.getItem('potterhead_session');
    
    if (!session) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(session);
      
      // Crear datos básicos del perfil
      const profileData: UserProfile = {
        id: userData.id || '1',
        email: userData.email || 'usuario@ejemplo.com',
        name: userData.name || 'Usuario',
        type: userData.type || 'user',
        phone: userData.phone || '+51 987 654 321',
        address: userData.address || 'Calle Mágica 123, Diagon Alley',
        joinDate: userData.timestamp ? new Date(userData.timestamp).toISOString().split('T')[0] : '2023-10-15',
        orders: 7,
        totalSpent: 2850.75,
        favoriteCategory: userData.type === 'admin' ? undefined : 'accessories'
      };

      setUser(profileData);
      setFormData({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone || '',
        address: profileData.address || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Validaciones básicas
      if (!formData.name.trim()) {
        throw new Error('El nombre es obligatorio');
      }

      if (!formData.email.includes('@')) {
        throw new Error('Email inválido');
      }

      // Si se está cambiando la contraseña
      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
        }

        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
      }

      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar datos en localStorage
      const session = localStorage.getItem('potterhead_session');
      if (session) {
        const sessionData = JSON.parse(session);
        const updatedSession = {
          ...sessionData,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        };
        localStorage.setItem('potterhead_session', JSON.stringify(updatedSession));
      }

      // Actualizar estado local
      if (user) {
        const updatedUser = {
          ...user,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        };
        setUser(updatedUser);
      }

      setIsEditing(false);
      
      setMessage({
        type: 'success',
        text: 'Perfil actualizado exitosamente'
      });

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Error al guardar los cambios'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24">
        <div className="content-wrapper">
          <div className="text-center py-20">
            <div className="animate-spin inline-block w-12 h-12 border-3 border-[#FDB813] border-t-transparent rounded-full"></div>
            <p className="text-white mt-4 font-cinzel">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estadísticas simplificadas
  const stats = [
    { icon: ShoppingBag, label: 'Órdenes', value: user.orders, color: 'from-blue-600 to-cyan-500' },
    { icon: DollarSign, label: 'Total Gastado', value: `$${user.totalSpent.toFixed(2)}`, color: 'from-green-600 to-emerald-500' },
    { icon: Calendar, label: 'Miembro desde', value: user.joinDate, color: 'from-purple-600 to-pink-500' },
    { icon: Star, label: 'Categoría Favorita', value: user.favoriteCategory || 'N/A', color: 'from-yellow-600 to-orange-500' },
  ];

  return (
    <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24 pb-12">
      <div className="content-wrapper max-w-7xl mx-auto px-4">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-cinzel font-bold text-[#FDB813]">
              Mi Perfil Mágico
            </h1>
            <p className="text-white/80 font-crimson mt-1">
              Gestiona tu información y preferencias
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold text-sm sm:text-base"
            >
              <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Editar Perfil</span>
            </button>
          )}
        </div>

        {/* Mensajes */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-cinzel ${message.type === 'success'
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Información personal */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#FDB813]/30">
              <h2 className="text-xl font-cinzel font-bold text-[#FDB813] mb-6 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </h2>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <User className="h-4 w-4 text-[#FDB813]" />
                    <span>Nombre Completo</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-cinzel text-sm">{user.name}</p>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <Mail className="h-4 w-4 text-[#FDB813]" />
                    <span>Correo Electrónico</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-cinzel text-sm">{user.email}</p>
                    </div>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <Phone className="h-4 w-4 text-[#FDB813]" />
                    <span>Teléfono</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                      placeholder="+51 987 654 321"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-cinzel text-sm">{user.phone || 'No especificado'}</p>
                    </div>
                  )}
                </div>

                {/* Dirección */}
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <MapPin className="h-4 w-4 text-[#FDB813]" />
                    <span>Dirección</span>
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                      placeholder="Ingresa tu dirección completa"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-cinzel text-sm">{user.address || 'No especificada'}</p>
                    </div>
                  )}
                </div>

                {/* Tipo de cuenta */}
                <div>
                  <label className="flex items-center space-x-2 text-white font-cinzel mb-2 text-sm">
                    <Shield className="h-4 w-4 text-[#FDB813]" />
                    <span>Tipo de Cuenta</span>
                  </label>
                  <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full font-cinzel font-bold text-xs ${user.type === 'admin'
                          ? 'bg-purple-700 text-purple-100'
                          : 'bg-blue-700 text-blue-100'}`}>
                        {user.type === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                      <span className="ml-2 text-white/70 text-xs">
                        {user.type === 'admin'
                          ? 'Acceso completo al sistema'
                          : 'Cuenta de comprador'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cambiar contraseña (solo en modo edición) */}
                {isEditing && (
                  <div className="pt-4 border-t border-white/20">
                    <h3 className="text-lg font-cinzel font-bold text-[#FDB813] mb-3 flex items-center">
                      <Key className="h-4 w-4 mr-2" />
                      Cambiar Contraseña
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-white font-cinzel mb-1 text-sm">
                          Contraseña Actual
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm pr-10"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2 text-[#FDB813]"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white font-cinzel mb-1 text-sm">
                            Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                            placeholder="Mínimo 6 caracteres"
                          />
                        </div>

                        <div>
                          <label className="block text-white font-cinzel mb-1 text-sm">
                            Confirmar Contraseña
                          </label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white/10 border border-[#FDB813]/30 rounded-lg text-white font-cinzel focus:outline-none focus:ring-1 focus:ring-[#FDB813] text-sm"
                            placeholder="Repite la nueva contraseña"
                          />
                        </div>
                      </div>

                      <p className="text-white/60 text-xs">
                        Deja los campos de contraseña vacíos si no deseas cambiarla
                      </p>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-cinzel text-sm"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg hover:from-[#FFD700] hover:to-[#FDB813] transition-all font-cinzel font-bold text-sm disabled:opacity-50"
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
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha - Estadísticas y Sidebar */}
          <div className="space-y-6">
            {/* Tarjeta de usuario */}
            <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#FDB813]/30">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-[#FDB813] to-[#FFD700] p-1">
                  <div className="w-full h-full rounded-full bg-[#4a0001] flex items-center justify-center">
                    <span className="text-2xl font-cinzel font-bold text-[#FDB813]">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-cinzel font-bold text-white">{user.name}</h3>
                <p className="text-white/70 text-sm truncate">{user.email}</p>
                <div className="mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-cinzel ${user.type === 'admin'
                      ? 'bg-purple-700 text-purple-100'
                      : 'bg-blue-700 text-blue-100'}`}>
                    {user.type === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#FDB813]/30">
              <h3 className="text-lg font-cinzel font-bold text-[#FDB813] mb-3">
                Mis Estadísticas
              </h3>
              <div className="space-y-3">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-r ${stat.color}`}>
                        <stat.icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-white font-cinzel text-sm">{stat.label}</span>
                    </div>
                    <span className="font-bold text-[#FDB813] text-sm">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#FDB813]/30">
              <h3 className="text-lg font-cinzel font-bold text-[#FDB813] mb-3">
                Acciones Rápidas
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="h-4 w-4 text-[#FDB813]" />
                    <span className="text-white font-cinzel text-sm">Ver Tienda</span>
                  </div>
                  <span className="text-white/50 group-hover:text-white text-sm">→</span>
                </button>

                {user.type === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-[#FDB813]" />
                      <span className="text-white font-cinzel text-sm">Panel Admin</span>
                    </div>
                    <span className="text-white/50 group-hover:text-white text-sm">→</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    localStorage.removeItem('potterhead_session');
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center justify-between p-2 bg-red-800/20 hover:bg-red-800/30 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-red-300 font-cinzel text-sm">Cerrar Sesión</span>
                  </div>
                  <span className="text-red-400/50 group-hover:text-red-400 text-sm">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 text-center text-white/50 text-xs font-cinzel">
          <p>Mundo Potterhead • Perfil de usuario • {new Date().toLocaleDateString('es-PE')}</p>
        </div>
      </div>
    </div>
  );
}