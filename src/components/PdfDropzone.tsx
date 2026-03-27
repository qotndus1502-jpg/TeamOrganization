"use client";

import { useState, useRef, useCallback } from "react";

interface PdfDropzoneProps {
  onExtracted: (data: Record<string, unknown>, resumePath: string) => void;
  onSkip: () => void;
}

export default function PdfDropzone({ onExtracted, onSkip }: PdfDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setError("");
    setFileName(file.name);
    setLoading(true);

    try {
      // 1. PDF 업로드 (파일 저장)
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "파일 업로드 실패");
      }
      const { path: resumePath } = await uploadRes.json();

      // 2. AI 추출
      const extractForm = new FormData();
      extractForm.append("file", file);
      const extractRes = await fetch("/api/extract-resume", { method: "POST", body: extractForm });
      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || "PDF 분석 실패");
      }
      const extracted = await extractRes.json();

      onExtracted(extracted, resumePath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  }, [onExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">인사정보 등록</h1>
      <p className="text-gray-500 mb-6">이력서 PDF를 업로드하면 AI가 자동으로 정보를 추출합니다.</p>

      {/* 드래그앤드롭 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
          dragging
            ? "border-orange-400 bg-orange-50"
            : "border-gray-300 bg-white hover:border-orange-300 hover:bg-gray-50"
        } ${loading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">AI가 이력서를 분석하고 있습니다...</p>
            <p className="text-sm text-gray-400">{fileName}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-3xl">
              📄
            </div>
            <p className="text-gray-700 font-medium">
              이력서 PDF를 여기에 드래그하거나 클릭하세요
            </p>
            <p className="text-sm text-gray-400">PDF 파일만 가능, 최대 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* PDF 없이 직접 입력 */}
      {!loading && (
        <button
          onClick={onSkip}
          className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition"
        >
          PDF 없이 직접 입력하기 →
        </button>
      )}
    </div>
  );
}
