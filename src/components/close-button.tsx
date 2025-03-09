import { useRecordingState, useRegisterState } from "@/state/store";
import { useNavigate } from "react-router";

export default function CloseButton() {
  const navigate = useNavigate();

  const resetRecordingState = useRecordingState(state => state.resetStage);
  const resetRegisterState = useRegisterState(state => state.resetStage);

  const resetState = () => {
    navigate("/");
    resetRecordingState();
    resetRegisterState();
  }

  return (
    <button className="inline-block w-5 h-full text-4xl" onClick={ resetState }>&times;</button>
  );

}
