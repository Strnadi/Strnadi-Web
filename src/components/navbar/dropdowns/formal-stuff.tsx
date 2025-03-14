import { Link } from "react-router";

export default function FormalStuff() {
  return (
    <>
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
  );
}
