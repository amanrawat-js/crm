"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface VoiceCallAnalysisProps {
  leadId: string;
  onAnalysisComplete: () => void;
}

type AnalysisState = "idle" | "selected" | "analyzing" | "complete";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
];
const ACCEPTED_EXTENSIONS = ".mp3,.wav,.m4a,.webm,.ogg";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const STATUS_MESSAGES = [
  "Transcribing audio...",
  "Extracting key details...",
  "Generating summary...",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// CSS keyframes injected once via a <style> tag
const ANIMATION_STYLES = `
@keyframes vcaBarBounce1 { 0%,100%{height:8px} 50%{height:28px} }
@keyframes vcaBarBounce2 { 0%,100%{height:20px} 50%{height:10px} }
@keyframes vcaBarBounce3 { 0%,100%{height:12px} 50%{height:32px} }
@keyframes vcaBarBounce4 { 0%,100%{height:24px} 50%{height:14px} }
@keyframes vcaBarBounce5 { 0%,100%{height:16px} 50%{height:26px} }
@keyframes vcaPulseGlow { 0%,100%{box-shadow:0 0 8px rgba(20,184,166,0.3)} 50%{box-shadow:0 0 24px rgba(20,184,166,0.6)} }
@keyframes vcaProgressSlide { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
@keyframes vcaCheckPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }
`;

const BAR_ANIMATIONS = [
  "vcaBarBounce1 1.2s ease-in-out infinite",
  "vcaBarBounce2 1.0s ease-in-out infinite 0.1s",
  "vcaBarBounce3 1.4s ease-in-out infinite 0.2s",
  "vcaBarBounce4 1.1s ease-in-out infinite 0.15s",
  "vcaBarBounce5 1.3s ease-in-out infinite 0.25s",
];

const BAR_HEIGHTS = [20, 28, 14, 24, 18]; // resting heights in px

export function VoiceCallAnalysis({
  leadId,
  onAnalysisComplete,
}: VoiceCallAnalysisProps) {
  const [state, setState] = useState<AnalysisState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle status messages during analysis
  useEffect(() => {
    if (state !== "analyzing") return;
    const interval = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [state]);

  // Simulate progress bar during analysis
  useEffect(() => {
    if (state !== "analyzing") {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8 + 2, 92));
    }, 600);
    return () => clearInterval(interval);
  }, [state]);

  const validateFile = useCallback((f: File): string | null => {
    if (f.size > MAX_FILE_SIZE) return "File exceeds 50 MB limit.";
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const validExts = ["mp3", "wav", "m4a", "webm", "ogg"];
    if (!validExts.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
      return "Unsupported file type. Please upload MP3, WAV, M4A, WebM, or OGG.";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(f);
      setState("selected");

      // Try to read duration
      const url = URL.createObjectURL(f);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          const mins = Math.floor(audio.duration / 60);
          const secs = Math.floor(audio.duration % 60);
          setDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
        }
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => URL.revokeObjectURL(url);
      audio.src = url;
    },
    [validateFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setDuration(null);
    setState("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const analyzeCall = useCallback(async () => {
    if (!file) return;
    setState("analyzing");
    setStatusIdx(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("recording", file);

      const res = await fetch(`/api/leads/${leadId}/analyze-call`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      setProgress(100);
      setSummary(data.summary ?? "Analysis complete.");
      setState("complete");
      onAnalysisComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setState("selected");
    }
  }, [file, leadId, onAnalysisComplete]);

  const reset = useCallback(() => {
    setFile(null);
    setDuration(null);
    setState("idle");
    setError(null);
    setSummary("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{ANIMATION_STYLES}</style>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* Waveform icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-500/20">
              <svg
                className="h-5 w-5 text-teal-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                AI Voice Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Upload a call recording for AI-powered insights
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* ─── Error banner ─── */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" x2="9" y1="9" y2="15" />
                <line x1="9" x2="15" y1="9" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* ─── IDLE: Drop zone ─── */}
          {state === "idle" && (
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-300 ${
                isDragOver
                  ? "border-teal-400 bg-teal-500/10"
                  : "border-slate-600/50 bg-slate-800/40 hover:border-teal-500/50 hover:bg-slate-800/70"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={onInputChange}
                className="hidden"
              />

              {/* Waveform SVG icon */}
              <div
                className={`rounded-2xl p-4 transition-all duration-300 ${
                  isDragOver
                    ? "bg-teal-500/20"
                    : "bg-slate-700/50 group-hover:bg-teal-500/10"
                }`}
              >
                <svg
                  className="h-10 w-10 text-teal-400"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="8" y1="18" x2="8" y2="30" />
                  <line x1="14" y1="12" x2="14" y2="36" />
                  <line x1="20" y1="8" x2="20" y2="40" />
                  <line x1="26" y1="14" x2="26" y2="34" />
                  <line x1="32" y1="10" x2="32" y2="38" />
                  <line x1="38" y1="16" x2="38" y2="32" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">
                  Drop call recording here
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  or click to browse • MP3, WAV, M4A
                </p>
              </div>

              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-3 py-1 text-[11px] font-medium text-slate-400">
                Max 50MB
              </span>
            </div>
          )}

          {/* ─── SELECTED: File preview ─── */}
          {state === "selected" && file && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-3">
                {/* Audio icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 border border-teal-500/20">
                  <svg
                    className="h-5 w-5 text-teal-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {file.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatFileSize(file.size)}</span>
                    {duration && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{duration}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={removeFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                  aria-label="Remove file"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>

              <Button onClick={analyzeCall} className="w-full">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                Analyze Call
              </Button>
            </div>
          )}

          {/* ─── ANALYZING: Animated state ─── */}
          {state === "analyzing" && (
            <div className="flex flex-col items-center gap-6 py-6">
              {/* Pulsing waveform bars */}
              <div
                className="flex items-end justify-center gap-1.5 rounded-2xl p-5"
                style={{ animation: "vcaPulseGlow 2s ease-in-out infinite" }}
              >
                {BAR_ANIMATIONS.map((anim, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-teal-500 to-blue-400"
                    style={{
                      height: `${BAR_HEIGHTS[i]}px`,
                      animation: anim,
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-slate-200">
                  Analyzing call recording...
                </p>
                <p className="mt-1 text-xs text-teal-400 transition-all duration-500">
                  {STATUS_MESSAGES[statusIdx]}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Shimmer overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{
                        animation: "vcaProgressSlide 1.5s ease-in-out infinite",
                      }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>
          )}

          {/* ─── COMPLETE: Results ─── */}
          {state === "complete" && (
            <div className="space-y-4">
              {/* Success header */}
              <div className="flex flex-col items-center gap-3 py-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25"
                  style={{
                    animation: "vcaCheckPop 0.5s ease-out forwards",
                    boxShadow: "0 0 20px rgba(16,185,129,0.2)",
                  }}
                >
                  <svg
                    className="h-6 w-6 text-emerald-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                  Notes Updated
                </span>
              </div>

              {/* Summary card */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 px-4 py-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Summary
                </p>
                <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                  {summary}
                </p>
              </div>

              <Button variant="secondary" onClick={reset} className="w-full">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Analyze Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
