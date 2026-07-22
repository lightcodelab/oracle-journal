import ProfileDropdown from '@/components/ProfileDropdown';

interface NavActionsProps {
  onSignOut?: () => void;
}

const NavActions = ({ onSignOut }: NavActionsProps) => {
  return (
    <div className="flex items-center gap-1">
      <ProfileDropdown onSignOut={onSignOut} />
    </div>
  );
};

export default NavActions;
