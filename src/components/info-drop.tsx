import { Link } from 'react-router';
import InfoIcon from '@/assets/icon-info.svg';

export default function InfoDropdown() {
  return (
    <div className="relative group">
      <button className="flex items-center focus:outline-none">
        <img src={InfoIcon} />
        Informace
      </button>
      <ul className="absolute right-0 mt-2 w-40 z-50 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <li>
          <Link to="/how-to-record" className='font-semibold flex-row gap-x-1 items-center block px-4 py-2 hover:bg-gray-100'>
            Jak nahrávat
          </Link>
        </li>
        <li>
          <Link to="/about-project" className='font-semibold flex-row gap-x-1 items-center block px-4 py-2 hover:bg-gray-100'>
            O projektu
          </Link>
        </li>
        <li>
          <Link to="/about-bird" className='font-semibold flex-row gap-x-1 items-center block px-4 py-2 hover:bg-gray-100'>
            O strnadovi
          </Link>
        </li>
      </ul>
    </div>
  );
}
