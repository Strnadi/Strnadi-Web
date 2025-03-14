import CloseButton from "@/components/close-button";

export default function CenterLayout({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {

  return (
    <div className='drop-shadow-lg fixed mt-30 top-0 left-0 right-0 mx-auto w-full sm:w-1/2 lg:w-1/3 h-content z-[calc(1e10)] flex flex-col bg-white/95 backdrop-blur-md rounded-lg'>
      <div className="flex flex-col gap-x-2 gap-y-4 overflow-y-auto max-h-[85vh] p-8">
        <CloseButton onClick={onClose}/>
        { children }
      </div>
    </div>
  );
}
