"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function ZoomableQR({
  value,
  size = 160,
  zoomSize = 360,
}: {
  value: string;
  size?: number;
  zoomSize?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Click to enlarge"
        className="inline-block cursor-pointer transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        <QRCodeSVG value={value} size={size} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG value={value} size={zoomSize} />
            <p className="text-xs text-gray-500 break-all text-center max-w-xs">{value}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
