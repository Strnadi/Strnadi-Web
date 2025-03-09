import CloseButton from "@/components/close-button";

export default function CenterLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className='drop-shadow-lg fixed mt-25 top-0 left-0 right-0 mx-auto w-full sm:w-1/2 lg:w-1/3 h-content z-[calc(1e10)] flex flex-col bg-white/95 backdrop-blur-md rounded-lg'>
      <div className="flex flex-row gap-x-2 gap-y-4 overflow-y-auto max-h-[85vh] p-8">
        <CloseButton />
        { children }
      </div>
    </div>
  );
}
