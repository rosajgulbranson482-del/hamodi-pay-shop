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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, MapPin, Loader2, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Governorate {
  id: string;
  name: string;
  delivery_fee: number;
  delivery_days: string;
  is_active: boolean;
}

interface DeliveryArea {
  id: string;
  governorate_id: string;
  name: string;
  delivery_fee: number;
  delivery_days: string;
  is_active: boolean;
}

const AdminDeliveryAreas: React.FC = () => {
  const { toast } = useToast();
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddGovDialogOpen, setIsAddGovDialogOpen] = useState(false);
  const [isEditGovDialogOpen, setIsEditGovDialogOpen] = useState(false);
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);
  const [isEditAreaDialogOpen, setIsEditAreaDialogOpen] = useState(false);
  const [editingGovernorate, setEditingGovernorate] = useState<Governorate | null>(null);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('');
  const [expandedGovernorates, setExpandedGovernorates] = useState<Set<string>>(new Set());
  
  const [govFormData, setGovFormData] = useState({
    name: '',
    delivery_fee: 50,
    delivery_days: '2-3 أيام',
    is_active: true,
  });

  const [areaFormData, setAreaFormData] = useState({
    governorate_id: '',
    name: '',
    delivery_fee: 50,
    delivery_days: '2-3 أيام',
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const [govResult, areasResult] = await Promise.all([
        supabase.from('governorates').select('*').order('name'),
        supabase.from('delivery_areas').select('*').order('name'),
      ]);

      if (govResult.error) throw govResult.error;
      if (areasResult.error) throw areasResult.error;

      setGovernorates(govResult.data || []);
      setAreas(areasResult.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ في تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetGovForm = () => {
    setGovFormData({
      name: '',
      delivery_fee: 50,
      delivery_days: '2-3 أيام',
      is_active: true,
    });
  };

  const resetAreaForm = () => {
    setAreaFormData({
      governorate_id: '',
      name: '',
      delivery_fee: 50,
      delivery_days: '2-3 أيام',
      is_active: true,
    });
  };

  // Governorate CRUD
  const handleAddGovernorate = async () => {
    if (!govFormData.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المحافظة', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('governorates').insert({
        name: govFormData.name.trim(),
        delivery_fee: govFormData.delivery_fee,
        delivery_days: govFormData.delivery_days,
        is_active: govFormData.is_active,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'خطأ', description: 'هذه المحافظة موجودة بالفعل', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'تم بنجاح', description: 'تمت إضافة المحافظة' });
      resetGovForm();
      setIsAddGovDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error adding governorate:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة المحافظة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGovernorate = async () => {
    if (!govFormData.name.trim() || !editingGovernorate) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('governorates')
        .update({
          name: govFormData.name.trim(),
          delivery_fee: govFormData.delivery_fee,
          delivery_days: govFormData.delivery_days,
          is_active: govFormData.is_active,
        })
        .eq('id', editingGovernorate.id);

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم تحديث المحافظة' });
      resetGovForm();
      setEditingGovernorate(null);
      setIsEditGovDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error updating governorate:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث المحافظة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGovernorate = async (id: string) => {
    try {
      const { error } = await supabase.from('governorates').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم حذف المحافظة' });
      fetchData();
    } catch (err) {
      console.error('Error deleting governorate:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف المحافظة', variant: 'destructive' });
    }
  };

  const handleToggleGovernorate = async (gov: Governorate) => {
    try {
      const { error } = await supabase
        .from('governorates')
        .update({ is_active: !gov.is_active })
        .eq('id', gov.id);

      if (error) throw error;
      toast({ title: 'تم بنجاح', description: gov.is_active ? 'تم تعطيل المحافظة' : 'تم تفعيل المحافظة' });
      fetchData();
    } catch (err) {
      console.error('Error toggling governorate:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  // Area CRUD
  const handleAddArea = async () => {
    if (!areaFormData.name.trim() || !areaFormData.governorate_id) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع البيانات', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('delivery_areas').insert({
        governorate_id: areaFormData.governorate_id,
        name: areaFormData.name.trim(),
        delivery_fee: areaFormData.delivery_fee,
        delivery_days: areaFormData.delivery_days,
        is_active: areaFormData.is_active,
      });

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تمت إضافة المنطقة' });
      resetAreaForm();
      setIsAddAreaDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error adding area:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة المنطقة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditArea = async () => {
    if (!areaFormData.name.trim() || !editingArea) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('delivery_areas')
        .update({
          governorate_id: areaFormData.governorate_id,
          name: areaFormData.name.trim(),
          delivery_fee: areaFormData.delivery_fee,
          delivery_days: areaFormData.delivery_days,
          is_active: areaFormData.is_active,
        })
        .eq('id', editingArea.id);

      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم تحديث المنطقة' });
      resetAreaForm();
      setEditingArea(null);
      setIsEditAreaDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error updating area:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث المنطقة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArea = async (id: string) => {
    try {
      const { error } = await supabase.from('delivery_areas').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'تم بنجاح', description: 'تم حذف المنطقة' });
      fetchData();
    } catch (err) {
      console.error('Error deleting area:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف المنطقة', variant: 'destructive' });
    }
  };

  const handleToggleArea = async (area: DeliveryArea) => {
    try {
      const { error } = await supabase
        .from('delivery_areas')
        .update({ is_active: !area.is_active })
        .eq('id', area.id);

      if (error) throw error;
      toast({ title: 'تم بنجاح', description: area.is_active ? 'تم تعطيل المنطقة' : 'تم تفعيل المنطقة' });
      fetchData();
    } catch (err) {
      console.error('Error toggling area:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ', variant: 'destructive' });
    }
  };

  const openEditGovDialog = (gov: Governorate) => {
    setEditingGovernorate(gov);
    setGovFormData({
      name: gov.name,
      delivery_fee: gov.delivery_fee,
      delivery_days: gov.delivery_days,
      is_active: gov.is_active,
    });
    setIsEditGovDialogOpen(true);
  };

  const openEditAreaDialog = (area: DeliveryArea) => {
    setEditingArea(area);
    setAreaFormData({
      governorate_id: area.governorate_id,
      name: area.name,
      delivery_fee: area.delivery_fee,
      delivery_days: area.delivery_days,
      is_active: area.is_active,
    });
    setIsEditAreaDialogOpen(true);
  };

  const openAddAreaDialog = (govId?: string) => {
    if (govId) {
      setAreaFormData(prev => ({ ...prev, governorate_id: govId }));
    }
    setIsAddAreaDialogOpen(true);
  };

  const toggleExpand = (govId: string) => {
    setExpandedGovernorates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(govId)) {
        newSet.delete(govId);
      } else {
        newSet.add(govId);
      }
      return newSet;
    });
  };

  const getAreasForGovernorate = (govId: string) => {
    return areas.filter(area => area.governorate_id === govId);
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
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            إدارة مناطق التوصيل ({governorates.length} محافظة - {areas.length} منطقة)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة المحافظات والمناطق وأسعار التوصيل
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddGovDialogOpen} onOpenChange={(open) => {
            setIsAddGovDialogOpen(open);
            if (!open) resetGovForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                محافظة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة محافظة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المحافظة</Label>
                  <Input
                    placeholder="مثال: القاهرة"
                    value={govFormData.name}
                    onChange={(e) => setGovFormData({ ...govFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>سعر التوصيل الافتراضي (ج.م)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={govFormData.delivery_fee}
                    onChange={(e) => setGovFormData({ ...govFormData, delivery_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>مدة التوصيل</Label>
                  <Input
                    placeholder="مثال: 2-3 أيام"
                    value={govFormData.delivery_days}
                    onChange={(e) => setGovFormData({ ...govFormData, delivery_days: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>مفعّلة</Label>
                  <Switch
                    checked={govFormData.is_active}
                    onCheckedChange={(checked) => setGovFormData({ ...govFormData, is_active: checked })}
                  />
                </div>
                <Button onClick={handleAddGovernorate} className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  إضافة
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddAreaDialogOpen} onOpenChange={(open) => {
            setIsAddAreaDialogOpen(open);
            if (!open) resetAreaForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                منطقة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة منطقة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>المحافظة</Label>
                  <Select
                    value={areaFormData.governorate_id}
                    onValueChange={(value) => setAreaFormData({ ...areaFormData, governorate_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {governorates.filter(g => g.is_active).map((gov) => (
                        <SelectItem key={gov.id} value={gov.id}>
                          {gov.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>اسم المنطقة</Label>
                  <Input
                    placeholder="مثال: مدينة نصر"
                    value={areaFormData.name}
                    onChange={(e) => setAreaFormData({ ...areaFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>سعر التوصيل (ج.م)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={areaFormData.delivery_fee}
                    onChange={(e) => setAreaFormData({ ...areaFormData, delivery_fee: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>مدة التوصيل</Label>
                  <Input
                    placeholder="مثال: 1-2 أيام"
                    value={areaFormData.delivery_days}
                    onChange={(e) => setAreaFormData({ ...areaFormData, delivery_days: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>مفعّلة</Label>
                  <Switch
                    checked={areaFormData.is_active}
                    onCheckedChange={(checked) => setAreaFormData({ ...areaFormData, is_active: checked })}
                  />
                </div>
                <Button onClick={handleAddArea} className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  إضافة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {governorates.map((gov) => {
            const govAreas = getAreasForGovernorate(gov.id);
            const isExpanded = expandedGovernorates.has(gov.id);

            return (
              <div key={gov.id} className={`border rounded-lg ${!gov.is_active ? 'opacity-50' : ''}`}>
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(gov.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Globe className="w-5 h-5 text-primary" />
                    <div>
                      <span className="font-medium">{gov.name}</span>
                      <span className="text-sm text-muted-foreground mr-2">
                        ({govAreas.length} منطقة)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="secondary">{gov.delivery_fee} ج.م</Badge>
                    <Badge variant="outline">{gov.delivery_days}</Badge>
                    <Switch
                      checked={gov.is_active}
                      onCheckedChange={() => handleToggleGovernorate(gov)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditGovDialog(gov)}>
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
                            هل أنت متأكد من حذف "{gov.name}"؟ سيتم حذف جميع المناطق التابعة لها.
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
                </div>

                {isExpanded && (
                  <div className="border-t p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">مناطق {gov.name}</h4>
                      <Button size="sm" variant="outline" onClick={() => openAddAreaDialog(gov.id)}>
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة منطقة
                      </Button>
                    </div>
                    {govAreas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        لا توجد مناطق. سيتم استخدام سعر التوصيل الافتراضي للمحافظة.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>المنطقة</TableHead>
                              <TableHead>سعر التوصيل</TableHead>
                              <TableHead>مدة التوصيل</TableHead>
                              <TableHead>الحالة</TableHead>
                              <TableHead>الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {govAreas.map((area) => (
                              <TableRow key={area.id} className={!area.is_active ? 'opacity-50' : ''}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    {area.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{area.delivery_fee} ج.م</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{area.delivery_days}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={area.is_active}
                                    onCheckedChange={() => handleToggleArea(area)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditAreaDialog(area)}
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
                                          <AlertDialogTitle>حذف المنطقة</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            هل أنت متأكد من حذف "{area.name}"؟
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteArea(area.id)}
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Edit Governorate Dialog */}
        <Dialog open={isEditGovDialogOpen} onOpenChange={(open) => {
          setIsEditGovDialogOpen(open);
          if (!open) {
            resetGovForm();
            setEditingGovernorate(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المحافظة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المحافظة</Label>
                <Input
                  value={govFormData.name}
                  onChange={(e) => setGovFormData({ ...govFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التوصيل الافتراضي (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={govFormData.delivery_fee}
                  onChange={(e) => setGovFormData({ ...govFormData, delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة التوصيل</Label>
                <Input
                  value={govFormData.delivery_days}
                  onChange={(e) => setGovFormData({ ...govFormData, delivery_days: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعّلة</Label>
                <Switch
                  checked={govFormData.is_active}
                  onCheckedChange={(checked) => setGovFormData({ ...govFormData, is_active: checked })}
                />
              </div>
              <Button onClick={handleEditGovernorate} className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ التغييرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Area Dialog */}
        <Dialog open={isEditAreaDialogOpen} onOpenChange={(open) => {
          setIsEditAreaDialogOpen(open);
          if (!open) {
            resetAreaForm();
            setEditingArea(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل المنطقة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>المحافظة</Label>
                <Select
                  value={areaFormData.governorate_id}
                  onValueChange={(value) => setAreaFormData({ ...areaFormData, governorate_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map((gov) => (
                      <SelectItem key={gov.id} value={gov.id}>
                        {gov.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اسم المنطقة</Label>
                <Input
                  value={areaFormData.name}
                  onChange={(e) => setAreaFormData({ ...areaFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التوصيل (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={areaFormData.delivery_fee}
                  onChange={(e) => setAreaFormData({ ...areaFormData, delivery_fee: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة التوصيل</Label>
                <Input
                  value={areaFormData.delivery_days}
                  onChange={(e) => setAreaFormData({ ...areaFormData, delivery_days: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>مفعّلة</Label>
                <Switch
                  checked={areaFormData.is_active}
                  onCheckedChange={(checked) => setAreaFormData({ ...areaFormData, is_active: checked })}
                />
              </div>
              <Button onClick={handleEditArea} className="w-full" disabled={saving}>
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

export default AdminDeliveryAreas;
