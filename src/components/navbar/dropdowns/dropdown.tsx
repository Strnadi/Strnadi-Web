import { useState, useEffect, useRef } from 'react';
import { useSlot } from "@beqa/react-slots";
import InfoIcon from '@/assets/icon-info.svg';
import InfoDropdownItems from './info-list-items';
import FormalStuff from './formal-stuff';

export default function Dropdown({ children }) {
  
  const { slot } = useSlot(children);

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
        <slot.title />
      </button>
      {isOpen && (
        <ul 
          className="absolute left-0 mt-2 w-40 z-[calc(1e12)] bg-white border border-gray-200 rounded shadow-lg"
          onMouseLeave={handleLinkClick}
          onClick={handleLinkClick}
        >
          <slot.default />
        </ul>
      )}
    </div>
  );
}
