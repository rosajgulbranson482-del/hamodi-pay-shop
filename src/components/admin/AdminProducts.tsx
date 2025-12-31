import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2, Package, Upload, X, Image, GripVertical } from 'lucide-react';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image: string | null;
  category: string;
  badge: string | null;
  in_stock: boolean;
  stock_count: number;
}

const categories = [
  'سماعات',
  'ساعات',
  'شواحن',
  'باور بانك',
  'كابلات',
  'إكسسوارات',
  'جيمنج',
  'أخرى'
];

const AdminProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    image: '',
    category: 'سماعات',
    badge: '',
    in_stock: true,
    stock_count: '0',
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchProductImages = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setProductImages(data);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      original_price: '',
      image: '',
      category: 'سماعات',
      badge: '',
      in_stock: true,
      stock_count: '0',
    });
    setEditingProduct(null);
    setMainImagePreview(null);
    setProductImages([]);
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      image: product.image || '',
      category: product.category,
      badge: product.badge || '',
      in_stock: product.in_stock ?? true,
      stock_count: product.stock_count?.toString() || '0',
    });
    setMainImagePreview(product.image || null);
    await fetchProductImages(product.id);
    setIsDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 5MB", variant: "destructive" });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "خطأ", description: uploadError.message, variant: "destructive" });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, image: url });
      setMainImagePreview(url);
      toast({ title: "تم الرفع", description: "تم رفع الصورة الرئيسية بنجاح" });
    }
    setUploading(false);
  };

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProductImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImage(files[i]);
      if (url) {
        newImages.push({
          id: `temp-${Date.now()}-${i}`,
          image_url: url,
          display_order: productImages.length + i,
        });
      }
    }

    setProductImages([...productImages, ...newImages]);
    toast({ title: "تم الرفع", description: `تم رفع ${newImages.length} صورة بنجاح` });
    setUploading(false);
    
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
  };

  const removeMainImage = () => {
    setFormData({ ...formData, image: '' });
    setMainImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeProductImage = async (index: number) => {
    const image = productImages[index];
    
    // If it's an existing image (has a real UUID), delete from database
    if (editingProduct && !image.id.startsWith('temp-')) {
      await supabase
        .from('product_images')
        .delete()
        .eq('id', image.id);
    }
    
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
      fetchProducts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image: formData.image || null,
      category: formData.category,
      badge: formData.badge || null,
      in_stock: formData.in_stock,
      stock_count: parseInt(formData.stock_count) || 0,
    };

    let productId = editingProduct?.id;

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      productId = data.id;
    }

    // Save additional images
    if (productId) {
      // Get new images (temp IDs)
      const newImages = productImages.filter(img => img.id.startsWith('temp-'));
      
      if (newImages.length > 0) {
        const imagesToInsert = newImages.map((img, index) => ({
          product_id: productId,
          image_url: img.image_url,
          display_order: index,
        }));

        await supabase.from('product_images').insert(imagesToInsert);
      }

      // Update order for existing images
      const existingImages = productImages.filter(img => !img.id.startsWith('temp-'));
      for (let i = 0; i < existingImages.length; i++) {
        await supabase
          .from('product_images')
          .update({ display_order: i })
          .eq('id', existingImages[i].id);
      }
    }

    toast({ 
      title: editingProduct ? "تم التحديث" : "تم الإضافة", 
      description: editingProduct ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح" 
    });
    setIsDialogOpen(false);
    resetForm();
    fetchProducts();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إدارة المنتجات</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المنتج</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السعر (ج.م)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>السعر الأصلي (اختياري)</Label>
                  <Input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  />
                </div>
              </div>

              {/* Main Image */}
              <div className="space-y-2">
                <Label>الصورة الرئيسية</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  className="hidden"
                />
                
                {mainImagePreview ? (
                  <div className="relative">
                    <img 
                      src={mainImagePreview} 
                      alt="معاينة" 
                      className="w-full h-40 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-8 w-8"
                      onClick={removeMainImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">اضغط لرفع الصورة الرئيسية</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.image}
                    onChange={(e) => {
                      setFormData({ ...formData, image: e.target.value });
                      setMainImagePreview(e.target.value || null);
                    }}
                    placeholder="أو أدخل رابط الصورة"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Additional Images */}
              <div className="space-y-2">
                <Label>صور إضافية ({productImages.length})</Label>
                <input
                  ref={multiFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesUpload}
                  className="hidden"
                />
                
                {productImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {productImages.map((img, index) => (
                      <div key={img.id} className="relative group">
                        <img 
                          src={img.image_url} 
                          alt={`صورة ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeProductImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        <span className="absolute bottom-1 right-1 bg-background/80 text-xs px-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => multiFileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 ml-2" />
                  )}
                  إضافة صور
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>الشارة (اختياري)</Label>
                  <Input
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="جديد، خصم..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    value={formData.stock_count}
                    onChange={(e) => setFormData({ ...formData, stock_count: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={formData.in_stock}
                    onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                  />
                  <Label>متوفر في المخزون</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد منتجات بعد</p>
          <p className="text-sm">أضف منتجك الأول الآن</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              {product.image && (
                <div className="h-40 bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${product.in_stock ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {product.in_stock ? 'متوفر' : 'نفذ'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-bold text-primary">{product.price} ج.م</span>
                  {product.original_price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.original_price} ج.م
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;