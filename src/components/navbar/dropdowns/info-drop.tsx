import InfoIcon from '@/assets/icon-info.svg';
import InfoDropdownItems from './info-list-items';
import FormalStuff from './formal-stuff';
import Dropdown from './dropdown';

export default function InfoDropdown() {
  return (
    <Dropdown>
      <div 
        className="flex items-center focus:outline-none" 
        slot-name="title"
      >
        <img src={InfoIcon} />
        Informace
      </div>
      <InfoDropdownItems />
      <FormalStuff />
    </Dropdown>
  );
}
