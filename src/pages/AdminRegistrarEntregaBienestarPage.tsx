import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Search, FileCheck, Loader2, Calendar, CheckCircle2, XCircle, User, Building, Package, UserPlus, AlertCircle } from 'lucide-react';
import { SignaturePad, SignaturePadRef } from '@/components/admin/sst/SignaturePad';
import { entregasBienestarService } from '@/services/entregasBienestarService';
import { wellnessDeliveryService, type AffiliateLookupData, type AffiliateLookupFlatData, type AffiliateLookupTipoActivo } from '@/services/wellnessDeliveryService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SingleBeneficiaryResponse, MultipleBeneficiariesResponse } from '@/services/entregasBienestarService';
import { getHospitalDisplayName } from '@/utils/hospitalDisplayName';
import { logger } from '@/utils/logger';

const AdminRegistrarEntregaBienestarPage: React.FC = () => {
  const navigate = useNavigate();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  /** Tipos activos hoy (array); si length > 0 hay al menos una campaña */
  const [activeTypes, setActiveTypes] = useState<Array<{ id: number; nombre: string; modo_acceso?: string }>>([]);
  const [currentTypeLoading, setCurrentTypeLoading] = useState(true);
  const [noCampaignMessage, setNoCampaignMessage] = useState<string | null>(null);
  const [documento, setDocumento] = useState('');
  const [lookupData, setLookupData] = useState<AffiliateLookupData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  /** Tipo de entrega elegido cuando hay varios (desde tipos_activos del lookup) */
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignatureError, setShowSignatureError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState<{ tipo_entrega_text?: string; estado?: string; created_at?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setCurrentTypeLoading(true);
      setNoCampaignMessage(null);
      setActiveTypes([]);
      try {
        const res = await entregasBienestarService.getCurrentType();
        if (cancelled) return;
        const data = res.success && Array.isArray(res.data) ? res.data : null;
        if (!data || data.length === 0) {
          setNoCampaignMessage(res.message || 'No hay una campaña activa.');
        } else {
          setActiveTypes(data.map((t) => ({ id: t.id, nombre: t.nombre, modo_acceso: t.modo_acceso })));
        }
      } catch (e) {
        if (!cancelled) {
          logger.error('Error al obtener tipo activo', { error: e });
          setNoCampaignMessage('No se pudo verificar la campaña activa.');
        }
      } finally {
        if (!cancelled) setCurrentTypeLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  const handleSearch = async () => {
    const doc = documento.trim();
    if (!doc) {
      toast.error('Ingresa el número de documento');
      return;
    }
    setLookupError(null);
    setLookupData(null);
    setSelectedTypeId(null);
    setSignature(null);
    signaturePadRef.current?.clear();
    setIsSearching(true);
    try {
      const res = await wellnessDeliveryService.lookupAffiliateForDelivery(doc);
      if (res.success && res.data) {
        setLookupData(res.data);
        const flat = res.data as AffiliateLookupFlatData;
        const tipos = flat.tipos_activos ?? [];
        const tiposDisponibles = tipos.filter((t) => !t.tiene_solicitud);
        if (tiposDisponibles.length === 1) {
          setSelectedTypeId(tiposDisponibles[0].id);
        } else {
          setSelectedTypeId(null);
        }
        toast.success('Afiliado encontrado');
      } else {
        setLookupError(res.message || 'No se encontró el afiliado.');
        toast.error(res.message || 'No se encontró el afiliado.');
      }
    } catch (e) {
      logger.error('Error al buscar afiliado', { error: e });
      setLookupError('Error al buscar. Intenta de nuevo.');
      toast.error('Error al buscar');
    } finally {
      setIsSearching(false);
    }
  };

  /** Detecta respuesta plana del endpoint affiliate-lookup (nombre_afiliado en raíz) */
  const isFlatLookupData = (d: AffiliateLookupData): d is AffiliateLookupFlatData =>
    d != null && 'nombre_afiliado' in d && typeof (d as AffiliateLookupFlatData).nombre_afiliado === 'string';

  /** true si hay al menos un tipo activo sin solicitud para este documento; false = bloquear registro. Por defecto true si la API no envía el campo. */
  const puedeRegistrarOtroTipo = (): boolean => {
    if (!lookupData || !isFlatLookupData(lookupData)) return true;
    const flat = lookupData as AffiliateLookupFlatData;
    return flat.puede_registrar_otro_tipo !== false;
  };

  /** Mensaje de solicitud existente (solo cuando solicitud_existente es true). Mostrar como aviso si puede_registrar_otro_tipo, como bloqueo si no. */
  const getSolicitudExistenteMensaje = (): string | null => {
    if (!lookupData || !isFlatLookupData(lookupData)) return null;
    const flat = lookupData as AffiliateLookupFlatData;
    if (!flat.solicitud_existente) return null;
    if (flat.solicitud_existente_mensaje) return flat.solicitud_existente_mensaje;
    const tipoNombre = flat.tipo_entrega_nombre || 'este tipo de entrega';
    const estadoLabel = flat.solicitud_estado === 'entregado' ? 'entregada' : flat.solicitud_estado === 'pendiente' ? 'pendiente' : 'registrada';
    return `Ya existe una solicitud ${estadoLabel} para este documento y este tipo de entrega («${tipoNombre}»).`;
  };

  const getPayloadFromLookup = (): { nombre_afiliado: string; hospital: string; fecha_expedicion: string; beneficiarios: Array<{ beneficiario: string; parentesco?: string; edad?: string }> } | null => {
    if (!lookupData) return null;
    if (isFlatLookupData(lookupData)) {
      const f = lookupData as AffiliateLookupFlatData;
      return {
        nombre_afiliado: f.nombre_afiliado ?? '',
        hospital: f.hospital ?? '',
        fecha_expedicion: '', // El lookup por documento no incluye fecha de expedición
        beneficiarios: Array.isArray(f.beneficiarios) ? f.beneficiarios : [],
      };
    }
    if ('beneficiario' in lookupData) {
      const s = lookupData as SingleBeneficiaryResponse;
      return {
        nombre_afiliado: s.nombre ?? '',
        hospital: s.hospital ?? '',
        fecha_expedicion: s.fecha_expedicion ?? '',
        beneficiarios: [{ beneficiario: s.beneficiario ?? '', parentesco: s.parentesco, edad: s.edad }],
      };
    }
    const m = lookupData as MultipleBeneficiariesResponse;
    const afiliado = m?.afiliado;
    if (!afiliado) return null;
    return {
      nombre_afiliado: afiliado.nombre ?? '',
      hospital: afiliado.hospital ?? '',
      fecha_expedicion: afiliado.fecha_expedicion ?? '',
      beneficiarios: Array.isArray(m.beneficiarios) ? m.beneficiarios : [],
    };
  };

  /** Tipos activos del lookup (para selector y validación) */
  const tiposActivosFromLookup = (): AffiliateLookupTipoActivo[] => {
    if (!lookupData || !isFlatLookupData(lookupData)) return [];
    return (lookupData as AffiliateLookupFlatData).tipos_activos ?? [];
  };

  const handleSubmit = async () => {
    if (!puedeRegistrarOtroTipo()) {
      toast.error(getSolicitudExistenteMensaje() || 'Este documento no puede registrar más entregas en este momento.');
      return;
    }

    const tipos = tiposActivosFromLookup();
    const typeId = selectedTypeId ?? (tipos.length === 1 ? tipos[0].id : null);
    if (tipos.length === 0) {
      toast.error('No hay tipos de entrega activos para esta fecha.');
      return;
    }
    if (tipos.length > 1 && !typeId) {
      toast.error('Selecciona el tipo de entrega');
      return;
    }
    const selectedType = tipos.find((t) => t.id === typeId);
    if (selectedType?.tiene_solicitud) {
      toast.error('El tipo seleccionado ya tiene una solicitud para este documento. Elige otro tipo de la lista.');
      return;
    }

    if (!signature) {
      setShowSignatureError(true);
      toast.error('Registra la firma del afiliado');
      return;
    }
    const payload = getPayloadFromLookup();
    if (!payload || !documento.trim()) return;
    setShowSignatureError(false);
    setIsSubmitting(true);
    const tipoParaEnvio = tipos.find((t) => t.id === typeId);
    const isModoAbierto = tipoParaEnvio?.modo_acceso === 'abierto';
    try {
      if (isModoAbierto) {
        const response = await wellnessDeliveryService.submitOpenDelivery({
          documento_afiliado: documento.trim(),
          nombre_afiliado: payload.nombre_afiliado,
          hospital: payload.hospital || undefined,
          fecha_expedicion: payload.fecha_expedicion || undefined,
          beneficiarios: [],
          firma: signature,
          ...(typeId != null && { wellness_delivery_type_id: typeId }),
        });
        if (response.success && response.data) {
          setSuccessData({ tipo_entrega_text: response.data.tipo_entrega_text, estado: response.data.estado, created_at: response.data.created_at });
          setShowSuccessModal(true);
          setLookupData(null);
          setDocumento('');
          setSignature(null);
          signaturePadRef.current?.clear();
        } else {
          setErrorMessage(response.message || 'Error al registrar la entrega');
          setShowErrorModal(true);
        }
      } else {
        const response = await entregasBienestarService.submitInscription({
          documento_afiliado: documento.trim(),
          nombre_afiliado: payload.nombre_afiliado,
          hospital: payload.hospital || undefined,
          fecha_expedicion: payload.fecha_expedicion,
          beneficiarios: [],
          firma: signature,
          tipo_firma: 'digital',
          ...(typeId != null && { wellness_delivery_type_id: typeId }),
        });
        if (response.success && response.data) {
          setSuccessData({ tipo_entrega_text: response.data.tipo_entrega_text, estado: response.data.estado, created_at: response.data.created_at });
          setShowSuccessModal(true);
          setLookupData(null);
          setDocumento('');
          setSignature(null);
          signaturePadRef.current?.clear();
        } else {
          setErrorMessage(response.message || 'Error al registrar la solicitud');
          setShowErrorModal(true);
        }
      }
    } catch (e) {
      logger.error('Error al enviar solicitud', { error: e });
      setErrorMessage('Error al registrar. Intenta de nuevo.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewSearch = () => {
    setLookupData(null);
    setLookupError(null);
    setSelectedTypeId(null);
    setSignature(null);
    setShowSignatureError(false);
    signaturePadRef.current?.clear();
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const hasActiveCampaign = activeTypes.length > 0;

  return (
    <AdminLayout>
      <div className="container max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 min-w-0 w-full overflow-x-hidden box-border">
        <Button variant="ghost" onClick={() => navigate('/admin/solicitudes-bienestar')} className="mb-3 sm:mb-4 -ml-1 min-h-[44px] sm:min-h-0 touch-manipulation">
          <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">Volver a Bienestar</span>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 break-words">Registrar entrega</h1>
        <p className="text-slate-600 text-sm mb-4 break-words">
          Busca al afiliado por documento, verifica los datos y registra su firma para crear la solicitud de entrega.
        </p>
        {activeTypes.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="py-3 sm:py-4 px-4 sm:px-6 flex flex-wrap items-center gap-2">
              <Package className="h-5 w-5 text-primary shrink-0" />
              {activeTypes.length === 1 ? (
                <>
                  <span className="text-slate-600 font-medium text-sm sm:text-base shrink-0">Tipo de entrega:</span>
                  <span className="text-base sm:text-lg font-semibold text-slate-900 break-words min-w-0">{activeTypes[0].nombre}</span>
                </>
              ) : (
                <>
                  <span className="text-slate-600 font-medium text-sm sm:text-base shrink-0">Varias campañas activas.</span>
                  <span className="text-slate-700 text-sm sm:text-base break-words min-w-0">Busca al afiliado y selecciona el tipo de entrega.</span>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {currentTypeLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!currentTypeLoading && noCampaignMessage && (
          <Alert className="border-amber-200 bg-amber-50">
            <Calendar className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Sin campaña activa</AlertTitle>
            <AlertDescription className="text-amber-700">{noCampaignMessage}</AlertDescription>
          </Alert>
        )}

        {!currentTypeLoading && hasActiveCampaign && (
          <>
            <Card className="mb-4 sm:mb-6 overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6 px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl break-words">
                  <Search className="h-5 w-5 shrink-0" />
                  Buscar afiliado
                </CardTitle>
                <CardDescription className="text-sm break-words">
                  Ingresa el número de documento del afiliado para cargar sus datos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                  <div className="flex-1 min-w-0 w-full">
                    <Label htmlFor="documento">Número de documento</Label>
                    <Input
                      id="documento"
                      placeholder="(número sin puntos ni comas)"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full min-w-0"
                    />
                  </div>
                  <div className="flex items-end w-full sm:w-auto">
                    <Button onClick={handleSearch} disabled={isSearching} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Search className="h-4 w-4 sm:mr-2" />}
                      <span className="sm:inline">Buscar</span>
                    </Button>
                  </div>
                </div>
                {lookupError && (
                  <p className="text-sm text-red-600">{lookupError}</p>
                )}
              </CardContent>
            </Card>

            {lookupData && (
              <Card className="mb-4 sm:mb-6 overflow-hidden">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3 sm:pb-6 px-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl break-words">
                      <User className="h-5 w-5 shrink-0" />
                      <span className="break-words">Datos del afiliado</span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1 break-words">Verifica la información y registra la firma del afiliado como constancia de entrega.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewSearch}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto shrink-0 gap-2 min-h-[44px] touch-manipulation"
                  >
                    <UserPlus className="h-4 w-4" />
                    Registrar a otra persona
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                  {(() => {
                    const p = getPayloadFromLookup();
                    const puedeRegistrar = puedeRegistrarOtroTipo();
                    const mensajeSolicitudExistente = getSolicitudExistenteMensaje();
                    const tipos = tiposActivosFromLookup();
                    return (
                      <>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <User className="h-4 w-4 text-slate-400 shrink-0" />
                            <div className="min-w-0 overflow-hidden">
                              <span className="font-medium text-slate-700">Nombre: </span>
                              <span className="text-slate-900 break-words">{p?.nombre_afiliado ?? '—'}</span>
                            </div>
                          </div>
                          {isFlatLookupData(lookupData) && (lookupData as AffiliateLookupFlatData).estado ? (
                            <div className="flex items-center gap-2 text-sm lg:justify-center">
                              <Badge
                                variant="outline"
                                className={
                                  (lookupData as AffiliateLookupFlatData).estado?.toLowerCase().includes('activo')
                                    ? 'border-green-600 bg-green-50 text-green-800'
                                    : (lookupData as AffiliateLookupFlatData).estado?.toLowerCase().includes('retirado')
                                      ? 'border-red-600 bg-red-50 text-red-800'
                                      : 'border-slate-400 bg-slate-100 text-slate-700'
                                }
                              >
                                {(lookupData as AffiliateLookupFlatData).estado}
                              </Badge>
                            </div>
                          ) : (
                            <div className="hidden lg:block" />
                          )}
                          <div className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-1 min-w-0">
                            <Building className="h-4 w-4 text-slate-400 shrink-0" />
                            <div className="min-w-0 overflow-hidden">
                              <span className="font-medium text-slate-700">Hospital: </span>
                              <span className="text-slate-900 break-words">{p?.hospital ? getHospitalDisplayName(p.hospital) : '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Mensaje según puede_registrar_otro_tipo */}
                        {mensajeSolicitudExistente && (
                          puedeRegistrar ? (
                            <Alert className="border-amber-200 bg-amber-50">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                              <AlertTitle className="text-amber-800 text-sm font-semibold">Aviso</AlertTitle>
                              <AlertDescription className="text-amber-700 text-sm">
                                {mensajeSolicitudExistente}
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                              <AlertTitle className="text-red-800 text-sm font-semibold">No se puede registrar otra entrega</AlertTitle>
                              <AlertDescription className="text-red-700 text-sm">
                                {mensajeSolicitudExistente}
                              </AlertDescription>
                            </Alert>
                          )
                        )}

                        {/* Selector de tipo cuando puede registrar y hay tipos — destacado para que se verifique/elija */}
                        {puedeRegistrar && tipos.length >= 1 && (
                          <Card className="border-2 border-primary/40 bg-primary/5 shadow-sm overflow-hidden">
                            <CardHeader className="pb-2 px-4 sm:px-6">
                              <CardTitle className="text-base flex items-center gap-2 break-words">
                                <Package className="h-5 w-5 text-primary shrink-0" />
                                Tipo de entrega para esta solicitud
                              </CardTitle>
                              <CardDescription className="break-words">
                                Pueden estar activas varias campañas a la vez. <strong>Verifica o elige aquí</strong> el tipo de entrega antes de registrar la firma; de lo contrario se podría guardar en una campaña distinta.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0 px-4 sm:px-6">
                              <Label className="text-sm font-medium text-slate-800 sr-only">Tipo de entrega</Label>
                              <Select
                                value={selectedTypeId != null ? String(selectedTypeId) : ''}
                                onValueChange={(v) => setSelectedTypeId(v ? Number(v) : null)}
                              >
                                <SelectTrigger className="w-full max-w-full sm:max-w-md h-11 min-h-[44px] font-medium border-primary/30 bg-white focus:ring-2 focus:ring-primary/30 touch-manipulation">
                                  <SelectValue placeholder="Elige el tipo de entrega" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[min(70vh,400px)] overflow-y-auto">
                                  {tipos.map((t) => (
                                    <SelectItem
                                      key={t.id}
                                      value={String(t.id)}
                                      disabled={t.tiene_solicitud}
                                      className="break-words"
                                    >
                                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="break-words">{t.nombre}</span>
                                        {t.siempre_activo && (
                                          <span className="text-xs text-slate-500 font-normal">(siempre activo)</span>
                                        )}
                                        {t.tiene_solicitud && (
                                          <span className="text-xs text-amber-600">(ya tiene solicitud)</span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {tipos.length > 1 && (
                                <p className="text-xs text-slate-500 break-words">
                                  Los tipos con solicitud ya registrada para este documento aparecen deshabilitados.
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Formulario de firma y envío solo cuando puede registrar */}
                        {puedeRegistrar && (
                          <>
                            <div className="border-t pt-4 space-y-2 min-w-0 overflow-hidden">
                              <h3 className="text-base font-semibold text-slate-900 break-words">Firma del afiliado</h3>
                              <p className="text-sm text-slate-600 break-words">La firma del afiliado constata que la entrega ha sido realizada.</p>
                              <div className="overflow-hidden rounded-lg w-full min-w-0">
                                <SignaturePad
                                  ref={signaturePadRef}
                                  onChange={setSignature}
                                  onClear={() => setShowSignatureError(false)}
                                  height={180}
                                />
                              </div>
                              {showSignatureError && (
                                <p className="text-sm text-red-600 break-words">Debe registrar la firma para continuar.</p>
                              )}
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
                              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto min-h-[44px] touch-manipulation">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
                                Registrar solicitud
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="w-[95vw] max-w-md max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto max-sm:inset-x-4 max-sm:rounded-lg">
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <DialogTitle>Solicitud registrada</DialogTitle>
              <DialogDescription>La entrega de bienestar quedó registrada correctamente.</DialogDescription>
            </DialogHeader>
            {successData && (
              <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
                {successData.tipo_entrega_text && (
                  <p><span className="text-slate-600">Campaña:</span> {successData.tipo_entrega_text}</p>
                )}
                <p><span className="text-slate-600">Estado:</span> <span className="capitalize font-medium">{successData.estado}</span></p>
                {successData.created_at && (
                  <p><span className="text-slate-600">Fecha:</span> {formatDate(successData.created_at)}</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => { setShowSuccessModal(false); handleNewSearch(); }}>
                Registrar otra entrega
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <DialogContent className="w-[95vw] max-w-md max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto max-sm:inset-x-4 max-sm:rounded-lg">
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="bg-red-100 p-3 rounded-full">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <DialogTitle>Error al registrar</DialogTitle>
              <DialogDescription>{errorMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowErrorModal(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminRegistrarEntregaBienestarPage;
