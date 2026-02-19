"use client";

import { useMemo } from "react";
import { type EcgRhythmType, getWaveformData, getRhythmConfig } from "@/lib/ecg-rhythms";

interface EcgWaveformProps {
  rhythm: EcgRhythmType;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  xs: { width: 48, height: 24 },
  sm: { width: 120, height: 32 },
  md: { width: 160, height: 48 },
  lg: { width: 240, height: 48 },
} as const;

const STROKE_WIDTHS = { xs: 1.0, sm: 1.4, md: 1.6, lg: 1.8 } as const;
const GLOW_SIZES = { xs: 1.5, sm: 2, md: 2.5, lg: 3 } as const;

function getAnimationDuration(rhythm: EcgRhythmType): number {
  const speeds: Partial<Record<EcgRhythmType, number>> = {
    "sinus-bradycardia": 5.5,
    "sinus-tachycardia": 3,
    aflutter: 3,
    afib: 3.5,
    vtach: 2.5,
    asystole: 6,
  };
  return speeds[rhythm] ?? 4;
}

export default function EcgWaveform({
  rhythm,
  size = "sm",
  showLabel = false,
  className = "",
}: EcgWaveformProps) {
  const config = getRhythmConfig(rhythm);
  const { width, height } = SIZES[size];

  const points = useMemo(() => {
    const raw = getWaveformData(rhythm);
    const totalSamples = raw.length;

    const yMid = height / 2;
    const yScale = height * 0.4;

    const coords: string[] = [];
    for (let i = 0; i < totalSamples; i++) {
      const x = (i / totalSamples) * width;
      const y = yMid - raw[i] * yScale;
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    // Duplicate for seamless scrolling
    for (let i = 0; i < totalSamples; i++) {
      const x = width + (i / totalSamples) * width;
      const y = yMid - raw[i] * yScale;
      coords.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return coords.join(" ");
  }, [rhythm, width, height]);

  const duration = getAnimationDuration(rhythm);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-hidden"
        aria-label={config.label}
      >
        <g
          className="ecg-scroll"
          style={{ animationDuration: `${duration}s` }}
        >
          <polyline
            points={points}
            fill="none"
            stroke={config.color}
            strokeWidth={STROKE_WIDTHS[size]}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`drop-shadow(0 0 ${GLOW_SIZES[size]}px ${config.color})`}
          />
        </g>
      </svg>
      {showLabel && (
        <span
          className="text-[10px] font-medium whitespace-nowrap"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
