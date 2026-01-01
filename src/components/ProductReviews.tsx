import React, { useState, useEffect } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  customer_name: string;
  created_at: string;
  user_id: string;
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const { toast } = useToast();
  const { user, profile, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data);
      if (user) {
        setHasReviewed(data.some(r => r.user_id === user.id));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setSubmitting(true);
    
    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      customer_name: profile.full_name || 'عميل',
    });

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة التقييم",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم إضافة التقييم بنجاح! ⭐" });
      setComment('');
      setRating(5);
      fetchReviews();
    }
    setSubmitting(false);
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 
      : 0
  }));

  const renderStars = (value: number, interactive = false) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-5 h-5 transition-colors",
            interactive && "cursor-pointer",
            star <= (interactive ? (hoverRating || rating) : value)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          )}
          onClick={interactive ? () => setRating(star) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      ))}
    </div>
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;
    return `منذ ${Math.floor(days / 30)} شهر`;
  };

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-foreground mb-6">تقييمات العملاء</h2>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Overall Rating */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="text-5xl font-bold text-primary mb-2">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center mb-2">
            {renderStars(Math.round(averageRating))}
          </div>
          <p className="text-muted-foreground">بناءً على {reviews.length} تقييم</p>
        </div>
        
        {/* Rating Breakdown */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-3">
          {ratingCounts.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="w-6 text-sm font-medium">{star}</span>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-12 text-sm text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Review Form */}
      {isAuthenticated ? (
        !hasReviewed ? (
          <div className="mt-6 bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">أضف تقييمك</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">تقييمك</label>
                {renderStars(rating, true)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تعليقك (اختياري)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شاركنا رأيك في المنتج..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Send className="w-4 h-4 ml-2" />
                )}
                إرسال التقييم
              </Button>
            </form>
          </div>
        ) : (
          <div className="mt-6 bg-muted/50 border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground">لقد قمت بتقييم هذا المنتج مسبقاً ✓</p>
          </div>
        )
      ) : (
        <div className="mt-6 bg-muted/50 border border-border rounded-2xl p-6 text-center">
          <p className="text-muted-foreground mb-3">سجل دخولك لإضافة تقييم</p>
          <Link to="/login">
            <Button variant="outline">تسجيل الدخول</Button>
          </Link>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {review.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{review.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>
              {review.comment && (
                <p className="text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 text-center py-8 text-muted-foreground">
          لا توجد تقييمات بعد. كن أول من يقيم هذا المنتج!
        </div>
      )}
    </section>
  );
};

export default ProductReviews;