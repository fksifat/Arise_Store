'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

export function ProductImage({ src, alt, className = '', loading = 'lazy' }: { src?: string; alt: string; className?: string; loading?: 'eager'|'lazy' }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) {
    return <div role="img" aria-label={`${alt} (image unavailable)`} className={`${className} flex flex-col items-center justify-center gap-2 overflow-hidden bg-slate-100 p-2 text-center text-xs text-slate-500`}>
      <ImageIcon aria-hidden="true" className="h-6 w-6 shrink-0" />
      <span>No image available</span>
    </div>;
  }
  return <img src={src} alt={alt} className={className} loading={loading} fetchPriority={loading==='eager'?'high':undefined} decoding="async" onError={() => setFailedSource(src)} />;
}
