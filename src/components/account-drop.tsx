import { Link } from 'react-router';

import { useAccount } from '@/store';

export default function AccountDropdown() {
  const user = useAccount(state => state.user)!;
  const logout = useAccount(state => state.logout);

  return (
    <div className="relative group">
      <button className="flex items-center focus:outline-none">
        { user.firstName } { user.lastName }
        <svg
          className="ml-1 h-4 w-4 fill-current text-gray-500 group-hover:text-gray-600"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      <ul className="absolute right-0 mt-2 w-40 z-50 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <li>
          <Link to="/account/profile">
            <div className="block px-4 py-2 hover:bg-gray-100">Profil</div>
          </Link>
        </li>
        <li>
          <Link to="/account/settings">
            <div className="block px-4 py-2 hover:bg-gray-100">Nastavení</div>
          </Link>
        </li>
        <li className="cursor-pointer" onClick={logout}>
          <div className="block px-4 py-2 hover:bg-gray-100">Odhlásit se</div>
        </li>
      </ul>
    </div>
  );
}
