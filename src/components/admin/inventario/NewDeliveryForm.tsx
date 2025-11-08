
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface DeliveryItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface NewDeliveryFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const NewDeliveryForm: React.FC<NewDeliveryFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    deliveryDate: '',
    invoiceNumber: '',
    totalAmount: 0
  });
  const [items, setItems] = useState<DeliveryItem[]>([
    { productName: '', quantity: 0, unitPrice: 0 }
  ]);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);

    if (field === 'quantity' || field === 'unitPrice') {
      recalculateTotalAmount(updatedItems);
    }
  };

  const recalculateTotalAmount = (updatedItems: DeliveryItem[]) => {
    const newTotalAmount = updatedItems.reduce((acc, item) => {
      return acc + (Number(item.quantity) * Number(item.unitPrice));
    }, 0);

    setFormData(prevData => ({
      ...prevData,
      totalAmount: newTotalAmount
    }));
  };

  const addItem = () => {
    setItems([...items, { productName: '', quantity: 0, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    recalculateTotalAmount(updatedItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName || !formData.deliveryDate || items.some(item => !item.productName || item.quantity <= 0)) {
      toast({
        title: "Error de Validación",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    logger.debug('Registrando nueva entrega de inventario', {
      supplierName: formData.supplierName,
      totalItems: items.length,
    });
    
    if (onSuccess) {
      onSuccess();
    } else {
      toast({
        title: "Entrega Registrada",
        description: "La nueva entrega ha sido registrada exitosamente",
        variant: "default"
      });
      onClose();
    }
  };

  const isFormValid = formData.supplierName && formData.deliveryDate && items.some(item => item.productName && item.quantity > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <Truck className="h-6 w-6 text-primary-prosalud" />
        <h2 className="text-2xl font-bold text-gray-900">Registrar Nueva Entrega</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName" className="text-sm font-medium text-gray-700">
                  Proveedor *
                </Label>
                <Input
                  type="text"
                  id="supplierName"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleInputChange}
                  placeholder="Nombre del proveedor"
                  className="bg-gray-50 border-gray-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">
                  Fecha de Entrega *
                </Label>
                <Input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  className="bg-gray-50 border-gray-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-sm font-medium text-gray-700">
                  Número de Factura
                </Label>
                <Input
                  type="text"
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  placeholder="Número de factura"
                  className="bg-gray-50 border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount" className="text-sm font-medium text-gray-700">
                  Monto Total
                </Label>
                <Input
                  type="number"
                  id="totalAmount"
                  name="totalAmount"
                  value={formData.totalAmount}
                  readOnly
                  placeholder="Monto total calculado"
                  className="bg-gray-100 border-gray-300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Entregados */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900">Items Entregados</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Producto *</Label>
                    <Input
                      type="text"
                      placeholder="Nombre del producto"
                      value={item.productName}
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      className="bg-white border-gray-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Cantidad *</Label>
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      value={item.quantity || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          handleItemChange(index, 'quantity', 0);
                        } else {
                          const numValue = Number(value);
                          handleItemChange(index, 'quantity', isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      className="bg-white border-gray-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Precio Unitario</Label>
                    <Input
                      type="number"
                      placeholder="Precio"
                      value={item.unitPrice || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          handleItemChange(index, 'unitPrice', 0);
                        } else {
                          const numValue = Number(value);
                          handleItemChange(index, 'unitPrice', isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      className="bg-white border-gray-300"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addItem}
              className="w-full border-primary-prosalud text-primary-prosalud hover:bg-primary-prosalud hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={!isFormValid}
            className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white"
          >
            Registrar Entrega
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewDeliveryForm;
