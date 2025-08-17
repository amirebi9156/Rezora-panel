
import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';

const Header: React.FC = () => {
  const location = useLocation();
  const currentNavItem = NAV_ITEMS.find(item => item.path === location.pathname);
  const title = currentNavItem ? currentNavItem.name : 'Dashboard';

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div>
        {/* Placeholder for user profile/logout */}
        <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
      </div>
    </header>
  );
};

export default Header;
