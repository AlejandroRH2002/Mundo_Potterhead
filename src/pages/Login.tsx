import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Home, User, Wand2 } from 'lucide-react';

// Usuarios de demostración
const DEMO_USERS = [
  { email: 'admin@potterhead.com', password: 'admin123', name: 'Admin', type: 'admin' },
  { email: 'usuario@ejemplo.com', password: 'user123', name: 'Usuario', type: 'user' },
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      try {
        if (!email || !password) {
          throw new Error('Por favor completa todos los campos');
        }

        const user = DEMO_USERS.find(u => 
          u.email === email && u.password === password
        );

        if (!user) {
          throw new Error('Credenciales incorrectas');
        }

        // Guardar sesión
        const sessionData = {
          ...user,
          loggedIn: true,
          timestamp: Date.now()
        };
        localStorage.setItem('potterhead_session', JSON.stringify(sessionData));
        
        // Redirigir y recargar para actualizar navbar
        navigate('/');
        setTimeout(() => window.location.reload(), 100);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleDemoLogin = (type: 'admin' | 'user') => {
    const demoUser = DEMO_USERS.find(u => u.type === type);
    if (demoUser) {
      setEmail(demoUser.email);
      setPassword(demoUser.password);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24">
      <div className="content-wrapper">
        <div className="max-w-md mx-auto px-4">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-[#FDB813] hover:text-[#FFD700] font-cinzel">
              <Home className="h-5 w-5 mr-2" />
              Volver al inicio
            </Link>
          </div>

          <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-[#FDB813]/30 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#4a0001] to-[#740001] rounded-full mb-4 border-2 border-[#FDB813]/50">
                <Wand2 className="h-10 w-10 text-[#FDB813]" />
              </div>
              <h1 className="text-3xl font-cinzel font-bold text-[#FDB813] mb-2">
                Acceso Mágico
              </h1>
              <p className="text-white/80">Ingresa a tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2 font-cinzel">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-[#FDB813]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white/10 border border-[#FDB813]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDB813] text-white placeholder-white/50 font-cinzel"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2 font-cinzel">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-[#FDB813]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white/10 border border-[#FDB813]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FDB813] text-white placeholder-white/50 font-cinzel"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#FDB813]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 text-red-300 px-4 py-3 rounded-lg font-cinzel">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg font-cinzel font-bold hover:opacity-90 transition-opacity"
                >
                  {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('user')}
                    className="py-2 bg-gray-700 text-white rounded-lg font-cinzel hover:bg-gray-600"
                  >
                    Usuario Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin')}
                    className="py-2 bg-purple-700 text-white rounded-lg font-cinzel hover:bg-purple-600"
                  >
                    Admin Demo
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 text-center text-white/70 font-cinzel">
              <p>¿No tienes cuenta? <Link to="/register" className="text-[#FDB813] hover:underline">Regístrate</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}