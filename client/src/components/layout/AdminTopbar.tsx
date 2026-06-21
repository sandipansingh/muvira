import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Menu } from 'lucide-react';
import Button from '../ui/Button';

interface AdminTopbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  onToggleSidebar,
  title = 'Admin Workspace',
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-secondary200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 font-redhat">
      {/* Page Title / Context */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden text-secondary700 hover:text-primaryBg p-1 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <h1 className="text-base md:text-lg font-medium tracking-wide text-darkColor">{title}</h1>
      </div>

      {/* Admin Quick Profile Options */}
      <div className="flex items-center gap-4 font-redhat">
        {/* Profile Card */}
        <div className="hidden sm:flex items-center gap-2.5 bg-lightgrayColor px-3 py-1.5 rounded-lg border border-secondary200">
          <div className="w-7 h-7 bg-secondary700 text-white rounded-full flex items-center justify-center font-medium text-xs">
            {user?.fullName.charAt(0) || 'A'}
          </div>
          <div className="text-left">
            <p className="text-[11px] font-medium text-darkColor leading-none truncate max-w-[100px]">
              {user?.fullName}
            </p>
            <p className="text-[9px] font-medium text-secondary500 leading-none uppercase mt-0.5 tracking-wider">
              {user?.role}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          pill={true}
          onClick={handleLogout}
          className="text-secondary500 hover:text-darkColor flex items-center gap-1.5 px-3 py-1.5"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};

export default AdminTopbar;
