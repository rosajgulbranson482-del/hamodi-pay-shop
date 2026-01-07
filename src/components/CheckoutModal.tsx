import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, MapPin, User, MessageSquare, CreditCard, Copy, Check, Wallet, Banknote, Ticket, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import CouponSuggestion from '@/components/CouponSuggestion';

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

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppliedCoupon {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
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

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { user, profile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    governorate: '',
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
  
  // Delivery settings state
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState(0);
  const [deliveryDays, setDeliveryDays] = useState('2-3 أيام');
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loadingGovernorates, setLoadingGovernorates] = useState(true);
  
  // Free delivery settings
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0);

  // Fetch governorates and delivery areas from database
  useEffect(() => {
    const fetchDeliveryData = async () => {
      try {
        const [govResponse, areasResponse, settingsResponse] = await Promise.all([
          supabase.from('governorates').select('*').eq('is_active', true).order('name'),
          supabase.from('delivery_areas').select('*').eq('is_active', true).order('name'),
          supabase.from('delivery_settings').select('*').limit(1).single()
        ]);

        if (govResponse.error) throw govResponse.error;
        if (areasResponse.error) throw areasResponse.error;
        
        setGovernorates(govResponse.data || []);
        setDeliveryAreas(areasResponse.data || []);
        
        if (settingsResponse.data) {
          setFreeDeliveryEnabled(settingsResponse.data.free_delivery_enabled || false);
          setFreeDeliveryThreshold(settingsResponse.data.free_delivery_threshold || 0);
        }
      } catch (err) {
        console.error('Error fetching delivery data:', err);
      } finally {
        setLoadingGovernorates(false);
      }
    };
    
    if (isOpen) {
      fetchDeliveryData();
    }
  }, [isOpen]);

  // Get areas for selected governorate
  const areasForGovernorate = governorates.find(g => g.id === formData.governorate)
    ? deliveryAreas.filter(a => a.governorate_id === formData.governorate)
    : [];

  // Update original delivery fee when governorate or area changes
  useEffect(() => {
    if (formData.area) {
      const selectedArea = deliveryAreas.find(a => a.id === formData.area);
      if (selectedArea) {
        setOriginalDeliveryFee(Number(selectedArea.delivery_fee));
        setDeliveryDays(selectedArea.delivery_days);
        return;
      }
    }
    
    if (formData.governorate) {
      const selectedGov = governorates.find(g => g.id === formData.governorate);
      if (selectedGov) {
        setOriginalDeliveryFee(Number(selectedGov.delivery_fee));
        setDeliveryDays(selectedGov.delivery_days);
      }
    }
  }, [formData.governorate, formData.area, governorates, deliveryAreas]);

  // Calculate actual delivery fee based on free delivery threshold
  useEffect(() => {
    if (freeDeliveryEnabled && totalPrice >= freeDeliveryThreshold && freeDeliveryThreshold > 0) {
      setDeliveryFee(0);
    } else {
      setDeliveryFee(originalDeliveryFee);
    }
  }, [freeDeliveryEnabled, freeDeliveryThreshold, totalPrice, originalDeliveryFee]);

  // Reset area when governorate changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, area: '' }));
  }, [formData.governorate]);

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
      // Use edge function to validate coupon securely
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
      onClose();
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
      // Use edge function to create order securely
      const selectedGov = governorates.find(g => g.id === formData.governorate);
      const selectedArea = deliveryAreas.find(a => a.id === formData.area);
      const governorateName = selectedGov?.name || '';
      const areaName = selectedArea?.name || '';
      const addressParts = [areaName, formData.address].filter(Boolean).join(' - ');
      
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || null,
          customer_address: addressParts,
          governorate: governorateName,
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
📍 *المحافظة:* ${governorateName}
🏘️ *المنطقة:* ${areaName || 'غير محدد'}
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
      onClose();
      setStep(1);
      setFormData({
        name: '',
        phone: '',
        email: '',
        governorate: '',
        area: '',
        address: '',
        notes: '',
        verificationCode: '',
        paymentMethod: '',
      });
      setAppliedCoupon(null);
      setCouponCode('');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card rounded-t-2xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {step === 1 ? 'إتمام الطلب' : 'الدفع الإلكتروني'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-3 sm:p-4">
          {step === 1 ? (
            <div className="space-y-4">
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
                  البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري - لإرسال تحديثات الطلب)</span>
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
                  المحافظة <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.governorate}
                  onValueChange={(value) => handleInputChange('governorate', value)}
                  disabled={loadingGovernorates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingGovernorates ? "جاري التحميل..." : "اختر المحافظة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map((gov) => (
                      <SelectItem key={gov.id} value={gov.id}>
                        {gov.name} ({gov.delivery_fee} ج.م)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                  ⚠️ التوصيل غير متاح حالياً لمحافظات الصعيد (أسوان، الأقصر، قنا، سوهاج، أسيوط، المنيا، بني سويف، الفيوم، الوادي الجديد)
                </p>
              </div>

              {/* Area Selection - Show only when governorate is selected and has areas */}
              {formData.governorate && areasForGovernorate.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    المنطقة <span className="text-muted-foreground text-xs">(اختياري)</span>
                  </Label>
                  <Select
                    value={formData.area}
                    onValueChange={(value) => handleInputChange('area', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {areasForGovernorate.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name} ({area.delivery_fee} ج.م)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Delivery Info */}
              {formData.governorate && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    التوصيل: {deliveryFee} ج.م - {deliveryDays}
                  </span>
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
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  طريقة الدفع <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleInputChange('paymentMethod', method.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right",
                        formData.paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                        formData.paymentMethod === method.id
                          ? "bg-primary/10"
                          : "bg-muted"
                      )}>
                        {method.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-foreground">{method.name}</div>
                        <div className="text-sm text-muted-foreground">{method.description}</div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        formData.paymentMethod === method.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {formData.paymentMethod === method.id && (
                          <Check className="w-4 h-4 text-primary-foreground" />
                        )}
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

              {/* Coupon Code */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  كود الخصم (اختياري)
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <div>
                        <span className="font-bold text-green-700">{appliedCoupon.code}</span>
                        <span className="text-sm text-green-600 mr-2">
                          (-{appliedCoupon.discount_amount} ج.م)
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon} className="text-destructive">
                      <X className="w-4 h-4" />
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
                    <Button 
                      variant="secondary" 
                      onClick={() => applyCoupon()}
                      disabled={applyingCoupon}
                    >
                      {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تطبيق'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  ملاحظات (اختياري)
                </Label>
                <Textarea
                  placeholder="أي ملاحظات إضافية للطلب"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المنتجات ({items.length})</span>
                  <span>{totalPrice} ج.م</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    التوصيل
                  </span>
                  <span>{deliveryFee} ج.م</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم ({appliedCoupon.code})</span>
                    <span>-{discountAmount} ج.م</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary text-lg">{finalTotal} ج.م</span>
                </div>
              </div>

              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={handleSubmitOrder}
                disabled={submitting}
              >
                {submitting ? 'جاري التأكيد...' : formData.paymentMethod === 'cash_on_delivery' ? 'تأكيد الطلب' : 'متابعة للدفع'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Payment Instructions */}
              <div className="text-center">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  الدفع الإلكتروني
                </h3>
                <p className="text-muted-foreground text-sm">
                  يرجى تحويل المبلغ على الرقم التالي
                </p>
              </div>

              {/* Payment Number */}
              <div className="p-4 bg-accent rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-foreground">رقم التحويل:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary tracking-wider">
                      {PAYMENT_NUMBER}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyPaymentNumber}
                      className="h-8 w-8"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card rounded-lg text-center">
                    <div className="text-2xl mb-1">📱</div>
                    <span className="text-sm font-medium">فودافون كاش</span>
                  </div>
                  <div className="p-3 bg-card rounded-lg text-center">
                    <div className="text-2xl mb-1">🏦</div>
                    <span className="text-sm font-medium">انستا باي</span>
                  </div>
                </div>
              </div>

              {/* Amount to Pay */}
              <div className="p-4 gradient-primary rounded-xl text-center text-primary-foreground">
                <span className="text-sm opacity-80">المبلغ المطلوب تحويله</span>
                <div className="text-3xl font-bold mt-1">{finalTotal} ج.م</div>
                {appliedCoupon && (
                  <div className="text-sm opacity-80 mt-1">
                    (بعد خصم {discountAmount} ج.م)
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-4 bg-muted rounded-xl">
                <h4 className="font-bold text-foreground mb-2">تعليمات مهمة:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• قم بتحويل المبلغ الإجمالي على الرقم المذكور</li>
                  <li>• احتفظ بصورة إيصال التحويل</li>
                  <li>• سنتواصل معك لتأكيد الطلب خلال ساعات</li>
                  <li>• التوصيل خلال {deliveryDays}</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  رجوع
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1"
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                >
                  {submitting ? 'جاري التأكيد...' : 'تأكيد الطلب'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;