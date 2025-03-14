import { useRecordingState } from "@/state/store";

import '@/styling/text.css'

export default function AddInfo() {
  const nextStage = useRecordingState((state) => state.nextStage);

  return (
    <div>
      <h1 className='text-2xl font-bold'>Přidání info</h1>
      <button onClick={nextStage}>
        Pokračovat
      </button>
    </div>
  );
}
