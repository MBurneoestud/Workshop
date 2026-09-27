"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title?: string
}

const ImageGallery = ({ images, title }: ImageGalleryProps) => {
  const slides = (images || []).filter((image) => !!image.url)
  const [index, setIndex] = useState(0)

  if (!slides.length) {
    return (
      <div className="aspect-square w-full bg-keiko-ink/5 flex items-center justify-center text-keiko-ink/50">
        Sin imagen
      </div>
    )
  }

  const current = slides[Math.min(index, slides.length - 1)]
  const go = (next: number) => {
    setIndex((next + slides.length) % slides.length)
  }

  return (
    <div className="w-full">
      <div className="relative aspect-square w-full overflow-hidden bg-[#ebe4d4] border border-keiko-ink/10">
        <Image
          src={current.url}
          alt={`${title || "Producto"} — foto ${index + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-contain p-4"
        />
        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-keiko-ink/80 text-keiko-paper hover:bg-keiko-seal"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-keiko-ink/80 text-keiko-paper hover:bg-keiko-seal"
            >
              ›
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {slides.map((image, i) => (
            <button
              type="button"
              key={image.id || image.url}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 border ${
                i === index
                  ? "border-keiko-seal"
                  : "border-keiko-ink/15 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}
      {slides.length > 1 && (
        <p className="mt-2 text-xs tracking-widest uppercase text-keiko-ink/50">
          {index + 1} / {slides.length}
        </p>
      )}
    </div>
  )
}

export default ImageGallery
