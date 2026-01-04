import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, MapPin, Truck, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// مراكز محافظة الشرقية - يتم تخزينها محلياً
const DEFAULT_CENTERS = [
  'الزقازيق',
  'بلبيس',
  'منيا القمح',
  'أبو حماد',
  'أبو كبير',
  'فاقوس',
  'الحسينية',
  'ههيا',
  'كفر صقر',
  'أولاد صقر',
  'الإبراهيمية',
  'ديرب نجم',
  'القرين',
  'مشتول السوق',
  'القنايات',
  'العاشر من رمضان',
  'صان الحجر',
];

const AdminCenters: React.FC = () => {
  const { toast } = useToast();
  const [centers, setCenters] = useState<string[]>(DEFAULT_CENTERS);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<string | null>(null);
  const [newCenterName, setNewCenterName] = useState('');
  
  // Delivery settings state
  const [deliveryFee, setDeliveryFee] = useState(50);
  const [deliveryDays, setDeliveryDays] = useState('1-3 أيام');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Fetch delivery settings from database
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDeliveryFee(Number(data.delivery_fee));
          setDeliveryDays(data.delivery_days);
        }
      } catch (err) {
        console.error('Error fetching delivery settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchDeliverySettings();
  }, []);

  const handleSaveDeliverySettings = async () => {
    setSavingSettings(true);
    
    try {
      // First check if settings exist
      const { data: existing } = await supabase
        .from('delivery_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('delivery_settings')
          .update({
            delivery_fee: deliveryFee,
            delivery_days: deliveryDays,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('delivery_settings')
          .insert({
            delivery_fee: deliveryFee,
            delivery_days: deliveryDays,
          });

        if (error) throw error;
      }

      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الشحن بنجاح' });
      setIsEditingSettings(false);
    } catch (err) {
      console.error('Error saving delivery settings:', err);
      toast({ 
        title: 'خطأ', 
        description: 'حدث خطأ أثناء حفظ الإعدادات', 
        variant: 'destructive' 
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCenter = () => {
    if (!newCenterName.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المركز', variant: 'destructive' });
      return;
    }

    if (centers.includes(newCenterName.trim())) {
      toast({ title: 'خطأ', description: 'هذا المركز موجود بالفعل', variant: 'destructive' });
      return;
    }

    setCenters([...centers, newCenterName.trim()]);
    toast({ title: 'تم بنجاح', description: 'تمت إضافة المركز' });
    setNewCenterName('');
    setIsAddDialogOpen(false);
  };

  const handleEditCenter = () => {
    if (!newCenterName.trim() || !editingCenter) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المركز', variant: 'destructive' });
      return;
    }

    if (centers.includes(newCenterName.trim()) && newCenterName.trim() !== editingCenter) {
      toast({ title: 'خطأ', description: 'هذا المركز موجود بالفعل', variant: 'destructive' });
      return;
    }

    setCenters(centers.map(c => c === editingCenter ? newCenterName.trim() : c));
    toast({ title: 'تم بنجاح', description: 'تم تحديث المركز' });
    setNewCenterName('');
    setEditingCenter(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteCenter = (centerName: string) => {
    setCenters(centers.filter(c => c !== centerName));
    toast({ title: 'تم بنجاح', description: 'تم حذف المركز' });
  };

  const openEditDialog = (centerName: string) => {
    setEditingCenter(centerName);
    setNewCenterName(centerName);
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            مراكز محافظة الشرقية ({centers.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            التوصيل متاح لمحافظة الشرقية فقط
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setNewCenterName('')}>
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
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                />
              </div>
              <Button onClick={handleAddCenter} className="w-full">
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Delivery Settings */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <span className="font-bold">إعدادات الشحن</span>
            </div>
            {!isEditingSettings ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditingSettings(true)}>
                <Pencil className="w-4 h-4 ml-2" />
                تعديل
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditingSettings(false)}
                  disabled={savingSettings}
                >
                  إلغاء
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveDeliverySettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  حفظ
                </Button>
              </div>
            )}
          </div>
          
          {loadingSettings ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : isEditingSettings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>مصاريف الشحن (ج.م)</Label>
                <Input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>مدة التوصيل</Label>
                <Input
                  placeholder="مثال: 1-3 أيام"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">مصاريف الشحن:</span>
                <Badge variant="secondary">{deliveryFee} ج.م</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">مدة التوصيل:</span>
                <Badge variant="outline">{deliveryDays}</Badge>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>اسم المركز</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers.map((center, index) => (
                <TableRow key={center}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {center}
                    </div>
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
                              هل أنت متأكد من حذف مركز "{center}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCenter(center)}
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
              <DialogTitle>تعديل المركز</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المركز</Label>
                <Input
                  placeholder="مثال: الزقازيق"
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                />
              </div>
              <Button onClick={handleEditCenter} className="w-full">
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