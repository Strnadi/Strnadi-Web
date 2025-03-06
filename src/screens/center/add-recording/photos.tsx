import { useAccount, useRecordingState } from "@/store";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function UploadFile() {

  const session = useAccount((state) => state.token);

  const setPhotos = useRecordingState((state) => state.setPhotos);
  const nextStage = useRecordingState((state) => state.nextStage);

  // Handle dropped or selected files
  const onDrop = useCallback((acceptedFiles: File[]) => {

    setPhotos(acceptedFiles);
    nextStage();
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/gif': ['.gif']
    }
  });

  return (
    <div>
      <h1>Nahrát nahrávku</h1>
      {session ?
        /* Dropzone area */
        <div
          {...getRootProps()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-8 transition-colors text-center ${
            isDragActive ? 'border-blue-500' : 'border-gray-300'
          }`}
        >
      
            <div>
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
