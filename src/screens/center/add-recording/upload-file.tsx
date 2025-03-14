import { useAccount, useRecordingState } from "@/state/store";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function UploadFile() {

  const session = useAccount((state) => state.token);

  const setRecordings = useRecordingState((state) => state.setRecordings);
  const nextStage = useRecordingState((state) => state.nextStage);

  const [error, setError] = useState<string | null>(null);

  // Handle dropped or selected files
  const onDrop = useCallback((acceptedFiles: File[]) => {

    if (acceptedFiles.length === 0) {
      setError("Žádné validní soubory nebyly vybrány.");
      return;
    }

    setRecordings(acceptedFiles);
    nextStage();
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'audio/wav': ['.wav'],
      'audio/x-wav': ['.wav'],
      'audio/wave': ['.wav'],
      'audio/mpeg': ['.mp3'],
      'audio/flac': ['.flac'],
      'audio/x-flac': ['.flac'],
      'audio/aac': ['.aac'],
      'audio/x-aac': ['.aac'],
      'audio/ogg': ['.ogg'],
    }
  });

  return (
    <div>
      <h1>Nahrát nahrávku</h1>
      { error && <p className="text-red-500">{error}</p> }
      {session ?
        /* Dropzone area */
        <div
          {...getRootProps()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragActive ? 'border-blue-500' : 'border-gray-300'
          }`}
        >
      
          <div className="flex flex-col items-center">
            <input {...getInputProps()} />
            {/* Simple arrow icon */}
            <div className="text-4xl mb-2 text-gray-500">↑</div>
            <p>
              Klikněte nebo přetáhněte zvuk<br/>
              (.wav, .mp3, .flac)
            </p>
          </div>
      
        </div>
        : <p>Je potřeba se nejdříve přihlásit.</p>
      }
    </div>
  );
}
