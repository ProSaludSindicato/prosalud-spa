
import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Heart, BarChart3, Handshake, Settings, Edit, Upload, Download, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/admin/AdminLayout';
import MetricsCards from '@/components/admin/MetricsCards';
import UserFormModal from '@/components/admin/usuarios/UserFormModal';

import { configApi } from '@/services/adminApi';
import { adminExcelFilesService, type AdminExcelFileType } from '@/services/adminExcelFilesService';
import { toast } from 'sonner';

type DashboardUploadType = Extract<AdminExcelFileType, 'afiliados' | 'incapacidades' | 'liquidaciones'>;

interface DashboardUploadConfig {
  buttonLabel: string;
  uploadingLabel: string;
  dialogTitle: string;
  description: string;
  resourceLabel: string;
  storageName: string;
  maxSizeMB: number;
  successFallback: string;
  errorFallback: string;
  additionalNote?: string;
}

const dashboardUploadConfigs: Record<DashboardUploadType, DashboardUploadConfig> = {
  afiliados: {
    buttonLabel: 'Actualizar afiliados',
    uploadingLabel: 'Cargando afiliados...',
    dialogTitle: 'Confirmar actualización de afiliados',
    description:
      'Estás a punto de reemplazar el archivo maestro de afiliados. Esta acción sobrescribe el archivo anterior, no mantiene historial y los cambios se reflejan inmediatamente en la plataforma.',
    resourceLabel: 'afiliados',
    storageName: 'PROSANET_INFORMACION_AFILIADOS.xlsx',
    maxSizeMB: 20,
    successFallback: 'Archivo de afiliados actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de afiliados.',
    additionalNote: 'La cache de afiliados se limpiará automáticamente después de la carga.',
  },
  incapacidades: {
    buttonLabel: 'Actualizar incapacidades',
    uploadingLabel: 'Cargando incapacidades...',
    dialogTitle: 'Confirmar actualización de incapacidades',
    description:
      'Se reemplazará el archivo de relación de incapacidades. Asegúrate de que el archivo corresponda a la versión oficial antes de continuar.',
    resourceLabel: 'incapacidades',
    storageName: 'RELACION_INCAPACIDADES.xlsx',
    maxSizeMB: 5,
    successFallback: 'Archivo de incapacidades actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de incapacidades.',
  },
  liquidaciones: {
    buttonLabel: 'Actualizar liquidaciones pendientes',
    uploadingLabel: 'Cargando liquidaciones...',
    dialogTitle: 'Confirmar actualización de liquidaciones pendientes',
    description:
      'Se sustituirá el archivo de liquidaciones pendientes. Verifica que la estructura coincida con la plantilla esperada antes de subirlo.',
    resourceLabel: 'liquidaciones',
    storageName: 'LIQUIDACIONES_PENDIENTES.xlsx',
    maxSizeMB: 5,
    successFallback: 'Archivo de liquidaciones actualizado exitosamente.',
    errorFallback: 'No fue posible actualizar el archivo de liquidaciones.',
  },
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState([
    {
      title: "Usuarios Activos",
      value: "1.500",
      change: "+12%",
      icon: Users,
      color: "text-primary-prosalud"
    },
    {
      title: "Convenios Activos",
      value: "7",
      change: "+2",
      icon: Handshake,
      color: "text-secondary-prosaludgreen"
    },
    {
      title: "Eventos de Bienestar",
      value: "72",
      change: "+8",
      icon: Heart,
      color: "text-accent-prosaludteal"
    },
    {
      title: "Experiencias Comfenalco",
      value: "12",
      change: "+3",
      icon: GraduationCap,
      color: "text-orange-600"
    }
  ]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editChange, setEditChange] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUploadConfirmDialog, setShowUploadConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [uploadContext, setUploadContext] = useState<DashboardUploadType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<AdminExcelFileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['site-metrics'],
    queryFn: configApi.getMetrics
  });

  const handleEditStat = (index: number) => {
    setEditingIndex(index);
    setEditValue(stats[index].value);
    setEditChange(stats[index].change);
  };

  const handleSaveStat = () => {
    if (editingIndex !== null) {
      const newStats = [...stats];
      newStats[editingIndex] = {
        ...newStats[editingIndex],
        value: editValue,
        change: editChange
      };
      setStats(newStats);
      setEditingIndex(null);
      setEditValue("");
      setEditChange("");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const resetFileInput = ({ preserveContext = false }: { preserveContext?: boolean } = {}) => {
    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }
    setSelectedFileUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);

    if (!preserveContext) {
      setUploadContext(null);
    }
  };

  const handleUploadDialogChange = (open: boolean) => {
    setShowUploadConfirmDialog(open);

    if (!open && !isUploading) {
      resetFileInput();
    }
  };

  const handleUploadButtonClick = (type: DashboardUploadType) => {
    if (isUploading) return;

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
      setSelectedFileUrl(null);
    }
    setSelectedFile(null);
    setUploadContext(type);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!uploadContext) {
      toast.error('Selecciona una acción de carga antes de elegir un archivo.');
      resetFileInput();
      return;
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    const allowedExtensions = ['.xlsx', '.xls'];
    if (!allowedExtensions.includes(extension)) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls).');
      resetFileInput({ preserveContext: true });
      return;
    }

    const config = dashboardUploadConfigs[uploadContext];
    const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`);
      resetFileInput({ preserveContext: true });
      return;
    }

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }

    const fileUrl = URL.createObjectURL(file);
    setSelectedFileUrl(fileUrl);
    setSelectedFile(file);
    setShowUploadConfirmDialog(true);
  };

  const handleUploadCancel = () => {
    setShowUploadConfirmDialog(false);
    resetFileInput();
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile || !uploadContext) return;

    const type = uploadContext;
    const config = dashboardUploadConfigs[type];

    setIsUploading(true);
    setUploadingType(type);
    setShowUploadConfirmDialog(false);

    try {
      const response = await adminExcelFilesService.uploadExcelFile(type, selectedFile);

      if (response.success) {
        toast.success(response.message || config.successFallback);
      } else {
        toast.error(response.message || config.errorFallback);
      }
    } catch (error: any) {
      const backendMessage: string | undefined = error?.response?.data?.message;
      const statusCode: number | undefined = error?.response?.status;

      let errorMessage = backendMessage || config.errorFallback;

      if (statusCode === 422) {
        const lowerMessage = backendMessage?.toLowerCase() ?? '';
        if (lowerMessage.includes('formato')) {
          errorMessage = 'El archivo debe ser un Excel válido (.xlsx o .xls).';
        } else if (lowerMessage.includes('tamaño') || lowerMessage.includes('tamano') || lowerMessage.includes('size')) {
          errorMessage = `El archivo supera el tamaño máximo permitido (${config.maxSizeMB} MB).`;
        } else if (lowerMessage.includes('vacío') || lowerMessage.includes('vacio')) {
          errorMessage = 'El archivo Excel parece estar vacío.';
        } else {
          errorMessage = backendMessage || `El archivo de ${config.resourceLabel} no es válido.`;
        }
      } else if (statusCode === 500) {
        errorMessage = backendMessage || 'El servidor reportó un error al guardar el archivo.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadingType(null);
      resetFileInput();
    }
  };

  const renderUploadButton = (type: DashboardUploadType) => {
    const config = dashboardUploadConfigs[type];
    const isTypeLoading = isUploading && uploadingType === type;

    return (
      <motion.button
        key={type}
        type="button"
        onClick={() => handleUploadButtonClick(type)}
        whileHover={{ scale: isUploading ? 1 : 1.02 }}
        whileTap={{ scale: isUploading ? 1 : 0.98 }}
        disabled={isUploading}
        className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
        <span className="font-medium text-text-dark">
          {isTypeLoading ? config.uploadingLabel : config.buttonLabel}
        </span>
      </motion.button>
    );
  };

  const activeUploadConfig = uploadContext ? dashboardUploadConfigs[uploadContext] : null;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border shadow-sm">
              <CardHeader className="pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                      <BarChart3 className="h-8 w-8 text-primary-prosalud" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-primary-prosalud">
                        Panel Administrativo
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Gestiona usuarios, contenidos y métricas de la plataforma ProSalud desde un solo lugar.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Settings className="h-6 w-6 text-primary-prosalud" />
                  <span>Acciones Rápidas</span>
                </CardTitle>
                <CardDescription>
                  Accede a las funciones más utilizadas del panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setShowUserModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                  >
                    <Users className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                    <span className="font-medium text-text-dark">Crear Usuario</span>
                  </motion.button>
                  
                  <motion.a
                    href="/admin/bienestar?action=create"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-300 border border-slate-200"
                  >
                    <Heart className="h-8 w-8 text-primary-prosalud flex-shrink-0" />
                    <span className="font-medium text-text-dark">Nuevo Evento</span>
                  </motion.a>
                  {renderUploadButton('afiliados')}
                  {renderUploadButton('incapacidades')}
                  {renderUploadButton('liquidaciones')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Metrics Section */}
          <motion.div variants={itemVariants}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Métricas Principales</h2>
              <p className="text-gray-600">Estadísticas principales de la organización</p>
            </div>
            {loadingMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : (
              <MetricsCards metrics={metrics || { yearsExperience: 0, affiliatesCount: 0, conventionsCount: 0 }} />
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Modals */}
      <UserFormModal
        open={showUserModal}
        onOpenChange={setShowUserModal}
      />

      <Dialog open={showUploadConfirmDialog} onOpenChange={handleUploadDialogChange}>
        <DialogContent
          overlayClassName="fixed inset-0 z-50 bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm dark:bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          className="sm:max-w-xl gap-6 bg-white"
        >
          {activeUploadConfig && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-900">
                  {activeUploadConfig.dialogTitle}
                </DialogTitle>
              </DialogHeader>
              <DialogDescription asChild>
                <div className="space-y-4 text-left">
                  <p className="text-sm text-muted-foreground leading-6">
                    {activeUploadConfig.description}
                  </p>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Archivo seleccionado</p>
                    <p className="text-sm text-slate-700">
                      {selectedFile?.name ?? 'Sin archivo'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Se almacenará como <span className="font-semibold">{activeUploadConfig.storageName}</span>.
                      Tamaño máximo permitido: {activeUploadConfig.maxSizeMB} MB.
                    </p>
                    {activeUploadConfig.additionalNote && (
                      <p className="text-xs text-slate-500 mt-1">{activeUploadConfig.additionalNote}</p>
                    )}
                    {selectedFile && selectedFileUrl && (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <a href={selectedFileUrl} download={selectedFile.name} className="flex items-center">
                          <Download className="mr-2 h-4 w-4" />
                          Descargar archivo seleccionado
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </DialogDescription>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleUploadCancel} disabled={isUploading}>
                  Cancelar
                </Button>
                <Button onClick={handleUploadConfirm} disabled={isUploading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isUploading ? 'Subiendo...' : 'Confirmar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
};

export default AdminDashboard;
