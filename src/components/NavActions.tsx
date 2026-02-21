import GlobalSearch from '@/components/GlobalSearch';
import ProfileDropdown from '@/components/ProfileDropdown';

interface NavActionsProps {
  onSignOut?: () => void;
}

const NavActions = ({ onSignOut }: NavActionsProps) => {
  return (
    <div className="flex items-center gap-1">
      <GlobalSearch />
      <ProfileDropdown onSignOut={onSignOut} />
    </div>
  );
};

export default NavActions;
