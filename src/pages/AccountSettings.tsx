import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { governorates } from '@/data/governorates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, Loader2, User, MapPin, Phone, Save } from 'lucide-react';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, profile, loading, isAuthenticated, updateProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [defaultGovernorate, setDefaultGovernorate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDefaultAddress(profile.default_address || '');
      setDefaultGovernorate(profile.default_governorate || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('يرجى إدخال الاسم الكامل');
      return;
    }

    if (!phone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }

    setSaving(true);
    
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim(),
      default_address: defaultAddress.trim() || null,
      default_governorate: defaultGovernorate || null,
    });

    setSaving(false);

    if (error) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
      console.error('Profile update error:', error);
    } else {
      toast.success('تم حفظ البيانات بنجاح');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">إعدادات الحساب</CardTitle>
              <CardDescription>
                قم بتعديل بياناتك الشخصية والعنوان الافتراضي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    الاسم الكامل *
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    رقم الهاتف *
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="أدخل رقم هاتفك"
                    required
                    dir="ltr"
                    className="text-right"
                  />
                </div>

                {/* Default Governorate */}
                <div className="space-y-2">
                  <Label htmlFor="governorate" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    المحافظة الافتراضية
                  </Label>
                  <Select value={defaultGovernorate} onValueChange={setDefaultGovernorate}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {governorates.map((gov) => (
                        <SelectItem key={gov.id} value={gov.name}>
                          {gov.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    العنوان الافتراضي
                  </Label>
                  <Textarea
                    id="address"
                    value={defaultAddress}
                    onChange={(e) => setDefaultAddress(e.target.value)}
                    placeholder="أدخل عنوانك التفصيلي"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
