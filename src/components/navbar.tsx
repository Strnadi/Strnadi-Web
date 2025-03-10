import { useState } from "react";
import { Link } from "react-router";

import Upload from '@/assets/icon-upload.svg';
import List from '@/assets/icon-list.svg';
import NotificationsEmpty from '@/assets/icon-notifications-empty.svg';

import AccountDropdown from "@/components/account-drop";
import { useAccount } from "@/state/store";
import InfoDropdown from "./info-drop";
import InfoDropdownItems from "./info-list-items";

import "@/styling/navbar.css";
import "@/styling/buttons.css";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const session = useAccount(state => state.token);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white rounded-4xl m-2 2xl:m-5 p-2 2xl:pr-10">
      <div className="flex justify-between items-center h-16">
        {/* Logo - always visible */}
        <div className='font-semibold rounded-4xl bg-[#fdfcdc] p-2 border-[3px] border-[#fdfcdc]'>
          <Link to={'/'}>
            <div className="flex items-center">
              <img src="/logo.svg" alt="Logo" />
            </div>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button 
          className="2xl:hidden p-2" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Desktop navigation - shown only on 2xl screens */}
        <div className="hidden 2xl:flex justify-between items-center w-full ml-4">
          <ul className='flex flex-row gap-x-8 items-center'>
            {session ? (
              <>
                <li>
                  <Link to="/add-recording" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={Upload} alt="Upload" />
                    Nahrát
                  </Link>
                </li>
                <li>
                  <Link to="/account/my-recordings" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={List} alt="List" />
                    Moje záznamy
                  </Link>
                </li>
                <li>
                  <Link to="/account/notifications" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={NotificationsEmpty} alt="Notifications" />
                    Oznámení
                  </Link>
                </li>
                <li className='font-semibold'>
                  <InfoDropdown />
                </li>
              </>
            ) : (
              <InfoDropdownItems />
            )}
          </ul>

          <ul className="flex flex-row gap-x-4 items-center">
            <Link to="/application" className='button-primary py-2 px-4'>
              Stáhnout aplikaci
            </Link>
            <li>
              {session ? (
                <AccountDropdown />
              ) : (
                <Link to="/auth/login" className="button-secondary py-2 px-4">Přihlásit se</Link>
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* Mobile menu - collapsible (shown on screens below 2xl) */}
      {isMenuOpen && (
        <div className="2xl:hidden pt-4 pb-4 px-2 border-t mt-2">
          <ul className='flex flex-col gap-y-4'>
            {session ? (
              <>
                <li>
                  <Link to="/add-recording" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={Upload} alt="Upload" />
                    Nahrát
                  </Link>
                </li>
                <li>
                  <Link to="/account/my-recordings" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={List} alt="List" />
                    Moje záznamy
                  </Link>
                </li>
                <li>
                  <Link to="/account/notifications" className='font-semibold flex flex-row gap-x-1 items-center'>
                    <img src={NotificationsEmpty} alt="Notifications" />
                    Oznámení
                  </Link>
                </li>
                <li className='font-semibold'>
                  <InfoDropdown />
                </li>
              </>
            ) : (
              <InfoDropdownItems />
            )}
            <li className="pt-4">
              <Link to="/application" className='button-primary py-2 px-4 block w-full text-center'>
                Stáhnout aplikaci
              </Link>
            </li>
            <li className="pt-2">
              {session ? (
                <AccountDropdown />
              ) : (
                <Link to="/auth/login" className="button-secondary py-2 px-4 block w-full text-center">Přihlásit se</Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

