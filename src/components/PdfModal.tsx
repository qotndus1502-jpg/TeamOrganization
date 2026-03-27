"use client";

import { useEffect, useState } from "react";

export default function PdfModal({ src, onClose }: { src: string; onClose: () => void }) {
  const [width, setWidth] = useState(70); // vw 단위

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
      <div
        className="relative bg-white rounded-2xl shadow-2xl h-[88vh] flex flex-col overflow-hidden transition-[width] duration-200"
        style={{ width: `${width}vw` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">이력서</h3>

          {/* 너비 조절 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              <input
                type="range"
                min={40}
                max={95}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-24 h-1 accent-orange-400 cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-10 text-right">{width}%</span>
            </div>

            {/* 빠른 크기 버튼 */}
            <div className="flex gap-1">
              {[50, 70, 95].map((v) => (
                <button
                  key={v}
                  onClick={() => setWidth(v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    width === v ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {v === 50 ? "S" : v === 70 ? "M" : "L"}
                </button>
              ))}
            </div>

            {/* 닫기 */}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF 뷰어 */}
        <div className="flex-1 bg-gray-100">
          <iframe src={src} className="w-full h-full border-0" title="이력서" />
        </div>
      </div>
    </div>
  );
}
