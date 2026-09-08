"use client";

import { useEffect, useRef, useState } from "react";
import { type CropRect } from "@/lib/image";

type Corner = "tl" | "tr" | "bl" | "br";

type DisplayBox = { left: number; top: number; width: number; height: number };

function containBox(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): DisplayBox {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

function clampCrop(next: CropRect): CropRect {
  const min = 0.08;
  let { x, y, w, h } = next;
  w = Math.max(min, Math.min(1, w));
  h = Math.max(min, Math.min(1, h));
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { x, y, w, h };
}

export function CropEditor({
  src,
  crop,
  onChange,
}: {
  src: string;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<DisplayBox>({ left: 0, top: 0, width: 0, height: 0 });
  const dragRef = useRef<{
    corner: Corner;
    startX: number;
    startY: number;
    origin: CropRect;
  } | null>(null);

  function measure() {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !img.naturalWidth) return;
    setBox(containBox(frame.clientWidth, frame.clientHeight, img.naturalWidth, img.naturalHeight));
  }

  useEffect(() => {
    measure();
    const frame = frameRef.current;
    if (!frame) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [src]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || !box.width || !box.height) return;
      const dx = (event.clientX - drag.startX) / box.width;
      const dy = (event.clientY - drag.startY) / box.height;
      const o = drag.origin;
      let next = { ...o };
      if (drag.corner === "tl") {
        next = { x: o.x + dx, y: o.y + dy, w: o.w - dx, h: o.h - dy };
      } else if (drag.corner === "tr") {
        next = { x: o.x, y: o.y + dy, w: o.w + dx, h: o.h - dy };
      } else if (drag.corner === "bl") {
        next = { x: o.x + dx, y: o.y, w: o.w - dx, h: o.h + dy };
      } else {
        next = { x: o.x, y: o.y, w: o.w + dx, h: o.h + dy };
      }
      onChange(clampCrop(next));
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [box.height, box.width, onChange]);

  const left = box.left + crop.x * box.width;
  const top = box.top + crop.y * box.height;
  const width = crop.w * box.width;
  const height = crop.h * box.height;

  function startDrag(corner: Corner, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      corner,
      startX: event.clientX,
      startY: event.clientY,
      origin: crop,
    };
  }

  return (
    <div ref={frameRef} className="relative h-[58vh] w-full overflow-hidden rounded-[18px] bg-[#1c1c1c]">
      <img
        ref={imgRef}
        src={src}
        alt="Document preview"
        className="h-full w-full object-contain select-none"
        draggable={false}
        onLoad={measure}
      />
      {box.width > 0 ? (
        <>
          {/* dim outside crop */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute bg-black/45"
              style={{ left: box.left, top: box.top, width: box.width, height: Math.max(0, top - box.top) }}
            />
            <div
              className="absolute bg-black/45"
              style={{
                left: box.left,
                top: top + height,
                width: box.width,
                height: Math.max(0, box.top + box.height - (top + height)),
              }}
            />
            <div
              className="absolute bg-black/45"
              style={{ left: box.left, top, width: Math.max(0, left - box.left), height }}
            />
            <div
              className="absolute bg-black/45"
              style={{
                left: left + width,
                top,
                width: Math.max(0, box.left + box.width - (left + width)),
                height,
              }}
            />
          </div>
          <div
            className="absolute border-2 border-white"
            style={{ left, top, width, height }}
          >
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <button
                key={corner}
                type="button"
                aria-label={`Resize ${corner}`}
                onPointerDown={(e) => startDrag(corner, e)}
                className={`absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-white shadow touch-none ${
                  corner === "tl"
                    ? "left-0 top-0 cursor-nwse-resize"
                    : corner === "tr"
                      ? "left-full top-0 cursor-nesw-resize"
                      : corner === "bl"
                        ? "left-0 top-full cursor-nesw-resize"
                        : "left-full top-full cursor-nwse-resize"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">
          Drag the green corners to fit the whole receipt
        </span>
      </div>
    </div>
  );
}
