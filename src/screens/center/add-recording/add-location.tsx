import { useMapState, useRecordingState } from "@/state/store";

export default function AddLocation() {
  const nextStage = useRecordingState((state) => state.nextStage);
  const setLocation = useRecordingState((state) => state.setLocation);

  const selectedPos = useMapState(state => state.selectedLocation);

  const onClick = () => {
    if (selectedPos) {
      setLocation(selectedPos);
      nextStage();
    } else {
      alert("Zaklikněte lokaci!");
    }
  }

  return (
    <div>
      <h1 className='text-2xl font-bold'>Přidání lokace</h1>
      <p>Zaklikněte v mapě kde jste nahrávali</p>
      <button onClick={onClick}>
        Pokračovat
      </button>
    </div>
  );
}
