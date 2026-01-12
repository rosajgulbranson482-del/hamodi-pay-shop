import React, { memo } from 'react';
import { User, LogOut, Package, Settings, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Link } from 'react-router-dom';

interface MobileUserLinksProps {
  onClose: () => void;
}

const MobileUserLinks: React.FC<MobileUserLinksProps> = memo(({ onClose }) => {
  const { isAuthenticated, signOut } = useAuth();
  const { favoriteCount } = useFavorites();

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
        onClick={onClose}
      >
        <User className="w-4 h-4" />
        تسجيل الدخول
      </Link>
    );
  }

  return (
    <>
      <Link
        to="/favorites"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
        onClick={onClose}
      >
        <Heart className="w-4 h-4" />
        المفضلة
        {favoriteCount > 0 && (
          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
            {favoriteCount}
          </span>
        )}
      </Link>
      <Link
        to="/my-orders"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
        onClick={onClose}
      >
        <Package className="w-4 h-4" />
        طلباتي
      </Link>
      <Link
        to="/account"
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium flex items-center gap-2 text-sm"
        onClick={onClose}
      >
        <Settings className="w-4 h-4" />
        إعدادات الحساب
      </Link>
      <button
        className="px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium text-destructive flex items-center gap-2 text-right w-full text-sm"
        onClick={() => { signOut(); onClose(); }}
      >
        <LogOut className="w-4 h-4" />
        تسجيل الخروج
      </button>
    </>
  );
});

MobileUserLinks.displayName = 'MobileUserLinks';

export default MobileUserLinks;