import React, { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Center {
  id: string;
  name: string;
  delivery_fee: number;
  delivery_days: string;
  is_active: boolean;
}

const AdminCenters: React.FC = () => {
  const { toast } = useToast();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    delivery_fee: 50,
    delivery_days: '1-3 أيام',
    is_active: true,
  });

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('sharqia_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCenters(data || []);
    } catch (err) {
      console.error('Error fetching centers:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ في تحميل المراكز', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      delivery_fee: 50,
      delivery_days: '1-3 أيام',
      is_active: true,
    });
  };

  const handleAddCenter = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المركز', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sharqia_centers')
        .insert({
          name: formData.name.trim(),
          delivery_fee: formData.delivery_fee,
          delivery_days: formData.delivery_days,
          is_active: formData.is_active,
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'خطأ', description: 'هذا المركز موجود بالفعل', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'تم بنجاح', description: 'تمت إضافة المركز' });
      resetForm();
      setIsAddDialogOpen(false);
      fetchCenters();
    } catch (err) {
      console.error('Error adding center:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة المركز', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCenter = async () => {
    if (!formData.name.trim() || !editingCenter) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المركز', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sharqia_centers')
        .update({
          name: formData.name.trim(),
          delivery_fee: formData.delivery_fee,
          delivery_days: formData.delivery_days,
          is_active: formData.is_active,
        })
        .eq('id', editingCenter.id);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'خطأ', description: 'هذا المركز موجود بالفعل', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'تم بنجاح', description: 'تم تحديث المركز' });
      resetForm();
      setEditingCenter(null);
      setIsEditDialogOpen(false);
      fetchCenters();
    } catch (err) {
      console.error('Error updating center:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث المركز', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCenter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sharqia_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم حذف المركز' });
      fetchCenters();
    } catch (err) {
      console.error('Error deleting center:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف المركز', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (center: Center) => {
    try {
      const { error } = await supabase
        .from('sharqia_centers')
        .update({ is_active: !center.is_active })
        .eq('id', center.id);

      if (error) throw error;

      toast({ 
        title: 'تم بنجاح', 
        description: center.is_active ? 'تم تعطيل المركز' : 'تم تفعيل المركز' 
      });
      fetchCenters();
    } catch (err) {
      console.error('Error toggling center:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const openEditDialog = (center: Center) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      delivery_fee: center.delivery_fee,
      delivery_days: center.delivery_days,
      is_active: center.is_active,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            مراكز محافظة الشرقية ({centers.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المراكز وأسعار التوصيل لكل مركز
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مركز
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مركز جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المركز</Label>
                <Input
                  placeholder="مثال: الزقازيق"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التوصيل (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة التوصيل</Label>
                <Input
                  placeholder="مثال: 1-3 أيام"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعّل</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button onClick={handleAddCenter} className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>اسم المركز</TableHead>
                <TableHead>سعر التوصيل</TableHead>
                <TableHead>مدة التوصيل</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers.map((center, index) => (
                <TableRow key={center.id} className={!center.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {center.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{center.delivery_fee} ج.م</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{center.delivery_days}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={center.is_active}
                      onCheckedChange={() => handleToggleActive(center)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(center)}
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
                            <AlertDialogTitle>حذف المركز</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف مركز "{center.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCenter(center.id)}
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingCenter(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المركز</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المركز</Label>
                <Input
                  placeholder="مثال: الزقازيق"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التوصيل (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة التوصيل</Label>
                <Input
                  placeholder="مثال: 1-3 أيام"
                  value={formData.delivery_days}
                  onChange={(e) => setFormData({ ...formData, delivery_days: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعّل</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button onClick={handleEditCenter} className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ التغييرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminCenters;
