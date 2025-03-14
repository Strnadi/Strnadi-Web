import CloseButton from "@/components/close-button";

export default function LeftLayout({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {

  return (
    <div className='drop-shadow-lg fixed mt-30 mx-5 top-0 sm:w-1/2 lg:w-1/3 h-content z-[calc(1e7)] flex flex-col bg-white/95 backdrop-blur-md rounded-lg'>
      <div className="flex flex-row gap-x-2 gap-y-4 overflow-y-auto max-h-[80vh] rounded-4xl p-8">
        <CloseButton onClick={onClose} />
        { children }
      </div>
    </div>
  );
}
