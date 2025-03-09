import { postRecording } from "@/api/recording";
import { useRecordingState } from "@/state/store";
import { RecordingUploadReq } from "@/types/api/recording";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffectOnce } from "react-use";

const env = import.meta.env;

export default function Register1() {

  const navigate = useNavigate();
  const resetStage = useRecordingState(state => state.resetStage);

  const mutation = useMutation({
    mutationFn: (recording: RecordingUploadReq) => postRecording(recording)
  })

  const upload = () => mutation.mutate({
    createdAt: "",
    estimatedBirdsCount: 0,
    byApp: false
  });

  useEffectOnce(() => {
    upload();
  })

  const onClick = () => {
    navigate("/");
    resetStage();
  }

  if (mutation.isPending) {
    return <p>Nahrávání vaší nahrávky...</p>;
  }

  if (mutation.error) {
    return (
      <div>
        <h1>Chyba</h1>
        <p>{mutation.error.message}</p>
        <button onClick={upload}>Opakovat</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Úspěch</h1>
      <h2>Vaše nahrávka byla uložena.</h2>
      <button onClick={onClick}>Pokračovat zpět</button>
    </div>
  );
}
