import React, {useMemo, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {useToast} from '@/hooks/use-toast';
import {useHospitalRequests} from '@/hooks/useHospitalRequests';
import {HospitalRequest, HospitalRequestStatus} from '@/types/inventory';
import {motion} from 'framer-motion';
import {Link} from 'react-router-dom';
import {
    Search,
    PlusCircle,
    ClipboardList,
    Clock,
    CheckCircle2,
    Truck,
    Archive,
    EllipsisVertical,
    Eye,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';
import DataPagination from '@/components/ui/data-pagination';
import {usePagination} from '@/hooks/usePagination';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {cn} from '@/lib/utils';

const statusOptions: { value: HospitalRequestStatus | 'all'; label: string }[] = [
    {value: 'all', label: 'Todos'},
    {value: 'pending', label: 'Pendiente'},
    {value: 'approved', label: 'Aprobada'},
    {value: 'preparing', label: 'Preparando'},
    {value: 'shipped', label: 'Enviada'},
    {value: 'delivered', label: 'Entregada'},
    {value: 'rejected', label: 'Rechazada'},
];

const statusBadgeStyles: Record<HospitalRequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 border border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    preparing: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    shipped: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border border-red-200',
};

const statusIcons: Record<HospitalRequestStatus, React.ReactNode> = {
    pending: <Clock className="h-3 w-3 mr-1"/>,
    approved: <CheckCircle2 className="h-3 w-3 mr-1"/>,
    preparing: <ClipboardList className="h-3 w-3 mr-1"/>,
    shipped: <Truck className="h-3 w-3 mr-1"/>,
    delivered: <Archive className="h-3 w-3 mr-1"/>,
    rejected: <Clock className="h-3 w-3 mr-1"/>,
};

const locationMovementStatuses: HospitalRequestStatus[] = ['shipped', 'delivered'];

const resolveLocationTypeLabel = (location?: HospitalRequest['targetLocation']) => {
    if (!location) return 'Ubicación';
    if (location.isPrimary) return 'Principal';
    switch (location.type) {
        case 'hospital':
            return 'Hospital';
        case 'satellite':
            return 'Satélite';
        case 'warehouse':
            return 'Bodega';
        default:
            return location.type ? location.type.charAt(0).toUpperCase() + location.type.slice(1) : 'Secundaria';
    }
};

const resolveLocationBadgeClass = (location?: HospitalRequest['targetLocation']) => {
    if (location?.isPrimary) {
        return 'bg-primary-prosalud/10 text-primary-prosalud border border-primary-prosalud/30';
    }
    switch (location?.type) {
        case 'hospital':
            return 'bg-sky-100 text-sky-800 border border-sky-200';
        case 'satellite':
            return 'bg-purple-100 text-purple-800 border border-purple-200';
        default:
            return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
};

const hasInventoryMovement = (status: HospitalRequestStatus) => locationMovementStatuses.includes(status);

const HospitalRequests: React.FC = () => {
    const {toast} = useToast();
    const {requests, hospitalOptions, products, categories, colorOptions, createRequest, changeStatus} =
        useHospitalRequests();
    const [search, setSearch] = useState('');
    const [selectedHospital, setSelectedHospital] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<HospitalRequestStatus | 'all'>('all');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<HospitalRequest | null>(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [requestForStatusChange, setRequestForStatusChange] = useState<HospitalRequest | null>(null);
    const [nextStatus, setNextStatus] = useState<HospitalRequestStatus | ''>('');

    const [newRequestHospital, setNewRequestHospital] = useState<string>('');
    const [newRequestObservations, setNewRequestObservations] = useState('');
    const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
    const [variantErrors, setVariantErrors] = useState<Record<string, string>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState('');
    const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
    const [productSort, setProductSort] = useState<'name' | 'stock'>('name');
    const [openProductId, setOpenProductId] = useState<string | undefined>();

    const colorLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        colorOptions.forEach((color) => map.set(color.id, color.label));
        return map;
    }, [colorOptions]);

    const getVariantLabel = (
        product: (typeof products)[number] | undefined,
        variant?: (typeof products)[number]['variants'][number],
    ) => {
        if (!product) return variant?.id ? `Variante ${variant.id}` : 'Variante';

        const parts: string[] = [];
        if (variant?.size) {
            parts.push(`Talla ${variant.size}`);
        }
        if (variant?.colorId) {
            parts.push(colorLabelMap.get(variant.colorId) ?? variant.colorId);
        }

        if (parts.length === 0) {
            return product.variantMode === 'simple' ? 'Estándar' : 'Variante';
        }
        return parts.join(' · ');
    };

    const filteredRequests = useMemo(() => {
        return requests.filter((request) => {
            const matchesHospital =
                selectedHospital === 'all' || request.hospitalId === selectedHospital;
            const matchesStatus =
                selectedStatus === 'all' || request.status === selectedStatus;
            const matchesSearch =
                !search ||
                request.hospitalName.toLowerCase().includes(search.toLowerCase()) ||
                request.id.toLowerCase().includes(search.toLowerCase());

            return matchesHospital && matchesStatus && matchesSearch;
        });
    }, [requests, search, selectedHospital, selectedStatus]);

    const {
        currentPage,
        itemsPerPage,
        totalPages,
        totalItems,
        paginatedData,
        goToPage,
        setItemsPerPage,
    } = usePagination({
        data: filteredRequests,
        initialItemsPerPage: 5,
    });

    const resetForm = () => {
        setNewRequestHospital('');
        setNewRequestObservations('');
        setVariantQuantities({});
        setVariantErrors({});
        setFormErrors({});
    };

    const handleVariantQuantityChange = (
        productId: string,
        variantId: string,
        available: number,
        rawValue: string,
    ) => {
        const key = `${productId}__${variantId}`;

        if (rawValue === '') {
            setVariantQuantities((prev) => {
                const next = {...prev};
                delete next[key];
                return next;
            });
            setVariantErrors((prev) => {
                const next = {...prev};
                delete next[key];
                return next;
            });
            return;
        }

        const parsed = Math.floor(Number(rawValue));

        if (!Number.isFinite(parsed) || parsed < 0) {
            setVariantErrors((prev) => ({
                ...prev,
                [key]: 'Ingresa una cantidad válida.',
            }));
            setVariantQuantities((prev) => {
                const next = {...prev};
                delete next[key];
                return next;
            });
            return;
        }

        if (parsed === 0) {
            setVariantQuantities((prev) => {
                const next = {...prev};
                delete next[key];
                return next;
            });
            setVariantErrors((prev) => {
                const next = {...prev};
                delete next[key];
                return next;
            });
            return;
        }

        setVariantQuantities((prev) => ({
            ...prev,
            [key]: parsed,
        }));
        setVariantErrors((prev) => {
            const next = {...prev};
            if (parsed > available) {
                next[key] =
                    available > 0
                        ? `La cantidad solicitada (${parsed}) supera el stock actual (${available}).`
                        : 'La cantidad solicitada excede el stock disponible (actualmente 0).';
            } else {
                delete next[key];
            }
            return next;
        });
    };

    const productCatalog = useMemo(
        () =>
            products.map((product) => ({
                ...product,
                totalStock: product.variants.reduce((acc, variant) => acc + (variant.stock ?? 0), 0),
            })),
        [products],
    );

    const filteredProducts = useMemo(() => {
        return productCatalog
            .filter((product) => {
                const matchesSearch =
                    !productSearch ||
                    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    (product.description ?? '').toLowerCase().includes(productSearch.toLowerCase());
                const matchesCategory =
                    productCategoryFilter === 'all' || product.categoryId === productCategoryFilter;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                if (productSort === 'name') {
                    return a.name.localeCompare(b.name);
                }
                return b.totalStock - a.totalStock;
            });
    }, [productCatalog, productSearch, productCategoryFilter, productSort]);

    const {
        currentPage: productPage,
        itemsPerPage: productItemsPerPage,
        totalPages: productTotalPages,
        totalItems: productTotalItems,
        paginatedData: paginatedProducts,
        goToPage: goToProductsPage,
        setItemsPerPage: setProductItemsPerPage,
    } = usePagination({
        data: filteredProducts,
        initialItemsPerPage: 6,
    });

    const getLastUpdateDate = (request: HospitalRequest) => {
        if (!request.timeline || request.timeline.length === 0) {
            return new Date(request.createdAt);
        }
        return new Date(request.timeline[request.timeline.length - 1].timestamp);
    };

    const formatDateTime = (date: Date) =>
        date.toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const finalStatuses: HospitalRequestStatus[] = ['delivered', 'rejected'];

    const getAvailableNextStatuses = (status: HospitalRequestStatus) => {
        switch (status) {
            case 'pending':
                return ['approved', 'rejected'] as HospitalRequestStatus[];
            case 'approved':
                return ['preparing', 'rejected'] as HospitalRequestStatus[];
            case 'preparing':
                return ['shipped', 'rejected'] as HospitalRequestStatus[];
            case 'shipped':
                return ['delivered'] as HospitalRequestStatus[];
            default:
                return [];
        }
    };

    const extractErrorMessage = (error: unknown) => {
        if (typeof error === 'string' && error.trim().length > 0) {
            return error;
        }

        if (error && typeof error === 'object') {
            const maybeError = error as {
                message?: string;
                response?: { data?: { message?: string } };
            };

            if (maybeError.response?.data?.message) {
                return maybeError.response.data.message;
            }

            if (maybeError.message) {
                return maybeError.message;
            }
        }

        return 'Intenta nuevamente.';
    };

    const handleStatusChange = async (request: HospitalRequest, status: HospitalRequestStatus) => {
        setStatusUpdateLoading(request.id);
        try {
            await changeStatus(request.id, status);
            toast({
                title: 'Estado actualizado',
                description: `La solicitud ${request.id} ahora está en estado "${statusOptions.find((opt) => opt.value === status)?.label ?? status}".`,
            });
            setStatusModalOpen(false);
            setRequestForStatusChange(null);
            setNextStatus('');
        } catch (error) {
            toast({
                title: 'Error al actualizar estado',
                description: extractErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    const handleSubmit = async () => {
        const nextFormErrors: Record<string, string> = {};

        const selectedVariantEntries = Object.entries(variantQuantities).filter(
            ([, quantity]) => quantity && quantity > 0,
        );

        const selectedItems = selectedVariantEntries
            .map(([key, quantity]) => {
                const [productId, variantIdRaw] = key.split('__');
                const variantId = variantIdRaw === 'default' ? undefined : variantIdRaw;
                const product = products.find((p) => p.id === productId);
                const variant = product?.variants.find((v) => v.id === variantId);

                return {
                    productId,
                    variantId,
                    variantLabel: getVariantLabel(product, variant),
                    size: variant?.size,
                    colorId: variant?.colorId,
                    quantity,
                };
            })
            .filter((item) => item.quantity > 0);

        if (!newRequestHospital) {
            nextFormErrors.hospital = 'Debes seleccionar un hospital.';
        }

        if (!selectedItems.length) {
            nextFormErrors.items = 'Selecciona al menos un producto con cantidad mayor a 0.';
        }

        setFormErrors(nextFormErrors);

        if (Object.keys(nextFormErrors).length > 0) {
            toast({
                title: 'Faltan datos',
                description: Object.values(nextFormErrors).join(' '),
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const hospital = hospitalOptions.find((option) => option.id === newRequestHospital);
            if (!hospital) {
                throw new Error('Hospital no válido');
            }

            const created = await createRequest({
                hospitalId: hospital.id,
                hospitalName: hospital.name,
                items: selectedItems,
                observations: newRequestObservations || undefined,
            });

            toast({
                title: 'Solicitud registrada',
                description: `Se creó la solicitud ${created.id} para ${hospital.name}.`,
            });
            resetForm();
            setShowCreateDialog(false);
        } catch (error) {
            toast({
                title: 'Error al crear solicitud',
                description: extractErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <motion.div
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Solicitudes de Hospitales</h2>
                    <p className="text-gray-600">
                        Gestiona las solicitudes de dotaciones y EPP realizadas por los hospitales.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="gap-2" asChild>
                        <Link to="/admin/dotacion-epp">
                            <ClipboardList className="h-4 w-4"/>
                            Ir a Dotación y EPP
                        </Link>
                    </Button>
                    <Button
                        className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <PlusCircle className="h-4 w-4 mr-2"/>
                        Nueva Solicitud
                    </Button>
                </div>
            </motion.div>

            <Card className="border shadow-sm">
                <CardContent className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="hospital-requests-search" className="text-sm font-medium text-gray-700">
                                Buscar
                            </Label>
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"/>
                                <Input
                                    id="hospital-requests-search"
                                    placeholder="Buscar por hospital o ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hospital-filter" className="text-sm font-medium text-gray-700">
                                Hospital
                            </Label>
                            <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                                <SelectTrigger id="hospital-filter">
                                    <SelectValue placeholder="Todos los hospitales"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los hospitales</SelectItem>
                                    {hospitalOptions.map((hospital) => (
                                        <SelectItem key={hospital.id} value={hospital.id}>
                                            {hospital.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                                Estado
                            </Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value as HospitalRequestStatus | 'all')}
                            >
                                <SelectTrigger id="status-filter">
                                    <SelectValue placeholder="Todos los estados"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary-prosalud"/>
                        <span>Solicitudes registradas</span>
                    </CardTitle>
                    <CardDescription>
                        Seguimiento detallado de las solicitudes realizadas por cada hospital.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>ID</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Hospital</TableHead>
                                    <TableHead>Ítems</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="hidden lg:table-cell">Observaciones</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No se encontraron solicitudes para los filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((request) => (
                                        <TableRow key={request.id} className="hover:bg-gray-50 transition-colors">
                                            <TableCell>
                                                <span className="font-mono text-sm">#{request.id}</span>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(request.createdAt).toLocaleDateString('es-CO', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="max-w-[240px] space-y-1">
                                                <p className="font-medium text-gray-900">
                                                    {request.hospital?.name ?? request.hospitalName}
                                                </p>
                                                { /*{request.targetLocation && (
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`text-[10px] ${resolveLocationBadgeClass(request.targetLocation)}`}>
                                                            {resolveLocationTypeLabel(request.targetLocation)}
                                                        </Badge>
                                                        <span className="text-xs text-gray-600">
                                                            {request.targetLocation.name}
                                                        </span>
                                                    </div>
                                                )}*/ }
                                                {request.requestedBy && (
                                                    <p className="text-xs text-gray-500">Solicitó: {request.requestedBy}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{request.items.length}</p>
                                                <p className="text-xs text-gray-500">ítems solicitados</p>
                                            </TableCell>
                                            <TableCell className="space-y-1">
                                                <Badge className={statusBadgeStyles[request.status]}>
                                                    {statusIcons[request.status]}
                                                    {statusOptions.find((option) => option.value === request.status)?.label ?? request.status}
                                                </Badge>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {formatDateTime(getLastUpdateDate(request))}
                                                </p>
                                                {/* hasInventoryMovement(request.status) && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                        <Truck className="h-3 w-3"/>
                                                        Inventario movido
                                                    </span>
                                                ) */}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <p className="text-xs text-gray-600 truncate max-w-xs">
                                                    {request.observations || '—'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-600 hover:text-white hover:bg-accent"
                                                        >
                                                            <EllipsisVertical className="h-4 w-4"/>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem
                                                            onClick={() => setSelectedRequest(request)}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="h-4 w-4 text-primary-prosalud"/>
                                                            Ver detalle
                                                        </DropdownMenuItem>
                                                        {!finalStatuses.includes(request.status) && (
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setRequestForStatusChange(request);
                                                                    setNextStatus('');
                                                                    setStatusModalOpen(true);
                                                                }}
                                                                className="gap-2"
                                                            >
                                                                <RefreshCw className="h-4 w-4 text-primary-prosalud"/>
                                                                Cambiar estado
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DataPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={goToPage}
                        onItemsPerPageChange={setItemsPerPage}
                        className="mt-4"
                    />
                </CardContent>
            </Card>

            {/* Crear solicitud */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                        <DialogTitle>Nueva solicitud para hospital</DialogTitle>
                        <DialogDescription>
                            Registra los productos que el hospital requiere. Esta información se enviará a la sede
                            principal para su aprobación.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        <Card className="border border-gray-200 shadow-sm">
                            <CardHeader className="bg-gray-50 border-b border-gray-200">
                                <CardTitle className="text-lg font-semibold text-gray-900">Información de la
                                    solicitud</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Hospital *</label>
                                        <Select value={newRequestHospital} onValueChange={setNewRequestHospital}>
                                            <SelectTrigger className="bg-gray-50 border-gray-300">
                                                <SelectValue placeholder="Selecciona un hospital"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {hospitalOptions.map((hospital) => (
                                                    <SelectItem key={hospital.id} value={hospital.id}>
                                                        {hospital.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.hospital && (
                                            <p className="text-xs text-red-500">{formErrors.hospital}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Observaciones</label>
                                        <Textarea
                                            placeholder="Observaciones adicionales (opcional)"
                                            value={newRequestObservations}
                                            onChange={(e) => setNewRequestObservations(e.target.value)}
                                            rows={3}
                                            className="bg-gray-50 border-gray-300"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-gray-200 shadow-sm">
                            <CardHeader className="bg-gray-50 border-b border-gray-200">
                                <CardTitle className="text-lg font-semibold text-gray-900">Productos
                                    disponibles</CardTitle>
                                <CardDescription>
                                    Ingresa la cantidad solicitada para los productos requeridos. Los que queden en cero
                                    no se incluirán en la solicitud.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="space-y-4 p-4 border-b border-gray-200 bg-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="product-search"
                                                   className="text-sm font-medium text-gray-700">
                                                Buscar producto
                                            </Label>
                                            <Input
                                                id="product-search"
                                                placeholder="Nombre o descripción..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="product-category"
                                                   className="text-sm font-medium text-gray-700">
                                                Filtrar por categoría
                                            </Label>
                                            <Select value={productCategoryFilter}
                                                    onValueChange={setProductCategoryFilter}>
                                                <SelectTrigger id="product-category">
                                                    <SelectValue placeholder="Todas las categorías"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas las categorías</SelectItem>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="product-sort" className="text-sm font-medium text-gray-700">
                                                Ordenar por
                                            </Label>
                                            <Select value={productSort}
                                                    onValueChange={(value) => setProductSort(value as 'name' | 'stock')}>
                                                <SelectTrigger id="product-sort">
                                                    <SelectValue placeholder="Seleccionar orden"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="name">Nombre</SelectItem>
                                                    <SelectItem value="stock">Disponibilidad</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    {paginatedProducts.length === 0 ? (
                                        <div className="p-6 text-sm text-gray-500">
                                            No se encontraron productos para los filtros aplicados.
                                        </div>
                                    ) : (
                                        <Accordion
                                            type="single"
                                            collapsible
                                            value={openProductId}
                                            onValueChange={(value) => {
                                                const resolved = value || undefined;
                                                requestAnimationFrame(() => setOpenProductId(resolved));
                                            }}
                                            className="divide-y divide-gray-200"
                                        >
                                            {paginatedProducts.map((product, index) => {
                                                const selectedCount = product.variants.reduce((acc, variant) => {
                                                    const key = `${product.id}__${variant.id ?? 'default'}`;
                                                    return acc + (variantQuantities[key] ? 1 : 0);
                                                }, 0);
                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={cn('bg-white', index === 0 ? '' : 'pt-2')}
                                                    >
                                                        <AccordionItem
                                                            value={product.id}
                                                            className="border-none"
                                                        >
                                                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                                                <div
                                                                    className={cn(
                                                                        'flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 text-left rounded-md border border-transparent transition-colors p-3',
                                                                        selectedCount > 0 && 'border-primary-prosalud/50 bg-primary-prosalud/5',
                                                                        'hover:bg-primary-prosalud/10',
                                                                    )}
                                                                >
                                                                    <div className="min-w-0 px-0 sm:px-0">
                                                                        <p className="font-semibold text-gray-900 truncate">
                                                                            {product.name}
                                                                            {product.gender && (
                                                                                <span className="font-bold"> ({product.gender})</span>
                                                                            )}
                                                                        </p>
                                                                        {product.description && (
                                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                                                                        )}
                                                                        {product.categoryId && (
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Categoría: {' '}
                                                                                {categories.find((category) => category.id === product.categoryId)?.name ??
                                                                                    product.categoryId}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0 px-0 sm:px-0">
                                                                        <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                                                                            {product.variants.length} variantes
                                                                        </Badge>
                                                                        {selectedCount > 0 && (
                                                                            <Badge className="bg-primary-prosalud/10 text-primary-prosalud border border-primary-prosalud/20">
                                                                                Seleccionadas {selectedCount}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-4 pb-4">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {product.variants.map((variant) => {
                                                                        const variantKey = `${product.id}__${variant.id ?? 'default'}`;
                                                                        const available = variant.stock ?? 0;
                                                                        const quantityValue = variantQuantities[variantKey];
                                                                        const warningMessage = variantErrors[variantKey];
                                                                        const exceedsStock =
                                                                            quantityValue !== undefined && quantityValue > available;
                                                                        const label = getVariantLabel(product, variant);

                                                                        return (
                                                                            <div
                                                                                key={variantKey}
                                                                                className={cn(
                                                                                    'flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-xs transition-colors',
                                                                                    quantityValue
                                                                                        ? 'border-primary-prosalud/60 bg-primary-prosalud/5'
                                                                                        : 'border-gray-200 hover:border-primary-prosalud/30',
                                                                                    exceedsStock && 'border-amber-400 bg-amber-50',
                                                                                )}
                                                                            >
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 truncate">
                                                                                        {variant.colorId && (
                                                                                            <span
                                                                                                className="inline-block h-3 w-3 rounded-full border border-gray-200"
                                                                                                style={{
                                                                                                    backgroundColor:
                                                                                                        colorOptions.find((c) => c.id === variant.colorId)?.hex ??
                                                                                                        'transparent',
                                                                                                }}
                                                                                            />
                                                                                        )}
                                                                                        <span className="truncate">{label}</span>
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <Label className="text-xs text-gray-600">Cantidad solicitada</Label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        placeholder="0"
                                                                                        className={cn(
                                                                                            exceedsStock &&
                                                                                                'border-amber-400 text-amber-900 focus-visible:ring-amber-500 focus-visible:border-amber-500',
                                                                                        )}
                                                                                        value={quantityValue === undefined ? '' : quantityValue}
                                                                                        onChange={(e) =>
                                                                                            handleVariantQuantityChange(
                                                                                                product.id,
                                                                                                variant.id ?? 'default',
                                                                                                available,
                                                                                                e.target.value,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
                                                                                        Stock actual: {available}
                                                                                    </p>
                                                                                    {warningMessage && (
                                                                                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                                                                                            <AlertTriangle className="h-3.5 w-3.5"/>
                                                                                            <span>{warningMessage}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </div>
                                                );
                                            })}
                                        </Accordion>
                                    )}
                                </div>
                                {formErrors.items && (
                                    <div className="px-6 pb-4">
                                        <p className="text-xs text-red-500">{formErrors.items}</p>
                                    </div>
                                )}
                                <div className="p-4 border-t border-gray-200">
                                    <DataPagination
                                        currentPage={productPage}
                                        totalPages={productTotalPages}
                                        totalItems={productTotalItems}
                                        itemsPerPage={productItemsPerPage}
                                        onPageChange={goToProductsPage}
                                        onItemsPerPageChange={setProductItemsPerPage}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                            >
                                {isSubmitting ? 'Guardando...' : 'Registrar solicitud'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detalle solicitud */}
            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Solicitud #{selectedRequest.id}</DialogTitle>
                                <DialogDescription asChild>
                                    <div className="flex items-center gap-2">
                                        <span>Estado actual:</span>
                                        <Badge className={statusBadgeStyles[selectedRequest.status]}>
                                            {statusIcons[selectedRequest.status]}
                                            {statusOptions.find((option) => option.value === selectedRequest.status)?.label ?? selectedRequest.status}
                                        </Badge>
                                    </div>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-2">
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                                        <CardTitle className="text-lg font-semibold text-gray-900">Información
                                            general</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-3 text-sm text-gray-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <span className="font-medium text-gray-600 block">Hospital:</span>
                                                <span className="text-gray-900">
                                                    {selectedRequest.hospital?.name ?? selectedRequest.hospitalName}
                                                </span>
                                            </div>
                                            <div>
                                                <span
                                                    className="font-medium text-gray-600 block">Fecha de creación:</span>
                                                <span className="text-gray-900">
                                                    {new Date(selectedRequest.createdAt).toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600 block">Bodega destino:</span>
                                                {selectedRequest.targetLocation ? (
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <Badge className={`text-[10px] ${resolveLocationBadgeClass(selectedRequest.targetLocation)}`}>
                                                            {resolveLocationTypeLabel(selectedRequest.targetLocation)}
                                                        </Badge>
                                                        <span className="text-gray-900">
                                                            {selectedRequest.targetLocation.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-900">Pendiente de asignar</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600 block">Solicitante:</span>
                                                <span
                                                    className="text-gray-900">{selectedRequest.requestedBy ?? 'No registrado'}</span>
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="font-medium text-gray-600 block">Observaciones:</span>
                                                <span
                                                    className="text-gray-900">{selectedRequest.observations ?? '—'}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {hasInventoryMovement(selectedRequest.status) && selectedRequest.targetLocation && (
                                    <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                        <Truck className="mt-0.5 h-4 w-4 shrink-0"/>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wide">
                                                Inventario distribuido
                                            </p>
                                            <p>
                                                {selectedRequest.status === 'delivered'
                                                    ? `La solicitud se marcó como entregada. El stock figura ahora en ${selectedRequest.targetLocation.name}.`
                                                    : `El inventario salió de la bodega principal y se dirige a ${selectedRequest.targetLocation.name}.`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                                        <CardTitle className="text-lg font-semibold text-gray-900">Productos
                                            solicitados</CardTitle>
                                        <CardDescription>
                                            Detalles completos de cada producto, variante y cantidades solicitadas.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedRequest.items.map((item) => {
                                                const product =
                                                    item.product ??
                                                    products.find((p) => p.id === item.productId);
                                                const variant =
                                                    item.variant ??
                                                    product?.variants.find((variant) => variant.id === item.variantId);
                                                const resolvedColor =
                                                    variant?.color ??
                                                    (item.colorId ? colorOptions.find((c) => c.id === item.colorId) : undefined);
                                                const currentStock =
                                                    item.currentStock ??
                                                    variant?.stock ??
                                                    (product?.variantMode === 'simple' ? product?.variants[0]?.stock : undefined);
                                                const exceedsCurrentStock =
                                                    typeof currentStock === 'number' && item.quantity > currentStock;

                                                return (
                                                    <div
                                                        key={item.id ?? `${item.productId}-${item.variantId}`}
                                                        className={cn(
                                                            'flex h-full flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
                                                            exceedsCurrentStock && 'border-amber-400 bg-amber-50/70 shadow-md',
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-base font-semibold text-gray-900 leading-tight">
                                                                    {product?.name ?? item.productId}
                                                                    {product?.gender && (
                                                                        <span className="font-bold"> ({product.gender})</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {product?.category?.name ?? 'Sin categoría'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge
                                                                    className={cn(
                                                                        'bg-primary-prosalud/10 text-primary-prosalud border border-primary-prosalud/20',
                                                                        exceedsCurrentStock &&
                                                                            'border-amber-300 bg-amber-100 text-amber-800',
                                                                    )}
                                                                >
                                                                    <span className="flex items-center justify-end gap-1">
                                                                        {exceedsCurrentStock && <AlertTriangle className="h-3 w-3"/>}
                                                                        {currentStock !== undefined
                                                                            ? `${item.quantity} / ${currentStock}`
                                                                            : `${item.quantity}`}
                                                                    </span>
                                                                </Badge>
                                                                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
                                                                    {currentStock !== undefined
                                                                        ? 'Solicitados / Disponibles'
                                                                        : 'Unidades solicitadas'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                                  Variante
                                                                </span>
                                                                <div
                                                                    className="mt-1 flex items-center gap-2 text-gray-900">
                                                                    <span>{item.variantLabel ?? variant?.label ?? '—'}</span>
                                                                    {resolvedColor && (
                                                                        <span
                                                                            className="h-4 w-4 rounded-full border border-gray-200"
                                                                            style={{backgroundColor: resolvedColor.hex ?? '#ffffff'}}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                                                  SKU
                                                                </span>
                                                                <p className="text-gray-900">{variant?.sku ?? '—'}</p>
                                                            </div>

                                                        </div>

                                                        {exceedsCurrentStock && (
                                                            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-semibold uppercase tracking-wide">
                                                                        Excede el stock actual
                                                                    </p>
                                                                    <p>
                                                                        Se solicitaron {item.quantity} unidades y el stock actual es de{' '}
                                                                        {currentStock ?? 0}. Considera ajustar el inventario o la solicitud.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!finalStatuses.includes(selectedRequest.status) && (
                                                            <div
                                                                className="rounded-md border border-dashed border-primary-prosalud/40 bg-primary-prosalud/5 p-3">
                                <span className="text-xs font-medium uppercase tracking-wide text-primary-prosalud">
                                  Stock disponible actual
                                </span>
                                                                <p className={`text-sm font-semibold ${Number(currentStock) <= (variant?.minStock ?? 0) ? 'text-red-600' : 'text-primary-prosalud'}`}>
                                                                    {currentStock ?? '—'} unidades
                                                                </p>
                                                            </div>
                                                        )}

                                                        {item.notes && (
                                                            <div
                                                                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                <span className="block text-xs font-semibold uppercase tracking-wide">
                                  Notas
                                </span>
                                                                <p>{item.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal cambio de estado */}
            <Dialog open={statusModalOpen} onOpenChange={(open) => {
                setStatusModalOpen(open);
                if (!open) {
                    setRequestForStatusChange(null);
                    setNextStatus('');
                }
            }}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle>Cambiar estado de solicitud</DialogTitle>
                        <DialogDescription>
                            Selecciona el nuevo estado para la solicitud {requestForStatusChange?.id}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 mr-2">Estado actual</Label>
                            <Badge
                                className={requestForStatusChange ? statusBadgeStyles[requestForStatusChange.status] : ''}>
                                {requestForStatusChange && statusIcons[requestForStatusChange.status]}
                                {requestForStatusChange
                                    ? statusOptions.find((opt) => opt.value === requestForStatusChange.status)?.label ?? requestForStatusChange.status
                                    : '—'}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="next-status" className="text-sm font-medium text-gray-700">
                                Nuevo estado
                            </Label>
                            <Select
                                value={nextStatus}
                                onValueChange={(value) => setNextStatus(value as HospitalRequestStatus)}
                            >
                                <SelectTrigger id="next-status">
                                    <SelectValue placeholder="Selecciona un estado"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {requestForStatusChange &&
                                        getAvailableNextStatuses(requestForStatusChange.status).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        className={cn(statusBadgeStyles[status], 'min-w-[4.5rem] justify-center gap-1')}>
                                                        {statusIcons[status]}
                                                        {statusOptions.find((option) => option.value === status)?.label ?? status}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (requestForStatusChange && nextStatus) {
                                    handleStatusChange(requestForStatusChange, nextStatus);
                                } else {
                                    toast({
                                        title: 'Selecciona un estado',
                                        description: 'Debes escoger un estado diferente para continuar.',
                                        variant: 'destructive',
                                    });
                                }
                            }}
                            disabled={!requestForStatusChange || !nextStatus || statusUpdateLoading === requestForStatusChange?.id}
                            className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                        >
                            {statusUpdateLoading === requestForStatusChange?.id ? 'Actualizando...' : 'Actualizar estado'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HospitalRequests;

