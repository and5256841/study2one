"use client";

import { useEffect, useRef, useCallback } from "react";

interface ExamTimerProps {
  durationMinutes: number;
  elapsedSeconds: number;
  onTick: (elapsed: number) => void;
  onTimeUp: () => void;
  onWarning?: (minutesLeft: number) => void;
}

export default function ExamTimer({
  durationMinutes,
  elapsedSeconds,
  onTick,
  onTimeUp,
  onWarning,
}: ExamTimerProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningsGiven = useRef<Set<number>>(new Set());

  const totalSeconds = durationMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 300; // 5 min
  const isCritical = remaining <= 60; // 1 min

  const tick = useCallback(() => {
    onTick(elapsedSeconds + 1);
  }, [elapsedSeconds, onTick]);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onTimeUp();
      return;
    }
    if (onWarning) {
      if (remaining === 300 && !warningsGiven.current.has(5)) {
        warningsGiven.current.add(5);
        onWarning(5);
      }
      if (remaining === 60 && !warningsGiven.current.has(1)) {
        warningsGiven.current.add(1);
        onWarning(1);
      }
    }
  }, [remaining, onTimeUp, onWarning]);

  return (
    <div
      className={`font-mono text-lg font-bold tabular-nums ${
        isCritical
          ? "text-red-400 animate-pulse"
          : isLow
          ? "text-orange-400"
          : "text-white"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
