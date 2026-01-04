import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
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


interface AppliedCoupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
}

const PAYMENT_NUMBER = "01025529130";
const WHATSAPP_NUMBER = "201025529130";
const FIXED_DELIVERY_FEE = 50;

// مراكز محافظة الشرقية
const SHARQIA_CENTERS = [
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
  'أبو حماد',
  'العاشر من رمضان',
  'صان الحجر',
];

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
    governorate: 'الشرقية',
    center: '',
    address: '',
    notes: '',
    verificationCode: '',
    paymentMethod: '' as PaymentMethod,
  });
  const [sentCode, setSentCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/');
    }
  }, [items.length, navigate]);


  // Pre-fill form with profile data when authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.full_name || prev.name,
        phone: profile.phone || prev.phone,
        address: profile.default_address || prev.address,
      }));
      // Auto-verify phone for authenticated users
      if (profile.phone) {
        setIsVerified(true);
      }
    }
  }, [isAuthenticated, profile]);

  const deliveryFee = FIXED_DELIVERY_FEE;
  const discountAmount = appliedCoupon?.discount_amount || 0;
  const finalTotal = Math.max(0, totalPrice + deliveryFee - discountAmount);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال كود الكوبون", variant: "destructive" });
      return;
    }

    setApplyingCoupon(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: couponCode,
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
      default_address: `${formData.center} - ${formData.address}`,
      default_governorate: 'الشرقية',
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

  const sendVerificationCode = () => {
    if (!formData.phone || formData.phone.length !== 11) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم هاتف صحيح مكون من 11 رقم",
        variant: "destructive",
      });
      return;
    }
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSentCode(code);
    
    toast({
      title: "تم إرسال الكود",
      description: `كود التحقق هو: ${code} (في التطبيق الحقيقي سيتم إرساله SMS)`,
    });
  };

  const verifyCode = () => {
    if (formData.verificationCode === sentCode) {
      setIsVerified(true);
      toast({
        title: "تم التحقق",
        description: "تم التحقق من رقم الهاتف بنجاح",
      });
    } else {
      toast({
        title: "كود خاطئ",
        description: "يرجى إدخال الكود الصحيح",
        variant: "destructive",
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

  const handleSubmitOrder = () => {
    if (!formData.name || !formData.phone || !formData.center || !formData.address) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!isVerified) {
      toast({
        title: "خطأ",
        description: "يرجى التحقق من رقم الهاتف أولاً",
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
          customer_address: `${formData.center} - ${formData.address}`,
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
🏘️ *المركز:* ${formData.center}
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
      </Helmet>

      <div className="min-h-screen bg-background" dir="rtl" lang="ar">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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

                  {/* Phone with Verification */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      رقم الهاتف
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        maxLength={11}
                        className="flex-1"
                        disabled={isVerified}
                      />
                      <Button
                        variant={isVerified ? "default" : "secondary"}
                        onClick={sendVerificationCode}
                        disabled={isVerified}
                        className={isVerified ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {isVerified ? <Check className="w-4 h-4" /> : 'إرسال كود'}
                      </Button>
                    </div>
                    
                    {sentCode && !isVerified && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="أدخل كود التحقق"
                          value={formData.verificationCode}
                          onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                          maxLength={4}
                          className="flex-1"
                        />
                        <Button onClick={verifyCode}>تحقق</Button>
                      </div>
                    )}
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

                  {/* Governorate - Fixed to Sharqia */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      المحافظة
                    </Label>
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">محافظة الشرقية</span>
                        <span className="text-sm text-muted-foreground">
                          توصيل: {FIXED_DELIVERY_FEE} ج.م
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        نوصل لجميع مراكز محافظة الشرقية فقط
                      </p>
                    </div>
                  </div>

                  {/* Center Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      المركز / المدينة
                    </Label>
                    <Select
                      value={formData.center}
                      onValueChange={(value) => handleInputChange('center', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المركز" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHARQIA_CENTERS.map((center) => (
                          <SelectItem key={center} value={center}>
                            {center}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                    {/* Cash on Delivery Warning */}
                    {formData.paymentMethod === 'cash_on_delivery' && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div className="space-y-2">
                            <p className="font-bold text-amber-800 dark:text-amber-200">
                              تنبيه هام - مصاريف الشحن مقدماً
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              في حالة اختيار <strong>الدفع كاش عند الاستلام</strong>، يجب تحويل مصاريف الشحن مقدماً 
                              <strong className="text-primary mx-1">({FIXED_DELIVERY_FEE} ج.م)</strong>
                              عبر فودافون كاش أو انستا باي على الرقم:
                            </p>
                            <div className="flex items-center gap-2 bg-white dark:bg-background/50 p-2 rounded-lg">
                              <span className="font-bold text-lg tracking-wider" dir="ltr">{PAYMENT_NUMBER}</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={copyPaymentNumber}
                                className="mr-auto"
                              >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'تم' : 'نسخ'}
                              </Button>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              📌 سيتم التواصل معك لتأكيد استلام مصاريف الشحن قبل إرسال الطلب
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
                        <Button onClick={applyCoupon} disabled={applyingCoupon}>
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
                    <h3 className="text-lg font-bold">الدفع عبر فودافون كاش / انستا باي</h3>
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
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
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
                    <span>{deliveryFee > 0 ? `${deliveryFee} ج.م` : 'اختر المحافظة'}</span>
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
