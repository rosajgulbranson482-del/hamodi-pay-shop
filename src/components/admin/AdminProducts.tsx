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
import { Plus, Edit, Trash2, Loader2, Package, Upload, X, Image, GripVertical, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

interface CompressionReportItem {
  name: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  status: 'success' | 'failed' | 'skipped';
}

const AdminProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressingAll, setCompressingAll] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });
  const [compressionReport, setCompressionReport] = useState<CompressionReportItem[]>([]);
  const [showReport, setShowReport] = useState(false);
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

  // Compress image before upload
  const compressImage = async (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image with high quality
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, width, height);
        
        // Convert to WebP for better compression (fallback to JPEG)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob], 
                file.name.replace(/\.[^/.]+$/, '.webp'),
                { type: 'image/webp' }
              );
              console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if compression fails
            }
          },
          'image/webp',
          quality
        );
      };
      
      img.onerror = () => resolve(file); // Fallback to original on error
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // Increased limit since we'll compress
      toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 10MB", variant: "destructive" });
      return null;
    }

    // Compress the image before upload
    const originalSize = file.size;
    const compressedFile = await compressImage(file);
    const compressionRatio = ((1 - compressedFile.size / originalSize) * 100).toFixed(0);
    
    console.log(`Compression ratio: ${compressionRatio}%`);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedFile, {
        contentType: 'image/webp',
        cacheControl: '31536000', // Cache for 1 year
      });

    if (uploadError) {
      toast({ title: "خطأ", description: uploadError.message, variant: "destructive" });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    // Show compression success toast
    toast({ 
      title: "تم الضغط", 
      description: `تم ضغط الصورة بنسبة ${compressionRatio}%`,
    });

    return publicUrl;
  };

  // Compress and re-upload existing image from URL with size tracking
  const compressExistingImage = async (imageUrl: string, imageName: string): Promise<{ newUrl: string | null; originalSize: number; compressedSize: number }> => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) return { newUrl: null, originalSize: 0, compressedSize: 0 };
      
      const blob = await response.blob();
      const originalSize = blob.size;
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      // Compress the image
      const compressedFile = await compressImage(file);
      const compressedSize = compressedFile.size;
      
      // Upload compressed version
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { newUrl: null, originalSize, compressedSize: 0 };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return { newUrl: publicUrl, originalSize, compressedSize };
    } catch (error) {
      console.error('Error compressing existing image:', error);
      return { newUrl: null, originalSize: 0, compressedSize: 0 };
    }
  };

  // Compress all existing product images with detailed report
  const compressAllImages = async () => {
    setCompressingAll(true);
    setCompressionReport([]);
    setShowReport(false);
    
    const report: CompressionReportItem[] = [];
    
    // Get all products with images
    const productsWithImages = products.filter(p => p.image);
    
    // Get all additional images
    const { data: allProductImages } = await supabase
      .from('product_images')
      .select('*');
    
    const totalImages = productsWithImages.length + (allProductImages?.length || 0);
    setCompressionProgress({ current: 0, total: totalImages });
    
    let compressed = 0;
    let failed = 0;
    let skipped = 0;
    let totalSaved = 0;
    
    // Compress main product images
    for (const product of productsWithImages) {
      if (product.image && !product.image.includes('.webp')) {
        const result = await compressExistingImage(product.image, product.name);
        if (result.newUrl) {
          await supabase
            .from('products')
            .update({ image: result.newUrl })
            .eq('id', product.id);
          
          const savedBytes = result.originalSize - result.compressedSize;
          const savedPercent = result.originalSize > 0 ? (savedBytes / result.originalSize) * 100 : 0;
          totalSaved += savedBytes;
          
          report.push({
            name: product.name,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            savedBytes,
            savedPercent,
            status: 'success'
          });
          compressed++;
        } else {
          report.push({
            name: product.name,
            originalSize: result.originalSize,
            compressedSize: 0,
            savedBytes: 0,
            savedPercent: 0,
            status: 'failed'
          });
          failed++;
        }
      } else if (product.image?.includes('.webp')) {
        report.push({
          name: product.name,
          originalSize: 0,
          compressedSize: 0,
          savedBytes: 0,
          savedPercent: 0,
          status: 'skipped'
        });
        skipped++;
      }
      setCompressionProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }
    
    // Compress additional product images
    if (allProductImages) {
      for (const img of allProductImages) {
        const productName = products.find(p => p.id === img.product_id)?.name || 'صورة إضافية';
        
        if (img.image_url && !img.image_url.includes('.webp')) {
          const result = await compressExistingImage(img.image_url, productName);
          if (result.newUrl) {
            await supabase
              .from('product_images')
              .update({ image_url: result.newUrl })
              .eq('id', img.id);
            
            const savedBytes = result.originalSize - result.compressedSize;
            const savedPercent = result.originalSize > 0 ? (savedBytes / result.originalSize) * 100 : 0;
            totalSaved += savedBytes;
            
            report.push({
              name: `${productName} (إضافية)`,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              savedBytes,
              savedPercent,
              status: 'success'
            });
            compressed++;
          } else {
            report.push({
              name: `${productName} (إضافية)`,
              originalSize: result.originalSize,
              compressedSize: 0,
              savedBytes: 0,
              savedPercent: 0,
              status: 'failed'
            });
            failed++;
          }
        } else if (img.image_url?.includes('.webp')) {
          report.push({
            name: `${productName} (إضافية)`,
            originalSize: 0,
            compressedSize: 0,
            savedBytes: 0,
            savedPercent: 0,
            status: 'skipped'
          });
          skipped++;
        }
        setCompressionProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
    }
    
    setCompressingAll(false);
    setCompressionProgress({ current: 0, total: 0 });
    setCompressionReport(report);
    setShowReport(true);
    
    const totalSavedMB = (totalSaved / (1024 * 1024)).toFixed(2);
    
    toast({
      title: "تم ضغط الصور",
      description: `تم ضغط ${compressed} صورة | تم توفير ${totalSavedMB} MB${failed > 0 ? ` | فشل ${failed}` : ''}${skipped > 0 ? ` | تم تخطي ${skipped}` : ''}`,
    });
    
    fetchProducts();
  };
  
  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

    const newStockCount = parseInt(formData.stock_count) || 0;
    const wasOutOfStock = editingProduct && (!editingProduct.in_stock || editingProduct.stock_count === 0);
    const isNowInStock = formData.in_stock && newStockCount > 0;

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image: formData.image || null,
      category: formData.category,
      badge: formData.badge || null,
      in_stock: formData.in_stock,
      stock_count: newStockCount,
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

      // Send stock notifications if product was out of stock and now is in stock
      if (wasOutOfStock && isNowInStock) {
        try {
          console.log("Sending stock notifications for product:", editingProduct.id);
          await supabase.functions.invoke('send-stock-notification', {
            body: { product_id: editingProduct.id }
          });
          toast({ title: "تم إرسال الإشعارات", description: "تم إشعار العملاء المسجلين بتوفر المنتج" });
        } catch (notifyError) {
          console.error("Failed to send stock notifications:", notifyError);
        }
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
      {/* Compression Progress Banner */}
      {compressingAll && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="font-medium">جاري ضغط الصور...</span>
            <span className="text-sm text-muted-foreground">
              ({compressionProgress.current} / {compressionProgress.total})
            </span>
          </div>
          <Progress 
            value={(compressionProgress.current / compressionProgress.total) * 100} 
            className="h-2"
          />
        </div>
      )}
      
      {/* Compression Report */}
      {showReport && compressionReport.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">📊 تقرير ضغط الصور</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowReport(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {compressionReport.filter(r => r.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">تم ضغطها</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {compressionReport.filter(r => r.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">فشل</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {compressionReport.filter(r => r.status === 'skipped').length}
              </div>
              <div className="text-sm text-muted-foreground">تم تخطيها</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {formatBytes(compressionReport.reduce((sum, r) => sum + r.savedBytes, 0))}
              </div>
              <div className="text-sm text-muted-foreground">إجمالي التوفير</div>
            </div>
          </div>
          
          {/* Detailed Table */}
          <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-right p-2">الصورة</th>
                  <th className="text-right p-2">قبل</th>
                  <th className="text-right p-2">بعد</th>
                  <th className="text-right p-2">التوفير</th>
                  <th className="text-right p-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {compressionReport.map((item, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/50">
                    <td className="p-2 max-w-[150px] truncate" title={item.name}>
                      {item.name}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {item.status === 'skipped' ? '-' : formatBytes(item.originalSize)}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {item.status === 'skipped' ? '-' : item.status === 'failed' ? '-' : formatBytes(item.compressedSize)}
                    </td>
                    <td className="p-2">
                      {item.status === 'success' && (
                        <span className="text-green-600 font-medium">
                          {item.savedPercent.toFixed(0)}% ({formatBytes(item.savedBytes)})
                        </span>
                      )}
                      {item.status === 'skipped' && (
                        <span className="text-yellow-600">مضغوطة مسبقاً</span>
                      )}
                      {item.status === 'failed' && (
                        <span className="text-red-600">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {item.status === 'success' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600">
                          ✓ نجح
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-600">
                          ✗ فشل
                        </span>
                      )}
                      {item.status === 'skipped' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-600">
                          ⊘ تخطي
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">إدارة المنتجات</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={compressAllImages}
            disabled={compressingAll || products.length === 0}
          >
            <Zap className="w-4 h-4 ml-2" />
            ضغط كل الصور
          </Button>
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