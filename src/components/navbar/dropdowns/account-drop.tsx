import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { useAccount } from '@/state/store';
import Dropdown from './dropdown';

export default function AccountDropdown() {
  const user = useAccount(state => state.user)!;
  const logout = useAccount(state => state.logout);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle link clicks to close the dropdown
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  // Handle logout click
  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <Dropdown>
      <div slot-name="title" className='flex flex-row items-center'>
        { user.firstName } { user.lastName }
        <svg
          className="ml-1 h-4 w-4 fill-current text-gray-500 hover:text-gray-600"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </div>

      <li>
        <Link to="/account/profile" onClick={handleLinkClick}>
          <div className="dropdown-item">Profil</div>
        </Link>
      </li>
      <li>
        <Link to="/account/settings" onClick={handleLinkClick}>
          <div className="dropdown-item">Nastavení</div>
        </Link>
      </li>
      <li className="cursor-pointer" onClick={handleLogout}>
        <div className="dropdown-item">Odhlásit se</div>
      </li>
    </Dropdown>
  );
}
