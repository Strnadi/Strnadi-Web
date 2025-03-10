import AgreementShortComponent from '@/screens/texts/agreement-short.mdx';
import { useRegisterState } from '@/state/store';

export default function AgreementShort() {

  const nextStage = useRegisterState(state => state.nextStage);

  const onClick = () => {
    nextStage();
  }

  return (
    <div>
      <AgreementShortComponent />
      <button className='primary p-2 m-2' onClick={onClick}>Pokračovat</button>
    </div>
  );
}
