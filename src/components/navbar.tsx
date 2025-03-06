import { Link, useLocation } from "react-router";

import Upload from '@/assets/icon-upload.svg';
import List from '@/assets/icon-list.svg';
import NotificationsEmpty from '@/assets/icon-notifications-empty.svg';

import AccountDropdown from "@/components/account-drop";
import { useAccount } from "@/state/store";
import InfoDropdown from "./info-drop";

export default function Navbar() {

  const location = useLocation();
  const pathname = location.pathname;
  const session = useAccount(state => state.token);

  return (
    <nav className="bg-white rounded-4xl m-5 pr-10">
      <div className="flex justify-between items-center h-16">
        <div className='flex flex-row gap-x-8 items-center'>
          <Link to={'/'} className='font-semibold rounded-4xl bg-[#fdfcdc] p-2 border-[3px] border-[#fdfcdc]'>
            <div className="flex items-center">
              <img src="/logo.svg" />
            </div>
          </Link>
          <Link to="/add-recording" className='font-semibold flex flex-row gap-x-1 items-center'>
            <img src={Upload} />
            Nahrát
          </Link>
          <Link to="/account/my-recordings" className='font-semibold flex flex-row gap-x-1 items-center'>
            <img src={List} />
            Moje záznamy
          </Link>
          <Link to="/account/notifications" className='font-semibold flex flex-row gap-x-1 items-center'>
            <img src={NotificationsEmpty} />
            Oznámení
          </Link>
          <div className='font-semibold flex flex-row gap-x-1 items-center'>            
            <InfoDropdown />
          </div>
        </div>

        <div className="flex flex-row gap-x-4 items-center">
          {/* <Link to="/application" className='button-primary py-2 px-4'>
              Stáhnout aplikaci
          </Link> */}
          <a href="https://download.strnadi.cz" className='button-primary py-2 px-4'>Stáhnout aplikaci</a>
          { session
            ? <AccountDropdown />
            : <Link to="/auth/login" className="button-secondary py-2 px-4">Přihlásit se</Link>
          }
        </div>
      </div>
    </nav>
  );
}

