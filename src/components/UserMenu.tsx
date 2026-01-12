import React, { memo } from 'react';
import { User, LogOut, Package, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  onMenuClose?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = memo(({ onMenuClose }) => {
  const { profile, isAuthenticated, signOut } = useAuth();
  const { favoriteCount } = useFavorites();

  if (!isAuthenticated) {
    return (
      <Link to="/login" className="hidden sm:block">
        <Button variant="ghost" size="sm">
          <User className="w-4 h-4 ml-2" />
          تسجيل الدخول
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="max-w-[100px] truncate">{profile?.full_name || 'حسابي'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/favorites" className="flex items-center gap-2 cursor-pointer">
            <Heart className="w-4 h-4" />
            المفضلة
            {favoriteCount > 0 && (
              <span className="mr-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                {favoriteCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/my-orders" className="flex items-center gap-2 cursor-pointer">
            <Package className="w-4 h-4" />
            طلباتي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account" className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            إعدادات الحساب
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;