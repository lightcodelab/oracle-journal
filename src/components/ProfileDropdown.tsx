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
  CalendarDays,
  LogOut,
  ChevronDown,
  CreditCard,
  ListMusic,
  MessageSquarePlus,
  Bug,
  Smartphone,
  LineChart,
  Share2
} from 'lucide-react';
import { useInstallApp } from '@/components/InstallAppDialog';

interface ProfileDropdownProps {
  onSignOut?: () => void;
}

const ProfileDropdown = ({ onSignOut }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const { openInstallDialog } = useInstallApp();

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
    // Use local scope so we always clear client-side tokens, even if the
    // server-side session was already invalidated (avoids 403 session_not_found
    // leaving the user stuck "signed in" locally).
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn('signOut warning:', error.message);
    }
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
      label: 'My Account',
      icon: <CreditCard className="w-4 h-4 mr-2" />,
      route: '/account',
    },
    {
      label: 'My Calendar',
      icon: <CalendarDays className="w-4 h-4 mr-2" />,
      route: '/my-calendar',
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
    {
      label: 'My Tracking',
      icon: <LineChart className="w-4 h-4 mr-2" />,
      route: '/tracking',
    },
    {
      label: 'My Playlists',
      icon: <ListMusic className="w-4 h-4 mr-2" />,
      route: '/playlists',
    },
    {
      label: 'Affiliate Program',
      icon: <Share2 className="w-4 h-4 mr-2" />,
      route: '/affiliate',
    },
    {
      label: 'Feature Suggestions',
      icon: <MessageSquarePlus className="w-4 h-4 mr-2" />,
      route: '/suggestions',
    },
  ];

  const betaItems = [
    {
      label: 'Bug Reports',
      icon: <Bug className="w-4 h-4 mr-2" />,
      route: '/bugs',
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
              onClick={() => navigate('/admin')}
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
        <DropdownMenuItem
          onClick={openInstallDialog}
          className="cursor-pointer"
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Add App Icon to Phone
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Beta Testing</span>
        </div>
        {betaItems.map((item) => (
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
