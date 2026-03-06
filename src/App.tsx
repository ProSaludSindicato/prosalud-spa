
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from '@/components/utils/ScrollToTop';
import SetPageTitle from '@/components/utils/SetPageTitle';
import { Analytics } from '@vercel/analytics/react';

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
import DefinePasswordPage from '@/pages/DefinePasswordPage';

// Admin Pages
import AdminDashboard from '@/pages/AdminDashboard';
import AdminUsuariosPage from '@/pages/AdminUsuariosPage';
import AdminRolesPage from '@/pages/AdminRolesPage';
import AdminRolesListPage from '@/pages/AdminRolesListPage';
import AdminRoleDetailPage from '@/pages/AdminRoleDetailPage';
import AdminRoleEditPage from '@/pages/AdminRoleEditPage';
import AdminSolicitudesPage from '@/pages/AdminSolicitudesPage';
import AdminSolicitudBienestarPage from '@/pages/AdminSolicitudBienestarPage';
import AdminRegistrarEntregaBienestarPage from '@/pages/AdminRegistrarEntregaBienestarPage';
import AdminInventarioPage from '@/pages/AdminInventarioPage';
import AdminBienestarPage from '@/pages/AdminBienestarPage';
import AdminComfenalcoPage from '@/pages/AdminComfenalcoPage';
import AdminChatbotPage from '@/pages/AdminChatbotPage';
import AdminVotacionesPage from '@/pages/AdminVotacionesPage';
import AdminSstPage from '@/pages/AdminSstPage';
import AdminEncuestasSociodemograficasPage from '@/pages/AdminEncuestasSociodemograficasPage';
import AdminDocumentSigningPage from '@/pages/AdminDocumentSigningPage';

// Service Pages
import SolicitudCertificadoConvenioPage from '@/pages/SolicitudCertificadoConvenioPage';
import SolicitudDescansoLaboralPage from '@/pages/SolicitudDescansoLaboralPage';
import SolicitudAnualDiferidaPage from '@/pages/SolicitudAnualDiferidaPage';
import VerificacionPagosPage from '@/pages/VerificacionPagosPage';
import CertificadoSeguridadSocialPage from '@/pages/CertificadoSeguridadSocialPage';
import ActualizarDatosPersonalesPage from '@/pages/ActualizarDatosPersonalesPage';
import IncapacidadesLicenciasPage from '@/pages/IncapacidadesLicenciasPage';
import SstPage from '@/pages/SstPage';
import GaleriaBienestarPage from '@/pages/GaleriaBienestarPage';
import SolicitudPermisosCambioTurnosPage from '@/pages/SolicitudPermisosCambioTurnosPage';
import SolicitudMicrocreditoPage from '@/pages/SolicitudMicrocreditoPage';
import SolicitudRetiroSindicalPage from '@/pages/SolicitudRetiroSindicalPage';
import EventoDetallePage from '@/pages/EventoDetallePage';
import AfiliacionComfenalcoPage from '@/pages/AfiliacionComfenalcoPage';
import EncuestaBienestarPage from '@/pages/EncuestaBienestarPage';
import EncuestaVacunacionPage from '@/pages/EncuestaVacunacionPage';
import EntregasBienestarPage from '@/pages/EntregasBienestarPage';

