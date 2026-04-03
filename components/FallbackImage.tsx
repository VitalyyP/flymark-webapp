"use client";

import { useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";

type FallbackImageProps = Omit<ImageProps, "src" | "alt"> & {
  alt: string;
  src?: string | null;
  fallbackSrc?: string;
  fallbackWidth?: number;
  fallbackHeight?: number;
};

export default function FallbackImage({
  alt,
  src,
  fallbackSrc = "/ok-aphoto.png",
  fallbackWidth,
  fallbackHeight,
  onError,
  ...props
}: FallbackImageProps) {
  const normalizedSrc = useMemo(() => (src ?? "").trim(), [src]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const isCurrentSourceFailed =
    Boolean(normalizedSrc) && failedSource === normalizedSrc;
  const shouldShowFallback = !normalizedSrc || isCurrentSourceFailed;
  const resolvedSrc = shouldShowFallback ? fallbackSrc : normalizedSrc;

  if (shouldShowFallback && fallbackWidth && fallbackHeight) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-green-100">
        <Image
          src={fallbackSrc}
          alt={alt}
          width={fallbackWidth}
          height={fallbackHeight}
          loading="eager"
          className="object-contain max-w-full max-h-full"
          style={{ width: fallbackWidth, height: fallbackHeight }}
        />
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={resolvedSrc}
      onError={(event) => {
        if (normalizedSrc && resolvedSrc !== fallbackSrc) {
          setFailedSource(normalizedSrc);
        }
        onError?.(event);
      }}
    />
  );
}
