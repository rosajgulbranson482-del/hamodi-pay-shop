import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Plus, Pencil, Trash2, Star, Loader2, Home } from 'lucide-react';

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  governorate: string;
  area: string | null;
  address: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface Governorate { id: string; name: string; }
interface DeliveryArea { id: string; governorate_id: string; name: string; }

interface AddressManagerProps {
  userId: string;
}

const emptyForm = {
  label: 'المنزل',
  recipient_name: '',
  phone: '',
  governorate: '',
  area: '',
  address: '',
  is_default: false,
};

const AddressManager: React.FC<AddressManagerProps> = ({ userId }) => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [addrRes, govRes, areaRes] = await Promise.all([
      supabase.from('customer_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('governorates').select('id,name').eq('is_active', true).order('name'),
      supabase.from('delivery_areas').select('id,governorate_id,name').eq('is_active', true).order('name'),
    ]);
    if (addrRes.data) setAddresses(addrRes.data as CustomerAddress[]);
    if (govRes.data) setGovernorates(govRes.data);
    if (areaRes.data) setDeliveryAreas(areaRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (userId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, is_default: addresses.length === 0 });
    setDialogOpen(true);
  };

  const openEdit = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    // For governorate/area, we stored names; map back to ids when possible
    const gov = governorates.find((g) => g.name === addr.governorate);
    const area = deliveryAreas.find((a) => a.name === (addr.area || ''));
    setForm({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      governorate: gov?.id || '',
      area: area?.id || '',
      address: addr.address,
      is_default: addr.is_default,
    });
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.recipient_name.trim()) return 'اسم المستلم مطلوب';
    if (!/^01[0-9]{9}$/.test(form.phone)) return 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقم';
    if (!form.governorate) return 'يرجى اختيار المحافظة';
    if (!form.address.trim()) return 'العنوان التفصيلي مطلوب';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);

    const govName = governorates.find((g) => g.id === form.governorate)?.name || '';
    const areaName = form.area ? deliveryAreas.find((a) => a.id === form.area)?.name || null : null;

    // If marking as default, clear other defaults first
    if (form.is_default) {
      await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', userId).neq('id', editingId || '00000000-0000-0000-0000-000000000000');
    }

    const payload = {
      user_id: userId,
      label: form.label.trim() || 'العنوان',
      recipient_name: form.recipient_name.trim(),
      phone: form.phone.trim(),
      governorate: govName,
      area: areaName,
      address: form.address.trim(),
      is_default: form.is_default,
    };

    const { error } = editingId
      ? await supabase.from('customer_addresses').update(payload).eq('id', editingId)
      : await supabase.from('customer_addresses').insert(payload);

    setSaving(false);
    if (error) {
      toast.error('تعذّر حفظ العنوان');
      console.error(error);
      return;
    }
    toast.success(editingId ? 'تم تحديث العنوان' : 'تم إضافة العنوان');
    setDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
    if (error) { toast.error('تعذّر الحذف'); return; }
    toast.success('تم حذف العنوان');
    loadData();
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', userId);
    const { error } = await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    if (error) { toast.error('تعذّر التعيين كافتراضي'); return; }
    toast.success('تم تعيينه كعنوان افتراضي');
    loadData();
  };

  const areasForSelectedGov = deliveryAreas.filter((a) => a.governorate_id === form.governorate);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            عناوين الشحن
          </CardTitle>
          <CardDescription>أضف عناوين متعددة واختر الافتراضي للطلبات</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل العنوان' : 'عنوان جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>تسمية (المنزل / العمل ...)</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <Label>اسم المستلم *</Label>
                <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
              </div>
              <div>
                <Label>رقم الهاتف *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" maxLength={11} placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <Label>المحافظة *</Label>
                <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v, area: '' })}>
                  <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                  <SelectContent>
                    {governorates.map((g) => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {areasForSelectedGov.length > 0 && (
                <div>
                  <Label>المنطقة</Label>
                  <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                    <SelectContent>
                      {areasForSelectedGov.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>العنوان التفصيلي *</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} placeholder="الشارع، رقم المبنى، الدور، علامة مميزة" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                <span className="text-sm">تعيين كعنوان افتراضي</span>
              </label>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Home className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد عناوين محفوظة. أضف عنوانك الأول.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{addr.label}</span>
                    {addr.is_default && (
                      <Badge variant="default" className="gap-1 text-[10px]">
                        <Star className="h-3 w-3" /> افتراضي
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{addr.recipient_name} • <span dir="ltr">{addr.phone}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {addr.governorate}{addr.area ? ` - ${addr.area}` : ''} - {addr.address}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {!addr.is_default && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetDefault(addr.id)} title="تعيين كافتراضي">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(addr)} title="تعديل">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف العنوان؟</AlertDialogTitle>
                        <AlertDialogDescription>لا يمكن التراجع. الطلبات السابقة لن تتأثر.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(addr.id)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressManager;
