import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, GraduationCap, Handshake, FileText, BarChart3, Settings, Heart, 
  Menu, X, LogOut, Home, ChevronRight, ClipboardList, Package, MessageSquare, Vote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import UserProfileDropdown from './UserProfileDropdown';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Roles y Permisos', href: '/admin/roles', icon: Settings },
    { name: 'Inventario', href: '/admin/inventario', icon: Package },
    { name: 'Solicitudes', href: '/admin/solicitudes', icon: ClipboardList },
    { name: 'Galería Bienestar', href: '/admin/bienestar', icon: Heart },
    { name: 'Experiencias Comfenalco', href: '/admin/comfenalco', icon: GraduationCap },
    { name: 'Chatbot', href: '/admin/chatbot', icon: MessageSquare },
    { name: 'Votaciones Asamblea', href: '/admin/votaciones', icon: Vote },
  ];

  const handleLogout = () => {
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente.",
      variant: "default"
    });
    navigate('/login');
  };

  const sidebarVariants = {
    closed: { x: '-100%' },
    open: { x: 0 }
  };

  const overlayVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Fixed on desktop, sliding on mobile */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <div className="flex flex-col flex-1 bg-white shadow-xl">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center px-6 border-b border-slate-200">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/images/logo_prosalud.webp"
                alt="ProSalud"
                className="h-8 w-auto"
              />
              { /* <span className="font-bold text-primary-prosalud">Admin</span> */ }
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-prosalud to-primary-prosalud-dark text-white shadow-lg'
                      : 'text-slate-600 hover:text-primary-prosalud hover:bg-primary-prosalud-light/10'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-prosalud'
                    }`}
                  />
                  {item.name}
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4 text-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 space-y-2">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-prosalud rounded-xl hover:bg-primary-prosalud-light/10 transition-all duration-200"
            >
              <Home className="mr-3 h-5 w-5" />
              Volver al Sitio
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial={false}
        animate={sidebarOpen ? 'open' : 'closed'}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl lg:hidden"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/images/logo_prosalud.webp"
                alt="ProSalud"
                className="h-8 w-auto"
              />
              <span className="font-bold text-primary-prosalud">Admin</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-prosalud to-primary-prosalud-dark text-white shadow-lg'
                      : 'text-slate-600 hover:text-primary-prosalud hover:bg-primary-prosalud-light/10'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-prosalud'
                    }`}
                  />
                  {item.name}
                  {isActive && (
                    <ChevronRight className="ml-auto h-4 w-4 text-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 space-y-2">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-prosalud rounded-xl hover:bg-primary-prosalud-light/10 transition-all duration-200"
            >
              <Home className="mr-3 h-5 w-5" />
              Volver al Sitio
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="flex-1 lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <Home className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-primary-prosalud">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-4">
                <div className="text-sm text-slate-600">
                  Bienvenido <span className="font-medium text-primary-prosalud">{user?.name || 'Administrador'}</span>
                </div>
              </div>
              <UserProfileDropdown 
                userEmail={user?.email} 
                userName={user?.name} 
              />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
