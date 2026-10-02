import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, LazyMotion, MotionConfig } from 'framer-motion';
import { PageTransition } from '@/shared/components/PageTransition';
import { AuthProvider } from '@/features/auth/services/AuthProvider';
import { Navbar } from '@/shared/components/Navbar';
import { BrandMark } from '@/shared/components/BrandMark';
import { Footer } from '@/shared/components/Footer';
import { Home } from '@/features/catalog/pages/Home';
import { ProtectedRoute } from './ProtectedRoute';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { routeMetadata } from '../../shared/seo';

const Contact = lazy(() => import('@/features/content/pages/Contact').then(module => ({ default: module.Contact })));
const ProductDetail = lazy(() => import('@/features/catalog/pages/ProductDetail').then(module => ({ default: module.ProductDetail })));
const OtherUniverses = lazy(() => import('@/features/catalog/pages/OtherUniverses').then(module => ({ default: module.OtherUniverses })));
const Login = lazy(() => import('@/features/auth/pages/Login').then(module => ({ default: module.Login })));
const AdminUsers = lazy(() => import('@/features/admin-users/pages/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminDashboard = lazy(() => import('@/features/admin-products/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Profile = lazy(() => import('@/features/auth/pages/Profile').then(module => ({ default: module.Profile })));
const EditProduct = lazy(() => import('@/features/admin-products/pages/EditProduct').then(module => ({ default: module.EditProduct })));
const AddProduct = lazy(() => import('@/features/admin-products/pages/AddProduct').then(module => ({ default: module.AddProduct })));
const Cart = lazy(() => import('@/features/cart/pages/Cart').then(module => ({ default: module.Cart })));
const Privacy = lazy(() => import('@/features/content/pages/Privacy').then(module => ({ default: module.Privacy })));
const Terms = lazy(() => import('@/features/content/pages/Terms').then(module => ({ default: module.Terms })));
const loadMotion = () => import('@/shared/lib/motionFeatures').then(module => module.default);

function NotFound() {
  return <section className="min-h-screen bg-[#4a0001] px-4 py-20 text-center text-white">
    <h1 className="mb-4 font-cinzel text-4xl font-bold text-[#FDB813]">404</h1>
    <p className="font-cinzel text-xl">Página no encontrada</p>
    <Link to="/" className="mt-6 inline-block rounded-lg bg-[#FDB813] px-6 py-3 font-cinzel font-bold text-[#4a0001]">Volver al inicio</Link>
  </section>;
}

function RouteMetadata() {
  const { pathname } = useLocation();
  usePageMetadata(routeMetadata(pathname));
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return <Suspense fallback={<div className="page-loading" role="status"><BrandMark/><p>Cargando…</p></div>}>
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}><Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/otros-universos" element={<OtherUniverses />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cart" element={<Cart />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/usuarios" element={<AdminUsers />} />
          <Route path="/products/new" element={<AddProduct />} />
          <Route path="/products/edit" element={<EditProduct />} />
          <Route path="/products/edit/:id" element={<EditProduct />} />
          <Route path="/admin/edit-product/:id" element={<EditProduct />} />
          <Route path="/admin/add-product" element={<AddProduct />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes></PageTransition>
    </AnimatePresence>
  </Suspense>;
}

export default function App() {
  return <BrowserRouter>
    <MotionConfig reducedMotion="user"><LazyMotion features={loadMotion} strict><AuthProvider>
      <div className="flex min-h-screen flex-col">
        <a className="skip-link" href="#main-content">Saltar al contenido</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-grow"><RouteMetadata /><AnimatedRoutes /></main>
        <Footer />
      </div>
    </AuthProvider></LazyMotion></MotionConfig>
  </BrowserRouter>;
}
