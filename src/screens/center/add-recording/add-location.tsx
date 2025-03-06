import { useRecordingState } from "@/state/store";

export default function AddLocation() {
  const nextStage = useRecordingState((state) => state.nextStage);

  return (
    <div>
      <h1 className='text-2xl font-bold'>Přidání lokace</h1>
      <button onClick={nextStage}>
        Pokračovat
      </button>
    </div>
  );
}
