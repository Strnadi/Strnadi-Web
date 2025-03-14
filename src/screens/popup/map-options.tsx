import PopupLayout from "@/layouts/layout-popup";
import { useMapState } from "@/state/store";

export default function MapOptions() {

  const setMode = useMapState((state) => state.setMode);
  const mode = useMapState((state) => state.mode);

  return (
    <PopupLayout>
      <label>Vyberte podklad mapy:</label>

      <select onChange={(e) => setMode(e.target.value as "aerial" | "basic" | "outdoor")} value={mode}>
        {
          (["basic", "aerial", "outdoor"] as Array<typeof mode>).map((modeOption) => (
            <option
              key={modeOption}
              value={modeOption}
            >
              {modeOption}
            </option>
          ))
        }
      </select>
    </PopupLayout>
  )
}
