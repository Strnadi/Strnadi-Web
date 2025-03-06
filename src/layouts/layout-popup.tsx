import CloseButton from "@/components/close-button";

export default function PopupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="drop-shadow-lg fixed inset-0 flex items-center justify-center bg-black/50 z-[calc(1e10)]">
      <div className="min-w-full sm:min-w-1/2 lg:min-w-1/3 max-h-[80vh] flex flex-row flex-wrap bg-white/95 backdrop-blur-md rounded-lg overflow-y-auto p-8">
        <CloseButton />
        { children }
      </div>
    </div>
  );
}
