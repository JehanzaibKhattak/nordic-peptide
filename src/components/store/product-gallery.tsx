"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [activeImage, setActiveImage] = useState(0);

  if (!images.length) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl bg-white p-8 text-center">
        <div>
          <Image src="/brand/peptbay-logo.svg" alt="Peptbay" width={2017} height={530} className="mx-auto h-auto w-48" />
          <p className="mt-2 text-sm text-muted-foreground">Product photography coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        <Image
          src={images[activeImage]}
          alt={`${name} product photo ${activeImage + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover mix-blend-multiply"
        />
        {images.length > 1 && <div className="absolute bottom-5 right-5 flex gap-2">
          <button type="button" aria-label="Previous product photo" onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)} className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-md"><ChevronLeft className="size-4" aria-hidden="true" /></button>
          <button type="button" aria-label="Next product photo" onClick={() => setActiveImage(i => (i + 1) % images.length)} className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-md"><ChevronRight className="size-4" aria-hidden="true" /></button>
        </div>}
      </div>
      {images.length > 1 && (
        <div role="group" aria-label={`${name} product photos`} className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show ${name} photo ${index + 1}`}
              aria-pressed={activeImage === index}
              onClick={() => setActiveImage(index)}
              className={`relative size-[76px] shrink-0 overflow-hidden rounded-lg border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${activeImage === index ? "border-primary ring-1 ring-primary" : "border-[#e8e4dc] hover:border-[#83907c]"}`}
            >
              <Image src={src} alt="" fill sizes="76px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
