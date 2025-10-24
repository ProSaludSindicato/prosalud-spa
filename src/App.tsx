
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/utils/ScrollToTop';

// Pages
import Index from '@/pages/Index';
import QuienesSomos from '@/pages/QuienesSomos';
import ContactoPage from '@/pages/ContactoPage';
import NotFound from '@/pages/NotFound';
import FAQPage from '@/pages/FAQPage';

// Auth Pages
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

// Admin Pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminUsuariosPage from '@/pages/AdminUsuariosPage';
import AdminRolesPage from '@/pages/AdminRolesPage';
import AdminSolicitudesPage from '@/pages/AdminSolicitudesPage';
import AdminInventarioPage from '@/pages/AdminInventarioPage';
import AdminBienestarPage from '@/pages/AdminBienestarPage';
import AdminComfenalcoPage from '@/pages/AdminComfenalcoPage';
import AdminChatbotPage from '@/pages/AdminChatbotPage';

// Service Pages
import SolicitudCertificadoConvenioPage from '@/pages/SolicitudCertificadoConvenioPage';
import SolicitudDescansoLaboralPage from '@/pages/SolicitudDescansoLaboralPage';
import SolicitudAnualDiferidaPage from '@/pages/SolicitudAnualDiferidaPage';
import VerificacionPagosPage from '@/pages/VerificacionPagosPage';
import CertificadoSeguridadSocialPage from '@/pages/CertificadoSeguridadSocialPage';
import ActualizarCuentaBancariaPage from '@/pages/ActualizarCuentaBancariaPage';
import IncapacidadesLicenciasPage from '@/pages/IncapacidadesLicenciasPage';
import SstPage from '@/pages/SstPage';
import GaleriaBienestarPage from '@/pages/GaleriaBienestarPage';
import SolicitudPermisosCambioTurnosPage from '@/pages/SolicitudPermisosCambioTurnosPage';
import SolicitudMicrocreditoPage from '@/pages/SolicitudMicrocreditoPage';
import SolicitudRetiroSindicalPage from '@/pages/SolicitudRetiroSindicalPage';
import EventoDetallePage from '@/pages/EventoDetallePage';
import AfiliacionComfenalcoPage from '@/pages/AfiliacionComfenalcoPage';

// Legal Pages
import EstatutosBeneficiosPage from '@/pages/EstatutosBeneficiosPage';
import ContratoSindicalPage from '@/pages/ContratoSindicalPage';
import EpsSuraPage from '@/pages/EpsSuraPage';
import './App.css';
import ProtectedRoute from '@/components/admin/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ScrollToTop />
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/nosotros" element={<QuienesSomos />} />
            <Route path="/nosotros/estatutos" element={<EstatutosBeneficiosPage />} />
            <Route path="/nosotros/contrato-sindical" element={<ContratoSindicalPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Service Routes */}
            <Route path="/servicios/certificado-convenio" element={<SolicitudCertificadoConvenioPage />} />
            <Route path="/servicios/compensacion-descanso" element={<SolicitudDescansoLaboralPage />} />
            <Route path="/servicios/descanso-sindical" element={<SolicitudDescansoLaboralPage />} /> {/* Redirect antigua URL */}
            <Route path="/servicios/compensacion-anual" element={<SolicitudAnualDiferidaPage />} />
            <Route path="/servicios/consulta-pagos" element={<VerificacionPagosPage />} />
            <Route path="/servicios/certificado-seguridad-social" element={<CertificadoSeguridadSocialPage />} />
            <Route path="/servicios/actualizar-cuenta" element={<ActualizarCuentaBancariaPage />} />
            <Route path="/servicios/incapacidad-maternidad" element={<IncapacidadesLicenciasPage />} />
            <Route path="/servicios/sst" element={<SstPage />} />
            <Route path="/servicios/galeria-bienestar" element={<GaleriaBienestarPage />} />
            <Route path="/servicios/galeria-bienestar/:eventId" element={<EventoDetallePage />} />
            <Route path="/servicios/permisos-turnos" element={<SolicitudPermisosCambioTurnosPage />} />
            <Route path="/servicios/microcredito" element={<SolicitudMicrocreditoPage />} />
            <Route path="/servicios/retiro-sindical" element={<SolicitudRetiroSindicalPage />} />
            <Route path="/servicios/afiliacion-comfenalco" element={<AfiliacionComfenalcoPage />} />
            <Route path="/servicios/eps-sura" element={<EpsSuraPage />} />

            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
            <Route path="/admin/solicitudes" element={<AdminSolicitudesPage />} />
            <Route path="/admin/inventario" element={<AdminInventarioPage />} />
            <Route path="/admin/bienestar" element={<AdminBienestarPage />} />
            <Route path="/admin/comfenalco" element={<AdminComfenalcoPage />} />
            <Route path="/admin/chatbot" element={<AdminChatbotPage />} />

            {/* Admin Routes 
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsuariosPage /></ProtectedRoute>} />
            <Route path="/admin/solicitudes" element={<ProtectedRoute><AdminSolicitudesPage /></ProtectedRoute>} />
            <Route path="/admin/inventario" element={<ProtectedRoute><AdminInventarioPage /></ProtectedRoute>} />
            <Route path="/admin/bienestar" element={<ProtectedRoute><AdminBienestarPage /></ProtectedRoute>} />
            <Route path="/admin/comfenalco" element={<ProtectedRoute><AdminComfenalcoPage /></ProtectedRoute>} />
            */}

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
