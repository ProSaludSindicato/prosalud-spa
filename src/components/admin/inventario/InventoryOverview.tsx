import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  // Hospital,
  Shirt,
  Gift,
  Shield,
  Plus,
  Minus,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import QuickActionsDialog from './QuickActionsDialog';
import LowStockDialog from './LowStockDialog';
// import HospitalRequestsDialog from './HospitalRequestsDialog';

const InventoryOverview: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | undefined>(undefined);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  // const [hospitalRequestsOpen, setHospitalRequestsOpen] = useState(false);

  const categoryStats = [
    {
      id: 'uniformes',
      name: 'Uniformes',
      icon: Shirt,
      total: 284,
      available: 258,
      reserved: 26,
      products: [
        { name: 'Uniforme Azul - Talla S', stock: 15, min: 10, status: 'ok' },
        { name: 'Uniforme Azul - Talla M', stock: 8, min: 10, status: 'low' },
        { name: 'Uniforme Azul - Talla L', stock: 25, min: 15, status: 'ok' },
        { name: 'Uniforme Verde - Talla S', stock: 3, min: 5, status: 'critical' },
        { name: 'Uniforme Verde - Talla M', stock: 18, min: 10, status: 'ok' },
        { name: 'Uniforme Verde - Talla L', stock: 22, min: 15, status: 'ok' },
        { name: 'Uniforme Blanco - Talla S', stock: 20, min: 8, status: 'ok' },
        { name: 'Uniforme Blanco - Talla M', stock: 28, min: 12, status: 'ok' },
        { name: 'Uniforme Blanco - Talla L', stock: 22, min: 10, status: 'ok' },
        { name: 'Uniforme Rosa - Talla M', stock: 15, min: 8, status: 'ok' },
        { name: 'Uniforme Morado - Talla S', stock: 14, min: 8, status: 'ok' },
        { name: 'Uniforme Morado - Talla M', stock: 18, min: 12, status: 'ok' },
        { name: 'Uniforme Quirúrgico Premium - Talla S', stock: 25, min: 15, status: 'ok' },
        { name: 'Uniforme Quirúrgico Premium - Talla M', stock: 18, min: 12, status: 'ok' },
        { name: 'Uniforme Pediátrico Rosa - Talla S', stock: 22, min: 12, status: 'ok' },
        { name: 'Uniforme Pediátrico Rosa - Talla M', stock: 18, min: 10, status: 'ok' },
        { name: 'Uniforme Pediátrico Celeste - Talla L', stock: 16, min: 8, status: 'ok' }
      ]
    },
    {
      id: 'tapabocas',
      name: 'Tapabocas',
      icon: Shield,
      total: 4220,
      available: 3990,
      reserved: 230,
      products: [
        { name: 'Tapabocas Quirúrgico', stock: 1200, min: 500, status: 'ok' },
        { name: 'Tapabocas N95', stock: 45, min: 100, status: 'low' },
        { name: 'Tapabocas de Tela', stock: 800, min: 300, status: 'ok' },
        { name: 'Tapabocas Pediátrico', stock: 295, min: 200, status: 'ok' },
        { name: 'Tapabocas KN95 Azul', stock: 200, min: 150, status: 'ok' },
        { name: 'Tapabocas KN95 Rosa', stock: 180, min: 150, status: 'ok' },
        { name: 'Tapabocas KN95 Verde', stock: 160, min: 150, status: 'ok' },
        { name: 'Mascarilla Protección Facial', stock: 85, min: 50, status: 'ok' },
        { name: 'Mascarilla FFP2 Blanca', stock: 450, min: 200, status: 'ok' },
        { name: 'Mascarilla FFP2 Azul', stock: 320, min: 150, status: 'ok' },
        { name: 'Tapabocas Infantil Decorado', stock: 180, min: 100, status: 'ok' }
      ]
    },
    {
      id: 'batas',
      name: 'Batas',
      description: 'Batas médicas y de laboratorio',
      icon: Package,
      total: 359,
      available: 333,
      reserved: 26,
      products: [
        { name: 'Bata Blanca - Talla S', stock: 12, min: 8, status: 'ok' },
        { name: 'Bata Blanca - Talla M', stock: 18, min: 12, status: 'ok' },
        { name: 'Bata Blanca - Talla L', stock: 2, min: 8, status: 'critical' },
        { name: 'Bata de Laboratorio - Talla M', stock: 15, min: 10, status: 'ok' },
        { name: 'Bata de Laboratorio - Talla L', stock: 20, min: 12, status: 'ok' },
        { name: 'Bata Desechable', stock: 85, min: 50, status: 'ok' },
        { name: 'Delantal Impermeable - Talla S', stock: 45, min: 30, status: 'ok' },
        { name: 'Delantal Impermeable - Talla M', stock: 65, min: 40, status: 'ok' },
        { name: 'Delantal Impermeable - Talla L', stock: 38, min: 25, status: 'ok' },
        { name: 'Bata Quirúrgica Estéril - Talla M', stock: 85, min: 50, status: 'ok' },
        { name: 'Bata Quirúrgica Estéril - Talla L', stock: 92, min: 60, status: 'ok' },
        { name: 'Bata Quirúrgica Estéril - Talla XL', stock: 45, min: 30, status: 'ok' },
        { name: 'Delantal de Radiología - Talla M', stock: 8, min: 5, status: 'ok' },
        { name: 'Delantal de Radiología - Talla L', stock: 6, min: 4, status: 'ok' }
      ]
    },
    {
      id: 'implementos',
      name: 'Implementos',
      icon: Activity,
      total: 1292,
      available: 1225,
      reserved: 67,
      products: [
        { name: 'Guantes Nitrilo - Talla S', stock: 80, min: 50, status: 'ok' },
        { name: 'Guantes Nitrilo - Talla M', stock: 120, min: 80, status: 'ok' },
        { name: 'Guantes Nitrilo - Talla L', stock: 95, min: 60, status: 'ok' },
        { name: 'Estetoscopio Profesional', stock: 12, min: 8, status: 'ok' },
        { name: 'Tensiómetro Digital', stock: 8, min: 5, status: 'ok' },
        { name: 'Termómetro Infrarrojo', stock: 15, min: 10, status: 'ok' },
        { name: 'Gorro Quirúrgico Azul', stock: 350, min: 200, status: 'ok' },
        { name: 'Gorro Quirúrgico Verde', stock: 280, min: 150, status: 'ok' },
        { name: 'Zapatos Antideslizantes - T.38', stock: 15, min: 10, status: 'ok' },
        { name: 'Zapatos Antideslizantes - T.40', stock: 20, min: 15, status: 'ok' },
        { name: 'Lentes de Protección', stock: 35, min: 20, status: 'ok' },
        { name: 'Alcohol Antiséptico 500ml', stock: 180, min: 100, status: 'ok' },
        { name: 'Gel Antibacterial 250ml', stock: 240, min: 150, status: 'ok' },
        { name: 'Botas de Seguridad - T.40', stock: 12, min: 8, status: 'ok' },
        { name: 'Oxímetro de Pulso Digital Blanco', stock: 15, min: 10, status: 'ok' },
        { name: 'Oxímetro de Pulso Digital Azul', stock: 12, min: 8, status: 'ok' },
        { name: 'Gafas de Protección Anti-vaho', stock: 75, min: 40, status: 'ok' }
      ]
    },
    {
      id: 'regalos',
      name: 'Regalos',
      icon: Gift,
      total: 233,
      available: 219,
      reserved: 14,
      products: [
        { name: 'Kit de Bienvenida', stock: 15, min: 10, status: 'ok' },
        { name: 'Termo ProSalud', stock: 35, min: 20, status: 'ok' },
        { name: 'Agenda Corporativa', stock: 28, min: 15, status: 'ok' },
        { name: 'USB Corporativo', stock: 3, min: 10, status: 'critical' },
        { name: 'Camiseta ProSalud - Talla M', stock: 22, min: 15, status: 'ok' },
        { name: 'Camiseta ProSalud - Talla L', stock: 20, min: 12, status: 'ok' },
        { name: 'Chaqueta Corporativa - Talla M', stock: 12, min: 8, status: 'ok' },
        { name: 'Morral Deportivo Negro', stock: 25, min: 15, status: 'ok' },
        { name: 'Kit Médico de Emergencia', stock: 28, min: 15, status: 'ok' },
        { name: 'Mochila Sanitaria Grande', stock: 35, min: 20, status: 'ok' },
        { name: 'Mochila Sanitaria Mediana', stock: 42, min: 25, status: 'ok' }
      ]
    }
  ];

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'low': return 'text-amber-600 bg-amber-50';
      case 'ok': return 'text-primary-prosalud bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'ok': return 'default';
      default: return 'outline';
    }
  };

  const lowStockItems = [
    { name: 'Uniforme Azul - Talla M', current: 8, min: 10, category: 'Uniformes' },
    { name: 'Bata Blanca - Talla L', current: 2, min: 8, category: 'Batas' },
    { name: 'Tapabocas N95', current: 45, min: 100, category: 'Tapabocas' },
    { name: 'Uniforme Verde - Talla S', current: 3, min: 5, category: 'Uniformes' },
    { name: 'USB Corporativo', current: 3, min: 10, category: 'Regalos' },
    { name: 'Delantal de Radiología - Talla L', current: 6, min: 4, category: 'Batas' },
    { name: 'Oxímetro Digital Azul', current: 12, min: 8, category: 'Implementos' }
  ];

  // const hospitalRequests = [
  //   { hospital: 'Hospital Marco Fidel Suárez', pending: 6, priority: 'high' },
  //   { hospital: 'Hospital San Juan de Dios', pending: 4, priority: 'urgent' },
  //   { hospital: 'Hospital La Merced', pending: 3, priority: 'urgent' },
  //   { hospital: 'Promotora Médica y Odontológica', pending: 3, priority: 'medium' },
  //   { hospital: 'Sociedad Médica Rionegro SOMER', pending: 2, priority: 'medium' },
  //   { hospital: 'Hospital Venancio Díaz', pending: 2, priority: 'high' }
  // ];

  return (
    <div className="space-y-6">
      {/* Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {categoryStats.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-300 border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-primary-prosalud-light">
                    <category.icon className="h-6 w-6 text-primary-prosalud" />
                  </div>
                  <Badge variant="outline" className="font-medium">
                    {category.total} total
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponible</span>
                      <span className="font-medium text-primary-prosalud">{category.available}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reservado</span>
                      <span className="font-medium text-gray-600">{category.reserved}</span>
                    </div>
                  </div>
                  <Progress 
                    value={(category.available / category.total) * 100} 
                    className="h-2 mt-3"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Inventory Products Accordion */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2"
        >
          <Card className="h-full border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                <Package className="h-5 w-5" />
                <span>Inventario por Categoría</span>
              </CardTitle>
              <CardDescription>
                Detalle de productos disponibles por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible value={expandedCategory} onValueChange={setExpandedCategory}>
                {categoryStats.map((category) => (
                  <AccordionItem key={category.id} value={category.id} className="border-b">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary-prosalud-light">
                          <category.icon className="h-4 w-4 text-primary-prosalud" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{category.name}</p>
                          <p className="text-sm text-gray-600">{category.products.length} productos</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2 pl-10">
                        {category.products.map((product, index) => (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getStockStatusColor(product.status)}`}>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-600">Mínimo: {product.min}</p>
                            </div>
                            <div className="text-right flex items-center space-x-2">
                              <span className="font-medium text-lg">{product.stock}</span>
                              <Badge variant={getStockStatusBadge(product.status)} className="text-xs">
                                {product.status === 'critical' ? 'Crítico' : 
                                 product.status === 'low' ? 'Bajo' : 'OK'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-1 space-y-6"
        >
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Stock Bajo</span>
              </CardTitle>
              <CardDescription>
                Productos que requieren reposición
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      {item.current}/{item.min}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button 
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setLowStockOpen(true)}
              >
                Ver Todo el Stock Bajo
              </Button>
            </CardContent>
          </Card>

          {/* Sección de solicitudes por hospital temporalmente deshabilitada */}
          {/*
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-primary-prosalud">
                <Hospital className="h-5 w-5" />
                <span>Solicitudes por Hospital</span>
              </CardTitle>
              <CardDescription>
                Estado de solicitudes pendientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hospitalRequests.map((request, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{request.hospital}</p>
                    <p className="text-xs text-gray-600">{request.pending} solicitudes pendientes</p>
                  </div>
                  <Badge 
                    variant={request.priority === 'urgent' ? 'destructive' :
                            request.priority === 'high' ? 'destructive' : 
                            request.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {request.priority === 'urgent' ? 'Urgente' :
                     request.priority === 'high' ? 'Alta' : 
                     request.priority === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
              ))}
              <Button 
                className="w-full mt-4 bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
                onClick={() => setHospitalRequestsOpen(true)}
              >
                Gestionar Solicitudes
              </Button>
            </CardContent>
          </Card>
          */}
        </motion.div>
      </div>

      {/* Dialogs */}
      <QuickActionsDialog open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
      <LowStockDialog open={lowStockOpen} onOpenChange={setLowStockOpen} />
      {/* <HospitalRequestsDialog open={hospitalRequestsOpen} onOpenChange={setHospitalRequestsOpen} /> */}
    </div>
  );
};

export default InventoryOverview;
