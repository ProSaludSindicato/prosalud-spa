
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, Trash } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface RequestItem {
  id: string;
  productName: string;
  category: string;
  size?: string;
  color?: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  notes: string;
}

interface NewRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewRequestForm: React.FC<NewRequestFormProps> = ({ onClose, onSuccess }) => {
  const [hospitalName, setHospitalName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [items, setItems] = useState<RequestItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<RequestItem>>({
    productName: '',
    category: '',
    quantity: 0,
    priority: 'medium',
    notes: ''
  });
  // Security: Use centralized sanitization hook
  const { sanitizeText, sanitizeGeneral } = useSanitizedInput();

  const hospitals = [
    'Hospital Marco Fidel Suárez',
    'Hospital San Juan de Dios',
    'Hospital La Merced',
    'Hospital Santa Elena',
    'Hospital Venancio Díaz'
  ];

  const categories = ['Uniformes', 'Tapabocas', 'Batas', 'Regalos'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = ['Azul', 'Verde', 'Blanco', 'Gris'];
  const priorities = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }
  ];

  const addItem = () => {
    if (newItem.productName && newItem.category && newItem.quantity && newItem.priority) {
      const item: RequestItem = {
        id: Date.now().toString(),
        productName: newItem.productName,
        category: newItem.category,
        size: newItem.size,
        color: newItem.color,
        quantity: newItem.quantity,
        priority: newItem.priority as 'low' | 'medium' | 'high',
        notes: newItem.notes || ''
      };
      setItems([...items, item]);
      setNewItem({
        productName: '',
        category: '',
        quantity: 0,
        priority: 'medium',
        notes: ''
      });
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    const requestData = {
      hospitalName,
      coordinatorName,
      requestDate,
      deliveryDate,
      generalNotes,
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    logger.debug('Nueva solicitud de inventario creada', {
      hospitalName: requestData.hospitalName,
      totalItems: requestData.totalItems,
    });
    onSuccess();
  };

  const isFormValid = hospitalName && coordinatorName && requestDate && deliveryDate && items.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <ClipboardList className="h-6 w-6 text-primary-prosalud" />
        <h2 className="text-2xl font-bold text-gray-900">Nueva Solicitud</h2>
      </div>

      <div className="space-y-6">
        {/* Información Básica */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hospital" className="text-sm font-medium text-gray-700">Hospital *</Label>
                <Select value={hospitalName} onValueChange={setHospitalName}>
                  <SelectTrigger className="bg-gray-50 border-gray-300">
                    <SelectValue placeholder="Seleccionar hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals.map(hospital => (
                      <SelectItem key={hospital} value={hospital}>{hospital}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordinator" className="text-sm font-medium text-gray-700">Coordinador *</Label>
                <Input
                  id="coordinator"
                  value={coordinatorName}
                  onChange={(e) => {
                    // Security: Sanitize coordinator name input
                    const sanitized = sanitizeText(e.target.value, { maxLength: 100, allowSpaces: true });
                    setCoordinatorName(sanitized);
                  }}
                  placeholder="Nombre del coordinador"
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestDate" className="text-sm font-medium text-gray-700">Fecha de Solicitud *</Label>
                <Input
                  id="requestDate"
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">Fecha de Entrega Requerida *</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="generalNotes" className="text-sm font-medium text-gray-700">Notas Generales</Label>
              <Textarea
                id="generalNotes"
                value={generalNotes}
                onChange={(e) => {
                  // Security: Sanitize general notes input
                  const sanitized = sanitizeGeneral(e.target.value, { maxLength: 500 });
                  setGeneralNotes(sanitized);
                }}
                placeholder="Información adicional sobre la solicitud..."
                rows={3}
                className="bg-gray-50 border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agregar Productos */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Agregar Productos Solicitados</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Producto *</Label>
                <Input
                  value={newItem.productName || ''}
                  onChange={(e) => {
                    // Security: Sanitize product name input
                    const sanitized = sanitizeText(e.target.value, { maxLength: 100, allowSpaces: true });
                    setNewItem({...newItem, productName: sanitized});
                  }}
                  placeholder="Nombre del producto"
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Categoría *</Label>
                <Select
                  value={newItem.category || ''}
                  onValueChange={(value) => setNewItem({...newItem, category: value})}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Talla</Label>
                <Select
                  value={newItem.size || ''}
                  onValueChange={(value) => setNewItem({...newItem, size: value})}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Seleccionar talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Color</Label>
                <Select
                  value={newItem.color || ''}
                  onValueChange={(value) => setNewItem({...newItem, color: value})}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Seleccionar color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map(color => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cantidad *</Label>
                <Input
                  type="number"
                  value={newItem.quantity || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setNewItem({...newItem, quantity: 0});
                    } else {
                      const numValue = parseInt(value, 10);
                      setNewItem({...newItem, quantity: isNaN(numValue) ? 0 : numValue});
                    }
                  }}
                  placeholder="0"
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Prioridad *</Label>
                <Select
                  value={newItem.priority || ''}
                  onValueChange={(value) => setNewItem({...newItem, priority: value as 'low' | 'medium' | 'high'})}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">Notas del Producto</Label>
                <Input
                  value={newItem.notes || ''}
                  onChange={(e) => {
                    // Security: Sanitize product notes input
                    const sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
                    setNewItem({...newItem, notes: sanitized});
                  }}
                  placeholder="Notas específicas del producto"
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
            <Button 
              onClick={addItem} 
              className="w-full bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              disabled={!newItem.productName || !newItem.category || !newItem.quantity || !newItem.priority}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Productos */}
        {items.length > 0 && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Productos Solicitados ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Producto</TableHead>
                      <TableHead className="font-semibold text-gray-900">Categoría</TableHead>
                      <TableHead className="font-semibold text-gray-900">Talla</TableHead>
                      <TableHead className="font-semibold text-gray-900">Color</TableHead>
                      <TableHead className="font-semibold text-gray-900">Cantidad</TableHead>
                      <TableHead className="font-semibold text-gray-900">Prioridad</TableHead>
                      <TableHead className="font-semibold text-gray-900">Notas</TableHead>
                      <TableHead className="font-semibold text-gray-900">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.size || '-'}</TableCell>
                        <TableCell>{item.color || '-'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {priorities.find(p => p.value === item.priority)?.label}
                          </span>
                        </TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
        </Card>
        )}

        {/* Acciones */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
          >
            Crear Solicitud
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewRequestForm;
