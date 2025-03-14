import navigateBack from "@/utils/navigate-back";
import { useRecordingState, useRegisterState } from "@/state/store";
import { useNavigate } from "react-router";

export default function CloseButton({ onClick }: { onClick?: () => void }) {
  const navigate = useNavigate();

  const resetRecordingState = useRecordingState(state => state.resetStage);
  const resetRegisterState = useRegisterState(state => state.resetStage);

  const resetState = () => {
    navigateBack(navigate);
    if (onClick) onClick();
  }

  return (
    <button className="inline-block w-5 h-full text-4xl" onClick={ resetState }>&times;</button>
  );

}
