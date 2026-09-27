import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, MapPin, User, MessageSquare, Copy, Check, Wallet, Banknote, Ticket, Loader2, Mail, ArrowRight, ShoppingBag, Trash2, Plus, Minus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CartProvider } from '@/context/CartContext';
import CouponSuggestion from '@/components/CouponSuggestion';

interface AppliedCoupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
}

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

const PAYMENT_NUMBER = "01025529130";
const WHATSAPP_NUMBER = "201025529130";

type PaymentMethod = 'cash_on_delivery' | 'vodafone_cash' | '';

const paymentMethods = [
  {
    id: 'cash_on_delivery' as const,
    name: 'الدفع عند الاستلام',
    icon: Banknote,
    description: 'ادفع كاش عند استلام طلبك',
    emoji: '💵',
  },
  {
    id: 'vodafone_cash' as const,
    name: 'فودافون كاش / انستا باي',
    icon: Wallet,
    description: 'تحويل إلكتروني قبل الشحن',
    emoji: '📱',
  },
];

const CheckoutContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, totalPrice, clearCart, removeFromCart, updateQuantity } = useCart();
  const { user, profile, isAuthenticated, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    governorate: '',
    governorateId: '',
    area: '',
    address: '',
    notes: '',
    verificationCode: '',
    paymentMethod: '' as PaymentMethod,
  });
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  
  // Delivery settings state
  const [deliveryFee, setDeliveryFee] = useState(50);
  const [deliveryDays, setDeliveryDays] = useState('2-3 أيام');
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<DeliveryArea[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Free delivery settings
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0);
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState(50);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/');
    }
  }, [items.length, navigate]);

  // Fetch governorates and areas from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [govResult, areasResult, settingsResult] = await Promise.all([
          supabase.from('governorates').select('*').eq('is_active', true).order('name'),
          supabase.from('delivery_areas').select('*').eq('is_active', true).order('name'),
          supabase.from('delivery_settings').select('*').limit(1).single(),
        ]);

        if (govResult.error) throw govResult.error;
        if (areasResult.error) throw areasResult.error;

        setGovernorates(govResult.data || []);
        setAreas(areasResult.data || []);
        
        if (settingsResult.data) {
          setFreeDeliveryEnabled(settingsResult.data.free_delivery_enabled || false);
          setFreeDeliveryThreshold(settingsResult.data.free_delivery_threshold || 0);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Filter areas when governorate changes
  useEffect(() => {
    if (formData.governorateId) {
      const govAreas = areas.filter(a => a.governorate_id === formData.governorateId);
      setFilteredAreas(govAreas);
      // Reset area when governorate changes
      setFormData(prev => ({ ...prev, area: '' }));
      // Set default delivery fee from governorate if no areas
      const selectedGov = governorates.find(g => g.id === formData.governorateId);
      if (selectedGov && govAreas.length === 0) {
        setOriginalDeliveryFee(selectedGov.delivery_fee);
        setDeliveryDays(selectedGov.delivery_days);
      }
    }
  }, [formData.governorateId, areas, governorates]);

  // Update delivery fee when area changes
  useEffect(() => {
    if (formData.area) {
      const selectedArea = filteredAreas.find(a => a.name === formData.area);
      if (selectedArea) {
        setOriginalDeliveryFee(selectedArea.delivery_fee);
        setDeliveryDays(selectedArea.delivery_days);
      }
    }
  }, [formData.area, filteredAreas]);

  // Calculate actual delivery fee based on free delivery threshold
  useEffect(() => {
    if (freeDeliveryEnabled && totalPrice >= freeDeliveryThreshold && freeDeliveryThreshold > 0) {
      setDeliveryFee(0);
    } else {
      setDeliveryFee(originalDeliveryFee);
    }
  }, [freeDeliveryEnabled, freeDeliveryThreshold, totalPrice, originalDeliveryFee]);

  // Update delivery fee when area changes
  useEffect(() => {
    if (formData.area) {
      const selectedArea = filteredAreas.find(a => a.name === formData.area);
      if (selectedArea) {
        setDeliveryFee(selectedArea.delivery_fee);
        setDeliveryDays(selectedArea.delivery_days);
      }
    }
  }, [formData.area, filteredAreas]);


  // Show welcome message when returning after login
  useEffect(() => {
    const fromAuth = searchParams.get('from');
    if (fromAuth === 'auth' && isAuthenticated) {
      toast({
        title: "مرحباً بعودتك! 👋",
        description: "يمكنك الآن إكمال طلبك",
      });
      // Remove the query param after showing the message
      setSearchParams({});
    }
  }, [isAuthenticated, searchParams, setSearchParams, toast]);

  // Pre-fill form with profile data when authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.full_name || prev.name,
        phone: profile.phone || prev.phone,
        address: profile.default_address || prev.address,
      }));
    }
  }, [isAuthenticated, profile]);

  const discountAmount = appliedCoupon?.discount_amount || 0;
  const finalTotal = Math.max(0, totalPrice + deliveryFee - discountAmount);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponCode;
    if (!code.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال كود الكوبون", variant: "destructive" });
      return;
    }

    if (codeToApply) {
      setCouponCode(codeToApply);
    }

    setApplyingCoupon(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: code,
          orderTotal: totalPrice,
        }
      });

      if (error) {
        toast({ title: "خطأ", description: "حدث خطأ في التحقق من الكوبون", variant: "destructive" });
        setApplyingCoupon(false);
        return;
      }

      if (!data.valid) {
        toast({ title: "خطأ", description: data.error || "كود الكوبون غير صالح", variant: "destructive" });
        setApplyingCoupon(false);
        return;
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discount_type: data.coupon.discount_type as 'percentage' | 'fixed',
        discount_value: data.coupon.discount_value,
        discount_amount: data.coupon.discount_amount,
      });

      toast({ 
        title: "تم تطبيق الكوبون! 🎉", 
        description: `تم خصم ${data.coupon.discount_amount} ج.م من طلبك` 
      });
    } catch (err) {
      console.error('Coupon validation error:', err);
      toast({ title: "خطأ", description: "حدث خطأ في التحقق من الكوبون", variant: "destructive" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleSaveAsDefault = async () => {
    if (!isAuthenticated || !formData.address) return;
    
    setSavingAddress(true);
    
    const { error } = await updateProfile({
      default_address: `${formData.governorate} - ${formData.area} - ${formData.address}`,
      default_governorate: formData.governorate,
    });
    
    setSavingAddress(false);
    
    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ العنوان",
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ العنوان كعنوان افتراضي",
      });
    }
  };


  const copyPaymentNumber = () => {
    navigator.clipboard.writeText(PAYMENT_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "تم النسخ",
      description: "تم نسخ رقم الدفع بنجاح",
    });
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^01[0-9]{9}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmitOrder = () => {
    if (!isAuthenticated) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب تسجيل الدخول أولاً لإتمام الطلب",
        variant: "destructive",
      });
      navigate('/auth?redirect=checkout');
      return;
    }

    if (!formData.name || !formData.phone || !formData.governorate || !formData.address) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast({
        title: "خطأ في رقم الهاتف",
        description: "يجب أن يبدأ رقم الهاتف بـ 01 ويتكون من 11 رقم",
        variant: "destructive",
      });
      return;
    }


    if (!formData.paymentMethod) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار طريقة الدفع",
        variant: "destructive",
      });
      return;
    }

    if (formData.paymentMethod === 'cash_on_delivery') {
      handleConfirmOrder();
    } else {
      setStep(2);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method === 'cash_on_delivery') return 'الدفع عند الاستلام';
    if (method === 'vodafone_cash') return 'فودافون كاش / انستا باي';
    return '';
  };

  const handleConfirmOrder = async () => {
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || null,
          customer_address: `${formData.area ? formData.area + ' - ' : ''}${formData.address}`,
          governorate: formData.governorate,
          payment_method: formData.paymentMethod,
          notes: formData.notes || null,
          coupon_code: appliedCoupon?.code || null,
          items: items.map(item => ({
            product_id: item.id,
            product_name: item.name,
            product_price: item.price,
            quantity: item.quantity,
          })),
          subtotal: totalPrice,
          delivery_fee: deliveryFee,
          discount_amount: discountAmount,
          total: finalTotal,
          user_id: user?.id || null,
        }
      });

      if (error || data?.error) {
        toast({ 
          title: "خطأ", 
          description: data?.error || error?.message || "حدث خطأ أثناء إنشاء الطلب", 
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }

      const orderData = data.order;

      const orderItemsText = items.map(item => `• ${item.name} (${item.quantity}×)`).join('\n');
      const discountText = appliedCoupon 
        ? `\n🏷️ *الكوبون:* ${appliedCoupon.code} (-${discountAmount} ج.م)`
        : '';
      
      const whatsappMessage = `🛒 *طلب جديد من حمودي ستور*

📦 *رقم الطلب:* ${orderData.order_number}

👤 *العميل:* ${formData.name}
📱 *الهاتف:* ${formData.phone}
📍 *المحافظة:* ${formData.governorate}
${formData.area ? `🏘️ *المنطقة:* ${formData.area}` : ''}
🏠 *العنوان:* ${formData.address}
${formData.notes ? `📝 *ملاحظات:* ${formData.notes}` : ''}

🛍️ *المنتجات:*
${orderItemsText}

💰 *المنتجات:* ${totalPrice} ج.م
🚚 *التوصيل:* ${deliveryFee} ج.م${discountText}
✅ *الإجمالي:* ${finalTotal} ج.م

💳 *طريقة الدفع:* ${getPaymentMethodLabel(formData.paymentMethod)}`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
      
      toast({
        title: "تم تأكيد الطلب!",
        description: `رقم طلبك: ${orderData.order_number} - جاري فتح واتساب...`,
      });
      
      window.open(whatsappUrl, '_blank');
      
      clearCart();
      navigate('/');
    } catch (err) {
      console.error('Order creation error:', err);
      toast({ 
        title: "خطأ", 
        description: "حدث خطأ أثناء إنشاء الطلب", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>إتمام الطلب | حمودي ستور</title>
        <meta name="description" content="أكمل طلبك الآن واستمتع بتوصيل سريع" />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://hamodi-pay-shop.lovable.app/checkout" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="إتمام الطلب | حمودي ستور" />
        <meta property="og:description" content="أكمل طلبك الآن واستمتع بتوصيل سريع" />
        <meta property="og:url" content="https://hamodi-pay-shop.lovable.app/checkout" />
        <meta property="og:site_name" content="حمودي ستور" />
      </Helmet>

      <div className="min-h-screen bg-background" dir="rtl" lang="ar">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="العودة للصفحة السابقة">
                <ArrowRight className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">
                {step === 1 ? 'إتمام الطلب' : 'الدفع الإلكتروني'}
              </h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {step === 1 ? (
                <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      الاسم بالكامل
                    </Label>
                    <Input
                      placeholder="أدخل اسمك بالكامل"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      رقم الهاتف
                    </Label>
                    <Input
                      placeholder="01xxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      maxLength={11}
                    />
                  </div>

                  {/* Email (Optional) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري)</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      dir="ltr"
                    />
                  </div>

                  {/* Governorate Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      المحافظة
                    </Label>
                    <Select
                      value={formData.governorateId}
                      onValueChange={(value) => {
                        const gov = governorates.find(g => g.id === value);
                        handleInputChange('governorateId', value);
                        handleInputChange('governorate', gov?.name || '');
                      }}
                      disabled={loadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingData ? "جاري التحميل..." : "اختر المحافظة"} />
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

                  {/* Area Selection - Only show if governorate is selected and has areas */}
                  {formData.governorateId && filteredAreas.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        المنطقة / المركز
                      </Label>
                      <Select
                        value={formData.area}
                        onValueChange={(value) => handleInputChange('area', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنطقة" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredAreas.map((area) => (
                            <SelectItem key={area.id} value={area.name}>
                              {area.name} ({area.delivery_fee} ج.م)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Delivery Info */}
                  {formData.governorateId && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">سعر التوصيل:</span>
                        {freeDeliveryEnabled && totalPrice >= freeDeliveryThreshold && freeDeliveryThreshold > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-muted-foreground">{originalDeliveryFee} ج.م</span>
                            <span className="font-medium text-green-600">مجاني! 🎉</span>
                          </div>
                        ) : (
                          <span className="font-medium">{deliveryFee} ج.م ({deliveryDays})</span>
                        )}
                      </div>
                      {freeDeliveryEnabled && freeDeliveryThreshold > 0 && totalPrice < freeDeliveryThreshold && (
                        <p className="text-xs text-primary mt-2">
                          💡 أضف منتجات بقيمة {freeDeliveryThreshold - totalPrice} ج.م للحصول على توصيل مجاني!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      العنوان بالتفصيل
                    </Label>
                    <Textarea
                      placeholder="أدخل عنوانك بالتفصيل (الشارع - المبنى - الدور - الشقة)"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                    
                    {/* Save as Default Address - Only for authenticated users */}
                    {isAuthenticated && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="saveAsDefault"
                            checked={saveAsDefault}
                            onCheckedChange={(checked) => setSaveAsDefault(checked as boolean)}
                          />
                          <label
                            htmlFor="saveAsDefault"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            حفظ كعنوان افتراضي
                          </label>
                        </div>
                        {saveAsDefault && formData.address && formData.governorate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSaveAsDefault}
                            disabled={savingAddress}
                            className="gap-2"
                          >
                            {savingAddress ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            حفظ الآن
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      طريقة الدفع
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => handleInputChange('paymentMethod', method.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-right ${
                            formData.paymentMethod === method.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{method.emoji}</span>
                            <div>
                              <p className="font-medium text-foreground">{method.name}</p>
                              <p className="text-sm text-muted-foreground">{method.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                  </div>

                  {/* Coupon Suggestion */}
                  {!appliedCoupon && (
                    <CouponSuggestion 
                      onApply={(code) => applyCoupon(code)} 
                      appliedCouponCode={appliedCoupon?.code}
                    />
                  )}

                  {/* Coupon */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      كود الخصم
                    </Label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-700 dark:text-green-400">
                            {appliedCoupon.code} - خصم {appliedCoupon.discount_amount} ج.م
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-red-500 hover:text-red-600">
                          إزالة
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="أدخل كود الخصم"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button onClick={() => applyCoupon()} disabled={applyingCoupon}>
                          {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span>
                    </Label>
                    <Textarea
                      placeholder="أي ملاحظات إضافية..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ) : (
                /* Payment Step */
                <div className="bg-card rounded-2xl p-4 sm:p-6 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold">الدفع عبر فودافون كاش / انستا باي</h2>
                    <p className="text-muted-foreground">
                      يرجى تحويل المبلغ <span className="font-bold text-primary">{finalTotal} ج.م</span> للرقم التالي:
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-2xl font-bold tracking-wider" dir="ltr">{PAYMENT_NUMBER}</span>
                    <Button variant="outline" size="sm" onClick={copyPaymentNumber}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'تم النسخ' : 'نسخ'}
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>📌 بعد التحويل، اضغط "تأكيد الطلب" لإرسال طلبك عبر واتساب</p>
                    <p>📌 سيتم التواصل معك لتأكيد استلام المبلغ قبل الشحن</p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      رجوع
                    </Button>
                    <Button onClick={handleConfirmOrder} disabled={submitting} className="flex-1">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      تأكيد الطلب
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-4 sm:p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  ملخص الطلب
                </h3>

                {/* Cart Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-2 bg-muted/50 rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-primary font-bold text-sm">{item.price} ج.م</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.stockCount !== null && item.stockCount !== undefined && item.quantity >= item.stockCount}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المجموع الفرعي:</span>
                    <span>{totalPrice} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التوصيل:</span>
                    {freeDeliveryEnabled && totalPrice >= freeDeliveryThreshold && freeDeliveryThreshold > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through text-muted-foreground text-xs">{originalDeliveryFee} ج.م</span>
                        <span className="text-green-600 font-medium">مجاني</span>
                      </div>
                    ) : (
                      <span>{deliveryFee > 0 ? `${deliveryFee} ج.م` : 'اختر المحافظة'}</span>
                    )}
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>الخصم:</span>
                      <span>-{discountAmount} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                    <span>الإجمالي:</span>
                    <span className="text-primary">{finalTotal} ج.م</span>
                  </div>
                </div>

                {step === 1 && (
                  <Button
                    size="lg"
                    className="w-full mt-4"
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    تأكيد الطلب
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const Checkout: React.FC = () => {
  return (
    <CartProvider>
      <CheckoutContent />
    </CartProvider>
  );
};

export default Checkout;