// Legal Pages
import EstatutosBeneficiosPage from '@/pages/EstatutosBeneficiosPage';
import ContratoSindicalPage from '@/pages/ContratoSindicalPage';
import EpsSuraPage from '@/pages/EpsSuraPage';
import AccesoDirectoMovilPage from '@/pages/AccesoDirectoMovilPage';
import './App.css';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import { useApiErrorHandler } from '@/hooks/useApiErrorHandler';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes = () => {
  useApiErrorHandler();
  
  return (
    <>
      <ScrollToTop />
      <SetPageTitle />
      <div className="App">
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/portal" element={<Navigate to="/" replace />} />
            <Route path="/portal/" element={<Navigate to="/" replace />} />
            <Route path="/nosotros" element={<QuienesSomos />} />
            <Route path="/nosotros/estatutos" element={<EstatutosBeneficiosPage />} />
            <Route path="/nosotros/contrato-sindical" element={<ContratoSindicalPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/ayuda/acceso-directo-movil" element={<AccesoDirectoMovilPage />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/restablecer-contraseña" element={<ResetPasswordPage />} />
            <Route path="/auth/definir-contraseña" element={<DefinePasswordPage />} />

            {/* Service Routes */}
            <Route path="/servicios/certificado-convenio" element={<SolicitudCertificadoConvenioPage />} />
            <Route path="/servicios/compensacion-descanso" element={<SolicitudDescansoLaboralPage />} />
            <Route path="/servicios/descanso-sindical" element={<SolicitudDescansoLaboralPage />} /> {/* Redirect antigua URL */}
            <Route path="/servicios/compensacion-anual" element={<SolicitudAnualDiferidaPage />} />
            <Route path="/servicios/consulta-pagos" element={<VerificacionPagosPage />} />
            <Route path="/servicios/certificado-seguridad-social" element={<CertificadoSeguridadSocialPage />} />
            <Route path="/servicios/actualizar-datos-personales" element={<ActualizarDatosPersonalesPage />} />
            <Route path="/servicios/actualizar-cuenta" element={<ActualizarDatosPersonalesPage />} /> {/* Redirect legacy URL */}
            <Route path="/servicios/incapacidades-licencias" element={<IncapacidadesLicenciasPage />} />
            <Route path="/servicios/incapacidad-maternidad" element={<Navigate to="/servicios/incapacidades-licencias" replace />} /> {/* Redirect legacy URL */}
            <Route path="/servicios/sst" element={<SstPage />} />
            <Route path="/servicios/encuesta-sociodemografica" element={<EncuestaBienestarPage />} />
            <Route path="/servicios/encuesta-bienestar" element={<EncuestaBienestarPage />} /> {/* Ruta legacy, misma página */}
            <Route path="/encuesta-vacunacion" element={<EncuestaVacunacionPage />} />
            <Route path="/servicios/galeria-bienestar" element={<GaleriaBienestarPage />} />
            <Route path="/servicios/galeria-bienestar/:eventId" element={<EventoDetallePage />} />
            <Route path="/servicios/permisos-turnos" element={<SolicitudPermisosCambioTurnosPage />} />
            <Route path="/servicios/microcredito" element={<SolicitudMicrocreditoPage />} />
            <Route path="/servicios/retiro-sindical" element={<SolicitudRetiroSindicalPage />} />
            <Route path="/servicios/afiliacion-comfenalco" element={<AfiliacionComfenalcoPage />} />
            <Route path="/servicios/eps-sura" element={<EpsSuraPage />} />
            <Route path="/entregas-bienestar" element={<EntregasBienestarPage />} />
            <Route path="/kit-bienestar-escolar" element={<Navigate to="/entregas-bienestar" replace />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            
            <Route 
              path="/admin/usuarios" 
              element={
                <ProtectedRoute requiredPermissions={['users.view']}>
                  <AdminUsuariosPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/roles" 
              element={
                <ProtectedRoute requiredPermissions={['roles.manage']}>
                  <AdminRolesListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/roles/:id" 
              element={
                <ProtectedRoute requiredPermissions={['roles.manage']}>
                  <AdminRoleDetailPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/roles/:id/edit" 
              element={
                <ProtectedRoute requiredPermissions={['roles.manage']}>
                  <AdminRoleEditPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/roles/new" 
              element={
                <ProtectedRoute requiredPermissions={['roles.manage']}>
                  <AdminRolesPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/solicitudes" 
              element={
                <ProtectedRoute requiredPermissions={['requests.view']}>
                  <AdminSolicitudesPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/solicitudes-bienestar" 
              element={
                <ProtectedRoute requiredPermissions={['wellness_requests.view', 'wellness_delivery.view', 'wellness_delivery.manage']}>
                  <AdminSolicitudBienestarPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/entregas-bienestar/registrar" 
              element={
                <ProtectedRoute requiredPermissions={['wellness_delivery.manage']}>
                  <AdminRegistrarEntregaBienestarPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/inventario" 
              element={
                <ProtectedRoute requiredPermissions={['inventory.view_dashboard', 'inventory.categories.view', 'inventory.products.view', 'inventory.entries.view', 'inventory.locations.view', 'inventory.stock_movements.view', 'hospital_requests.view']}>
                  <AdminInventarioPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/bienestar" 
              element={
                <ProtectedRoute requiredPermissions={['wellness_events.view']}>
                  <AdminBienestarPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/comfenalco" 
              element={
                <ProtectedRoute requiredPermissions={['comfenalco_events.view']}>
                  <AdminComfenalcoPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/chatbot" 
              element={
                <ProtectedRoute requiredPermissions={['chatbot.manage']}>
                  <AdminChatbotPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/votaciones" 
              element={
                <ProtectedRoute requiredPermissions={['votes.statistics.view', 'votes.audit.view']}>
                  <AdminVotacionesPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/dotacion-epp" 
              element={
                <ProtectedRoute requiredPermissions={['dotacion.view']}>
                  <AdminSstPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/encuestas-sociodemograficas" 
              element={
                <ProtectedRoute requiredPermissions={['socio_demographic_surveys.view']}>
                  <AdminEncuestasSociodemograficasPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/encuestas-sociodemograficas/:id" 
              element={
                <ProtectedRoute requiredPermissions={['socio_demographic_surveys.view']}>
                  <AdminEncuestasSociodemograficasPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/firma-convenios" 
              element={
                <ProtectedRoute requiredPermissions={['document_signing.view', 'document_signing.manage']}>
                  <AdminDocumentSigningPage />
                </ProtectedRoute>
              } 
            />

            {/* 404 Route - TEMPORAL: Redirige a inicio en vez de mostrar 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toaster />
    </>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppRoutes />
      </Router>
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
