import { useState } from 'react';
import PopupLayout from '@/layouts/layout-popup';
import CloseButton from '@/components/close-button';

interface ExpandableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  popupClassName?: string;
  imageClassName?: string;
  alt: string;  // Making alt required for accessibility
}

export default function ExpandableImage({
  src,
  alt,
  className,
  popupClassName = "max-w-4xl max-h-[90vh]",
  imageClassName = "max-w-full max-h-[80vh] object-contain",
  onClick,
  ...imgProps
}: ExpandableImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    setIsExpanded(true);
    onClick?.(e);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={`cursor-pointer ${className || ''}`} 
        onClick={handleImageClick}
        {...imgProps}
      />

      {isExpanded && (
        <PopupLayout>
          <div className="relative flex flex-col items-center">
            <div className="absolute top-2 right-2 z-10">
              <button onClick={handleClose}>Close</button>
            </div>
            <div className={`p-4 ${popupClassName}`}>
              <img 
                src={src} 
                alt={alt} 
                className={imageClassName}
                {...imgProps}
              />
            </div>
            {alt && <p className="text-center mt-2 text-gray-700">{alt}</p>}
          </div>
        </PopupLayout>
      )}
    </>
  );
}
