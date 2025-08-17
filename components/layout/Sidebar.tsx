
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS, LOGOUT_ITEM } from '../../constants';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const location = useLocation();

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">MarzbanBot</h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="ml-4">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
         <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-3 my-1 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-200"
        >
          {LOGOUT_ITEM.icon}
          <span className="ml-4">{LOGOUT_ITEM.name}</span>
        </button>
        <p className="text-xs text-gray-500 text-center mt-4">Version 1.0.0</p>
      </div>
    </div>
  );
};

export default Sidebar;
