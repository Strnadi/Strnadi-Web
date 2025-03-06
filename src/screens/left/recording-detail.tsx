import { useNavigate } from "react-router";

export default function RecordingDetail() {

  const navigate = useNavigate();

  return (
    <div className='flex flex-col w-full h-full bg-white/95 backdrop-blur-md rounded-4xl p-4'>
      <div className="flex flex-row justify-between">
        <h1 className='text-2xl font-bold'>Detail nahrávky</h1>
        <button onClick={ () => navigate("/") }>Zavřít</button>
      </div>
    </div>
  );

}
