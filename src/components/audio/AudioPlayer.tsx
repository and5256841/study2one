"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  sectionLabel: string;
  onComplete?: () => void;
  onProgress?: (percentage: number, currentTime: number) => void;
}

export default function AudioPlayer({
  audioUrl,
  title,
  sectionLabel,
  onComplete,
  onProgress,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const percentage = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
      onProgress?.(percentage, audio.currentTime);

      // Mark as completed at 90%
      if (percentage >= 90 && !isCompleted) {
        setIsCompleted(true);
        onComplete?.();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (!isCompleted) {
        setIsCompleted(true);
        onComplete?.();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [duration, isCompleted, onComplete, onProgress]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 15,
        duration
      );
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - 15,
        0
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Title */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{sectionLabel}</p>
        <h3 className="font-semibold text-sm mt-0.5">{title}</h3>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipBackward}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-all"
        >
          -15
        </button>

        <button
          onClick={togglePlay}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
            isPlaying
              ? "bg-gradient-to-r from-orange-600 to-orange-400 shadow-lg shadow-orange-500/30 animate-pulse"
              : "bg-gradient-to-r from-green-700 to-green-500 shadow-lg shadow-green-500/30 hover:scale-105"
          }`}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button
          onClick={skipForward}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-all"
        >
          +15
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed Control */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-gray-400">Velocidad:</span>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={playbackRate}
          onChange={handleSpeedChange}
          className="w-24 h-1 accent-green-500"
        />
        <span className="text-xs font-semibold text-green-400 min-w-[35px]">
          {playbackRate.toFixed(1)}x
        </span>
      </div>

      {/* Status */}
      {isCompleted && (
        <div className="text-center text-xs text-green-400 bg-green-500/10 rounded-lg py-2">
          ✓ Audio completado
        </div>
      )}
    </div>
  );
}
