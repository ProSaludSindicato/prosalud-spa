
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Plus, Trash } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

interface ReturnItem {
  id: string;
  productName: string;
  category: string;
  size?: string;
  color?: string;
  quantity: number;
  condition: 'new' | 'used' | 'damaged';
  reason: string;
}

interface ProcessReturnFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ProcessReturnForm: React.FC<ProcessReturnFormProps> = ({ onClose, onSuccess }) => {
  const [hospitalName, setHospitalName] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<ReturnItem>>({
    productName: '',
    category: '',
    quantity: 0,
    condition: 'new',
    reason: ''
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
  const reasons = [
    { value: 'excess', label: 'Exceso de inventario' },
    { value: 'incorrect', label: 'Producto incorrecto' },
    { value: 'defective', label: 'Producto defectuoso' },
    { value: 'expired', label: 'Producto vencido' },
    { value: 'other', label: 'Otro motivo' }
  ];
  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'used', label: 'Usado' },
    { value: 'damaged', label: 'Dañado' }
  ];

  const addItem = () => {
    if (newItem.productName && newItem.category && newItem.quantity && newItem.condition && newItem.reason) {
      const item: ReturnItem = {
        id: Date.now().toString(),
        productName: newItem.productName,
        category: newItem.category,
        size: newItem.size,
        color: newItem.color,
        quantity: newItem.quantity,
        condition: newItem.condition as 'new' | 'used' | 'damaged',
        reason: newItem.reason
      };
      setItems([...items, item]);
      setNewItem({
        productName: '',
        category: '',
        quantity: 0,
        condition: 'new',
        reason: ''
      });
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    const returnData = {
      hospitalName,
      coordinatorName,
      returnDate,
      returnReason,
      notes,
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0)
    };
    
    logger.debug('Nueva devolución de inventario procesada', {
      hospitalName: returnData.hospitalName,
      totalItems: returnData.totalItems,
    });
    onSuccess();
  };

  const isFormValid = hospitalName && coordinatorName && returnDate && returnReason && items.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <RotateCcw className="h-6 w-6 text-primary-prosalud" />
        <h2 className="text-2xl font-bold text-gray-900">Procesar Devolución</h2>
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
                <Label htmlFor="date" className="text-sm font-medium text-gray-700">Fecha de Devolución *</Label>
                <Input
                  id="date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium text-gray-700">Motivo Principal *</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger className="bg-gray-50 border-gray-300">
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre la devolución..."
                rows={3}
                className="bg-gray-50 border-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agregar Productos */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Agregar Productos a Devolver</CardTitle>
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
                <Label className="text-sm font-medium text-gray-700">Condición *</Label>
                <Select
                  value={newItem.condition || ''}
                  onValueChange={(value) => setNewItem({...newItem, condition: value as 'new' | 'used' | 'damaged'})}
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder="Seleccionar condición" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map(condition => (
                      <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label className="text-sm font-medium text-gray-700">Motivo Específico *</Label>
                <Input
                  value={newItem.reason || ''}
                  onChange={(e) => {
                    // Security: Sanitize reason input
                    const sanitized = sanitizeGeneral(e.target.value, { maxLength: 200 });
                    setNewItem({...newItem, reason: sanitized});
                  }}
                  placeholder="Motivo específico del producto"
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
            <Button 
              onClick={addItem} 
              className="w-full bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
              disabled={!newItem.productName || !newItem.category || !newItem.quantity || !newItem.condition || !newItem.reason}
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
                Productos a Devolver ({items.length})
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
                      <TableHead className="font-semibold text-gray-900">Condición</TableHead>
                      <TableHead className="font-semibold text-gray-900">Motivo</TableHead>
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
                            item.condition === 'new' ? 'bg-green-100 text-green-700' :
                            item.condition === 'used' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {conditions.find(c => c.value === item.condition)?.label}
                          </span>
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
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
            Procesar Devolución
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessReturnForm;
