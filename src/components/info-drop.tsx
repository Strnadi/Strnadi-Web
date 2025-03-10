import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import InfoIcon from '@/assets/icon-info.svg';
import InfoDropdownItems from './info-list-items';

export default function InfoDropdown() {
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

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
    >
      <button 
        className="flex items-center focus:outline-none" 
        onMouseEnter={() => setIsOpen(true)}
      >
        <img src={InfoIcon} />
        Informace
      </button>
      {isOpen && (
        <ul 
          className="absolute right-0 mt-2 w-40 z-50 bg-white border border-gray-200 rounded shadow-lg"
          onMouseLeave={() => setIsOpen(false)}
          onClick={() => setIsOpen(false)}
        >
          <InfoDropdownItems />
        </ul>
      )}
    </div>
  );
}
