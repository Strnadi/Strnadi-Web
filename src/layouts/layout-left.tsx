import CloseButton from "@/components/close-button";

export default function LeftLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className='drop-shadow-lg fixed mt-25 mx-5 top-0 w-full sm:w-1/2 lg:w-1/3 h-content z-[calc(1e10)] flex flex-col bg-white/95 backdrop-blur-md rounded-lg'>
      <div className="flex flex-row gap-x-2 gap-y-4 overflow-y-auto max-h-[80vh] rounded-4xl p-8">
        <CloseButton />
        { children }
      </div>
    </div>
  );
}
