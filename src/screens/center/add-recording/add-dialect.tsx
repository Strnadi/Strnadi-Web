import { useRecordingState } from "@/store";

export default function AddDialect() {
  const nextStage = useRecordingState((state) => state.nextStage);

  return (
    <div>
      <h1 className='text-2xl font-bold'>Přidání nářečí</h1>
      <button onClick={nextStage}>
        Pokračovat
      </button>
    </div>
  );
}
