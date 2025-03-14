import { postRecording } from "@/api/recording";
import navigateBack from "@/utils/navigate-back";
import { useAccount, useRecordingState } from "@/state/store";
import { RecordingUploadReq, RecordingPartUploadReq } from "@/api/types/recording";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffectOnce } from "react-use";

const env = import.meta.env;

export default function Register1() {

  const navigate = useNavigate();
  const token = useAccount(state => state.token_string)!;
  const resetStage = useRecordingState(state => state.resetStage);
  const recordingState = useRecordingState();

  const mutation = useMutation({
    mutationFn: ({ recording, recordingParts }: { recording: RecordingUploadReq; recordingParts: RecordingPartUploadReq[] }) => postRecording(token, recording, recordingParts)
  });

  const toBase64 = (content: ArrayBuffer) =>
    btoa(new Uint8Array(content).reduce((data, byte) => data + String.fromCharCode(byte), ""));

  const upload = () => {

    const recording = {
      createdAt: "2025-03-10T15:07:04.698Z",
      estimatedBirdsCount: 0,
      device: recordingState.device || "",
      byApp: false,
      note: recordingState.note  
    };

    // Each file is treated as a separate recording part
    const recordingParts = recordingState.recordings!.map(({ content }) => ({
      recordingId: 0, // Will get overridden
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      latitudeStart: recordingState.location!.lat,
      latitudeEnd: recordingState.location!.lat,
      longitudeStart: recordingState.location!.lng,
      longitudeEnd: recordingState.location!.lng,
      data: toBase64(content),
    }));

    mutation.mutate({ recording, recordingParts });
  };

  useEffectOnce(() => {
    upload();
  });

  useEffectOnce(() => {
    upload();
  });

  const onClick = () => {
    navigateBack(navigate);
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
