import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
  FolderHeart, 
  BookOpen, 
  Sparkles,
  LogOut,
  ChevronDown
} from 'lucide-react';

interface ProfileDropdownProps {
  onSignOut?: () => void;
}

const ProfileDropdown = ({ onSignOut }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();
        
        setIsAdmin(!!roles);
      }
    };

    checkAdminStatus();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onSignOut) {
      onSignOut();
    } else {
      navigate('/auth');
    }
  };

  const menuItems = [
    {
      label: 'My Profile',
      icon: <User className="w-4 h-4 mr-2" />,
      route: '/profile',
    },
    {
      label: 'My Protocols',
      icon: <FolderHeart className="w-4 h-4 mr-2" />,
      route: '/devotion/protocols',
    },
    {
      label: 'My Journal',
      icon: <BookOpen className="w-4 h-4 mr-2" />,
      route: '/journal',
    },
    {
      label: 'My Readings',
      icon: <Sparkles className="w-4 h-4 mr-2" />,
      route: '/readings',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground/70 hover:text-foreground"
        >
          <User className="w-4 h-4 mr-2" />
          My Profile
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isAdmin && (
          <>
            <DropdownMenuItem 
              onClick={() => navigate('/devotion/admin')}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.route}
            onClick={() => navigate(item.route)}
            className="cursor-pointer"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
