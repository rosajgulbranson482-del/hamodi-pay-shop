import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Favorite {
  id: string;
  product_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setFavorites(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.some(f => f.product_id === productId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "سجل دخولك لإضافة المنتجات للمفضلة",
        variant: "destructive",
      });
      return false;
    }

    const existing = favorites.find(f => f.product_id === productId);

    if (existing) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء الإزالة من المفضلة",
          variant: "destructive",
        });
        return false;
      }

      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      toast({ title: "تم الإزالة من المفضلة" });
      return true;
    } else {
      // Add to favorites
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, product_id: productId })
        .select()
        .single();

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء الإضافة للمفضلة",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setFavorites(prev => [...prev, data]);
      }
      toast({ title: "تم الإضافة للمفضلة ❤️" });
      return true;
    }
  }, [user, isAuthenticated, favorites, toast]);

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    favoriteCount: favorites.length,
  };
};