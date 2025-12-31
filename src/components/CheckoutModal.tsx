import React, { useState } from 'react';
import { X, Phone, MapPin, User, MessageSquare, CreditCard, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { governorates } from '@/data/governorates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAYMENT_NUMBER = "01025529130";

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { items, totalPrice, clearCart } = useCart();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    governorate: '',
    address: '',
    notes: '',
    verificationCode: '',
  });
  const [sentCode, setSentCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const selectedGovernorate = governorates.find(g => g.id === formData.governorate);
  const deliveryFee = selectedGovernorate?.deliveryFee || 0;
  const finalTotal = totalPrice + deliveryFee;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    
    // Generate a random 4-digit code
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
    if (!formData.name || !formData.phone || !formData.governorate || !formData.address) {
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

    setStep(2);
  };

  const handleConfirmPayment = async () => {
    // Save order to database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        governorate: selectedGovernorate?.name || '',
        delivery_fee: deliveryFee,
        subtotal: totalPrice,
        total: finalTotal,
        payment_method: 'vodafone_cash',
        notes: formData.notes || null,
        order_number: 'temp', // Will be replaced by trigger
      }])
      .select()
      .single();

    if (orderError) {
      toast({ title: "خطأ", description: orderError.message, variant: "destructive" });
      return;
    }

    // Save order items
    const orderItems = items.map(item => ({
      order_id: orderData.id,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
    }));

    await supabase.from('order_items').insert(orderItems);

    toast({
      title: "تم تأكيد الطلب!",
      description: `رقم طلبك: ${orderData.order_number} - سنتواصل معك قريباً`,
    });
    clearCart();
    onClose();
    setStep(1);
    setFormData({
      name: '',
      phone: '',
      governorate: '',
      address: '',
      notes: '',
      verificationCode: '',
    });
    setIsVerified(false);
    setSentCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card rounded-t-2xl">
          <h2 className="text-xl font-bold text-foreground">
            {step === 1 ? 'إتمام الطلب' : 'الدفع'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
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
                    variant={isVerified ? "success" : "secondary"}
                    onClick={sendVerificationCode}
                    disabled={isVerified}
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

              {/* Governorate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  المحافظة
                </Label>
                <Select
                  value={formData.governorate}
                  onValueChange={(value) => handleInputChange('governorate', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map((gov) => (
                      <SelectItem key={gov.id} value={gov.id}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{gov.name}</span>
                          <span className="text-muted-foreground text-sm">
                            توصيل: {gov.deliveryFee} ج.م ({gov.deliveryDays})
                          </span>
                        </div>
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
                    التوصيل {selectedGovernorate ? `(${selectedGovernorate.name})` : ''}
                  </span>
                  <span>{deliveryFee} ج.م</span>
                </div>
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
              >
                متابعة للدفع
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
                  طرق الدفع المتاحة
                </h3>
                <p className="text-muted-foreground text-sm">
                  يرجى تحويل المبلغ على أحد الأرقام التالية
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
                        <Check className="w-4 h-4 text-success" />
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
              </div>

              {/* Instructions */}
              <div className="p-4 bg-muted rounded-xl">
                <h4 className="font-bold text-foreground mb-2">تعليمات مهمة:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• قم بتحويل المبلغ الإجمالي على الرقم المذكور</li>
                  <li>• احتفظ بصورة إيصال التحويل</li>
                  <li>• سنتواصل معك لتأكيد الطلب خلال ساعات</li>
                  <li>• التوصيل خلال {selectedGovernorate?.deliveryDays || '2-5 أيام'}</li>
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
                  onClick={handleConfirmPayment}
                >
                  تأكيد الطلب
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
