import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Contact } from './pages/Contact';
import { ProductDetail } from './pages/ProductDetail';
import { OtherUniverses } from './pages/OtherUniverses';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { EditProduct } from './pages/EditProduct';
import { AddProduct } from './pages/AddProduct';
import { Cart } from './pages/Cart';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/otros-universos" element={<OtherUniverses />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<Cart />} /> {/* ← AÑADE ESTA LÍNEA */}
        
        {/* Rutas de usuario */}
        <Route path="/profile" element={<Profile />} />
        
        {/* Rutas de administración */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/edit-product/:id" element={<EditProduct />} />
        <Route path="/admin/add-product" element={<AddProduct />} />
        
        {/* Ruta 404 */}
        <Route path="*" element={
          <div className="bg-gradient-to-br from-[#4a0001] via-[#740001] to-[#4a0001] min-h-screen pt-24">
            <div className="content-wrapper">
              <div className="text-center py-20">
                <h1 className="text-4xl font-cinzel font-bold text-[#FDB813] mb-4">404</h1>
                <p className="text-white text-xl font-cinzel">Página no encontrada</p>
                <a href="/" className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-[#FDB813] to-[#FFD700] text-[#4a0001] rounded-lg font-cinzel font-bold hover:opacity-90 transition-opacity">
                  Volver al inicio
                </a>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-20">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;