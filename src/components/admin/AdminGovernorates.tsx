import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, MapPin, Loader2, Truck } from 'lucide-react';

interface Governorate {
  id: string;
  name: string;
  delivery_fee: number;
  delivery_days: string;
  is_active: boolean;
  created_at: string;
}

const AdminGovernorates: React.FC = () => {
  const { toast } = useToast();
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGovernorate, setEditingGovernorate] = useState<Governorate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    delivery_fee: '',
    delivery_days: '',
    is_active: true,
  });

  useEffect(() => {
    fetchGovernorates();
  }, []);

  const fetchGovernorates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('governorates')
      .select('*')
      .order('name');

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المحافظات', variant: 'destructive' });
    } else {
      setGovernorates(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      delivery_fee: '',
      delivery_days: '',
      is_active: true,
    });
  };

  const handleAddGovernorate = async () => {
    if (!formData.name || !formData.delivery_fee || !formData.delivery_days) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('governorates').insert({
      name: formData.name,
      delivery_fee: parseFloat(formData.delivery_fee),
      delivery_days: formData.delivery_days,
      is_active: formData.is_active,
    });

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: 'تمت إضافة المحافظة' });
      setIsAddDialogOpen(false);
      resetForm();
      fetchGovernorates();
    }
    setSubmitting(false);
  };

  const handleEditGovernorate = async () => {
    if (!editingGovernorate || !formData.name || !formData.delivery_fee || !formData.delivery_days) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('governorates')
      .update({
        name: formData.name,
        delivery_fee: parseFloat(formData.delivery_fee),
        delivery_days: formData.delivery_days,
        is_active: formData.is_active,
      })
      .eq('id', editingGovernorate.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: 'تم تحديث المحافظة' });
      setIsEditDialogOpen(false);
      setEditingGovernorate(null);
      resetForm();
      fetchGovernorates();
    }
    setSubmitting(false);
  };

  const handleDeleteGovernorate = async (id: string) => {
    const { error } = await supabase.from('governorates').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: 'تم حذف المحافظة' });
      fetchGovernorates();
    }
  };

  const handleToggleActive = async (gov: Governorate) => {
    const { error } = await supabase
      .from('governorates')
      .update({ is_active: !gov.is_active })
      .eq('id', gov.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      fetchGovernorates();
    }
  };

  const openEditDialog = (gov: Governorate) => {
    setEditingGovernorate(gov);
    setFormData({
      name: gov.name,
      delivery_fee: gov.delivery_fee.toString(),
      delivery_days: gov.delivery_days,
      is_active: gov.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const GovernorateForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>اسم المحافظة</Label>
        <Input
          placeholder="مثال: القاهرة"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>مصاريف الشحن (ج.م)</Label>
        <Input
          type="number"
          placeholder="50"
          value={formData.delivery_fee}
          onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>مدة التوصيل</Label>
        <Input
          placeholder="مثال: 2-3 أيام"
          value={formData.delivery_days}
          onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>مفعّلة</Label>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>
      <Button onClick={onSubmit} className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          إدارة المحافظات ({governorates.length})
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة محافظة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة محافظة جديدة</DialogTitle>
            </DialogHeader>
            <GovernorateForm onSubmit={handleAddGovernorate} submitLabel="إضافة" />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المحافظة</TableHead>
                <TableHead>مصاريف الشحن</TableHead>
                <TableHead>مدة التوصيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {governorates.map((gov) => (
                <TableRow key={gov.id}>
                  <TableCell className="font-medium">{gov.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      {gov.delivery_fee} ج.م
                    </div>
                  </TableCell>
                  <TableCell>{gov.delivery_days}</TableCell>
                  <TableCell>
                    <Switch
                      checked={gov.is_active}
                      onCheckedChange={() => handleToggleActive(gov)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(gov)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف المحافظة</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف محافظة "{gov.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGovernorate(gov.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المحافظة</DialogTitle>
            </DialogHeader>
            <GovernorateForm onSubmit={handleEditGovernorate} submitLabel="حفظ التغييرات" />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminGovernorates;
