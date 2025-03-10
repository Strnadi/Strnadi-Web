import { Link } from "react-router";

export default function InfoDropdownItems() {

  return (
    <>
      <li>
        <Link to="/how-to-record" className='dropdown-item'>
          Jak nahrávat
        </Link>
      </li>
      <li>
        <Link to="/about-project" className='dropdown-item'>
          O projektu
        </Link>
      </li>
      <li>
        <Link to="/about-bird" className='dropdown-item'>
          O strnadovi
        </Link>
      </li>
      <li>
        <Link to="/podminky-pouzivani" className='dropdown-item'>
          Podmínky používání
        </Link>
      </li>
      <li>
        <Link to="/ochrana-osobnich-udaju" className='dropdown-item'>
          Ochrana osobních údajů
        </Link>
      </li>
    </>
  )

}