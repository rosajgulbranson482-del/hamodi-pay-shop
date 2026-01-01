import React, { useState, useEffect } from 'react';
import { Star, Trash2, Edit2, Loader2, Search, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  customer_name: string;
  created_at: string;
  product?: { name: string };
}

const AdminReviews: React.FC = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        product:products(name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data as Review[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف التقييم",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم حذف التقييم بنجاح" });
      fetchReviews();
    }
    setDeleteId(null);
  };

  const startEdit = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditRating(5);
    setEditComment('');
  };

  const handleUpdate = async () => {
    if (!editingReview) return;

    setSaving(true);
    const { error } = await supabase
      .from('reviews')
      .update({
        rating: editRating,
        comment: editComment.trim() || null,
      })
      .eq('id', editingReview.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث التقييم",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم تحديث التقييم بنجاح" });
      fetchReviews();
      cancelEdit();
    }
    setSaving(false);
  };

  const renderStars = (value: number, interactive = false, onChange?: (v: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-5 h-5 transition-colors",
            interactive && "cursor-pointer hover:scale-110",
            star <= value
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          )}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
        />
      ))}
    </div>
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredReviews = reviews.filter(review =>
    review.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-bold">إدارة التقييمات ({reviews.length})</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد تقييمات
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-card border border-border rounded-xl p-4"
            >
              {editingReview?.id === review.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">التقييم</label>
                    {renderStars(editRating, true, setEditRating)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">التعليق</label>
                    <Textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={saving} size="sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span className="mr-1">حفظ</span>
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm">
                      <X className="w-4 h-4" />
                      <span className="mr-1">إلغاء</span>
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {review.customer_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{review.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-sm text-primary mb-1">
                      المنتج: {review.product?.name || 'غير متوفر'}
                    </p>
                    {review.comment && (
                      <p className="text-muted-foreground text-sm">{review.comment}</p>
                    )}
                  </div>
                  <div className="flex gap-2 self-start">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => startEdit(review)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeleteId(review.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التقييم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReviews;