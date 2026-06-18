import React, { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

interface ImagePlaceholderProps {
  src?: string;
  alt?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto';
  fallbackIcon?: React.ReactNode;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  src, 
  alt = 'Image', 
  className,
  aspectRatio = 'video',
  fallbackIcon
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    auto: 'h-auto'
  };

  if (!src || error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/20 rounded-xl",
        aspectClasses[aspectRatio],
        className
      )}>
        {fallbackIcon || <ImageIcon size={32} className="text-muted-foreground/30 mb-2" />}
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          {error ? 'Image Unavailable' : 'No Image Found'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", aspectClasses[aspectRatio], className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          loading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  );
};
