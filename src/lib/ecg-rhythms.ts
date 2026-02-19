// ECG Waveform Generators — Pure math, no external dependencies
// Each generator returns number[] of y-values representing one or more cardiac cycles
// 10 rhythms from best (sinus-bradycardia) to worst (asystole)

export type EcgRhythmType =
  | "sinus-bradycardia"
  | "normal-sinus"
  | "sinus-tachycardia"
  | "premature-beats"
  | "wenckebach"
  | "mobitz-ii"
  | "afib"
  | "aflutter"
  | "vtach"
  | "asystole";

export interface EcgRhythm {
  type: EcgRhythmType;
  label: string;
  color: string;
  description: string;
}

const RHYTHM_CONFIGS: Record<EcgRhythmType, EcgRhythm> = {
  "sinus-bradycardia": {
    type: "sinus-bradycardia",
    label: "Bradicardia sinusal atlética",
    color: "#059669",
    description: "Rendimiento élite",
  },
  "normal-sinus": {
    type: "normal-sinus",
    label: "Ritmo sinusal normal",
    color: "#22c55e",
    description: "Activo, buen desempeño",
  },
  "sinus-tachycardia": {
    type: "sinus-tachycardia",
    label: "Taquicardia sinusal",
    color: "#84cc16",
    description: "Ligeramente elevado",
  },
  "premature-beats": {
    type: "premature-beats",
    label: "Extrasístoles",
    color: "#a3e635",
    description: "Irregularidades leves",
  },
  wenckebach: {
    type: "wenckebach",
    label: "Wenckebach (Mobitz I)",
    color: "#eab308",
    description: "Retrasos progresivos",
  },
  "mobitz-ii": {
    type: "mobitz-ii",
    label: "Mobitz II",
    color: "#f59e0b",
    description: "Bloqueos intermitentes",
  },
  afib: {
    type: "afib",
    label: "Fibrilación auricular",
    color: "#f97316",
    description: "Ritmo irregular",
  },
  aflutter: {
    type: "aflutter",
    label: "Flutter auricular",
    color: "#ea580c",
    description: "Patrón en sierra",
  },
  vtach: {
    type: "vtach",
    label: "Taquicardia ventricular",
    color: "#ef4444",
    description: "Crítico",
  },
  asystole: {
    type: "asystole",
    label: "Asistolia",
    color: "#6b7280",
    description: "Sin actividad",
  },
};

// Ordered from best to worst — used for informational display
export const ALL_RHYTHMS_ORDERED: EcgRhythmType[] = [
  "sinus-bradycardia",
  "normal-sinus",
  "sinus-tachycardia",
  "premature-beats",
  "wenckebach",
  "mobitz-ii",
  "afib",
  "aflutter",
  "vtach",
  "asystole",
];

export function getRhythmConfig(type: EcgRhythmType): EcgRhythm {
  return RHYTHM_CONFIGS[type];
}

// ── Gaussian helper ──
function gaussian(x: number, center: number, height: number, width: number): number {
  return height * Math.exp(-((x - center) ** 2) / (2 * width ** 2));
}

// ── Sinus Bradycardia (Athletic) ──
// Slow, calm rhythm with wide RR intervals (~250 samples/beat = ~50 BPM feel)
// Tall, well-defined P, QRS, T waves with generous spacing
function generateSinusBradycardia(): number[] {
  const samples = 750;
  const data: number[] = new Array(samples).fill(0);
  const beatLength = 250;
  const beats = 3;

  for (let beat = 0; beat < beats; beat++) {
    const offset = beat * beatLength;
    for (let i = 0; i < beatLength && offset + i < samples; i++) {
      // P wave — well-defined, slightly taller than normal
      data[offset + i] += gaussian(i, 50, 0.14, 10);
      // Q wave
      data[offset + i] += gaussian(i, 90, -0.08, 3);
      // R wave — tall, clean spike
      data[offset + i] += gaussian(i, 100, 0.95, 4.5);
      // S wave
      data[offset + i] += gaussian(i, 110, -0.2, 4);
      // T wave — broad and prominent
      data[offset + i] += gaussian(i, 165, 0.25, 14);
    }
  }

  return data;
}

// ── Normal Sinus Rhythm ──
// Regular P-QRS-T complexes with consistent RR intervals
function generateNormalSinus(): number[] {
  const samples = 600;
  const data: number[] = new Array(samples).fill(0);
  const beatLength = 200;
  const beats = 3;

  for (let beat = 0; beat < beats; beat++) {
    const offset = beat * beatLength;
    for (let i = 0; i < beatLength && offset + i < samples; i++) {
      // P wave
      data[offset + i] += gaussian(i, 40, 0.12, 8);
      // Q wave (small negative)
      data[offset + i] += gaussian(i, 72, -0.08, 3);
      // R wave (tall positive spike)
      data[offset + i] += gaussian(i, 80, 0.9, 4);
      // S wave (negative dip)
      data[offset + i] += gaussian(i, 88, -0.2, 4);
      // T wave
      data[offset + i] += gaussian(i, 130, 0.2, 12);
    }
  }

  return data;
}

// ── Sinus Tachycardia ──
// Normal P-QRS-T but compressed RR intervals (~140 samples/beat = ~100 BPM feel)
// Slightly smaller T waves due to rate
function generateSinusTachycardia(): number[] {
  const samples = 700;
  const data: number[] = new Array(samples).fill(0);
  const beatLength = 140;
  const beats = 5;

  for (let beat = 0; beat < beats; beat++) {
    const offset = beat * beatLength;
    for (let i = 0; i < beatLength && offset + i < samples; i++) {
      // P wave — slightly smaller, closer to QRS
      data[offset + i] += gaussian(i, 25, 0.10, 6);
      // Q wave
      data[offset + i] += gaussian(i, 50, -0.07, 3);
      // R wave
      data[offset + i] += gaussian(i, 56, 0.85, 3.5);
      // S wave
      data[offset + i] += gaussian(i, 63, -0.18, 3.5);
      // T wave — flattened due to rate
      data[offset + i] += gaussian(i, 95, 0.14, 10);
    }
  }

  return data;
}

// ── Premature Beats (PVCs) ──
// 3 normal sinus beats, then 1 premature ventricular contraction with wider QRS,
// no preceding P wave, inverted T, followed by a compensatory pause
function generatePrematureBeats(): number[] {
  const samples = 800;
  const data: number[] = new Array(samples).fill(0);
  let pos = 0;

  for (let cycle = 0; cycle < 2; cycle++) {
    // 3 normal beats
    for (let beat = 0; beat < 3; beat++) {
      const beatLen = 175;
      if (pos + beatLen > samples) break;
      for (let i = 0; i < beatLen; i++) {
        data[pos + i] += gaussian(i, 35, 0.12, 8);
        data[pos + i] += gaussian(i, 65, -0.07, 3);
        data[pos + i] += gaussian(i, 72, 0.85, 4);
        data[pos + i] += gaussian(i, 80, -0.18, 4);
        data[pos + i] += gaussian(i, 120, 0.18, 11);
      }
      pos += beatLen;
    }

    // PVC — early, wide QRS, no P wave, inverted T
    if (pos + 130 <= samples) {
      const pvcStart = -30; // arrives early (shorter coupling interval)
      pos += pvcStart;
      if (pos < 0) pos = 0;
      const pvcLen = 160;
      for (let i = 0; i < pvcLen && pos + i < samples; i++) {
        // Wide, bizarre QRS
        data[pos + i] += gaussian(i, 15, -0.15, 5);
        data[pos + i] += gaussian(i, 30, 0.95, 8);
        data[pos + i] += gaussian(i, 50, -0.4, 7);
        // Inverted T wave
        data[pos + i] += gaussian(i, 80, -0.2, 10);
      }
      pos += pvcLen;
    }
  }

  return data.slice(0, samples);
}

// ── Wenckebach (Mobitz Type I) ──
// Progressive PR prolongation over 4 beats, then a dropped beat
function generateWenckebach(): number[] {
  const samples = 800;
  const data: number[] = new Array(samples).fill(0);
  const prIntervals = [60, 72, 88, 108];
  let pos = 0;

  for (let beat = 0; beat < 5; beat++) {
    if (beat === 4) {
      // Dropped beat — only P wave, no QRS
      for (let i = 0; i < 160 && pos + i < samples; i++) {
        data[pos + i] += gaussian(i, 40, 0.12, 8);
      }
      pos += 160;
    } else {
      const pr = prIntervals[beat];
      const beatLen = 180;
      for (let i = 0; i < beatLen && pos + i < samples; i++) {
        data[pos + i] += gaussian(i, 30, 0.12, 8);
        data[pos + i] += gaussian(i, pr - 8, -0.06, 3);
        data[pos + i] += gaussian(i, pr, 0.85, 4);
        data[pos + i] += gaussian(i, pr + 8, -0.18, 4);
        data[pos + i] += gaussian(i, pr + 50, 0.18, 12);
      }
      pos += beatLen;
    }
  }

  return data.slice(0, samples);
}

// ── Mobitz Type II ──
// Regular PR interval but every 3rd P wave is not conducted (dropped QRS)
function generateMobitzII(): number[] {
  const samples = 700;
  const data: number[] = new Array(samples).fill(0);
  const beatLen = 175;

  for (let beat = 0; beat < 4; beat++) {
    const offset = beat * beatLen;
    const dropped = beat % 3 === 2;

    for (let i = 0; i < beatLen && offset + i < samples; i++) {
      data[offset + i] += gaussian(i, 40, 0.12, 8);

      if (!dropped) {
        data[offset + i] += gaussian(i, 72, -0.07, 3);
        data[offset + i] += gaussian(i, 80, 0.85, 4);
        data[offset + i] += gaussian(i, 88, -0.18, 4);
        data[offset + i] += gaussian(i, 130, 0.18, 12);
      }
    }
  }

  return data;
}

// ── Atrial Fibrillation ──
// Irregularly irregular rhythm, no P waves, fibrillatory baseline
function generateAfib(): number[] {
  const samples = 700;
  const data: number[] = new Array(samples).fill(0);

  const seed = 42;
  for (let i = 0; i < samples; i++) {
    data[i] += 0.03 * Math.sin(i * 0.8 + seed) +
               0.02 * Math.sin(i * 1.7 + seed * 2) +
               0.015 * Math.sin(i * 3.1 + seed * 3);
  }

  const rrIntervals = [120, 160, 100, 180, 110, 140];
  let pos = 20;

  for (const rr of rrIntervals) {
    if (pos >= samples) break;

    for (let i = 0; i < rr && pos + i < samples; i++) {
      data[pos + i] += gaussian(i, 10, -0.06, 3);
      data[pos + i] += gaussian(i, 18, 0.8, 4);
      data[pos + i] += gaussian(i, 26, -0.15, 4);
      data[pos + i] += gaussian(i, 65, 0.15, 10);
    }
    pos += rr;
  }

  return data;
}

// ── Atrial Flutter ──
// Sawtooth flutter waves at ~300/min baseline with QRS every 3-4 flutter waves
function generateAflutter(): number[] {
  const samples = 700;
  const data: number[] = new Array(samples).fill(0);

  // Sawtooth flutter waves — continuous undulating baseline
  const flutterPeriod = 35; // samples per flutter wave
  for (let i = 0; i < samples; i++) {
    const phase = (i % flutterPeriod) / flutterPeriod;
    // Asymmetric sawtooth: slow rise, sharp fall
    if (phase < 0.7) {
      data[i] += 0.12 * (phase / 0.7);
    } else {
      data[i] += 0.12 * (1.0 - (phase - 0.7) / 0.3);
    }
    data[i] -= 0.06; // center around zero
  }

  // QRS complexes at regular intervals (every ~4 flutter waves = 4:1 block)
  const qrsInterval = flutterPeriod * 4;
  let pos = 20;

  while (pos < samples - 60) {
    for (let i = 0; i < 60 && pos + i < samples; i++) {
      data[pos + i] += gaussian(i, 8, -0.06, 3);
      data[pos + i] += gaussian(i, 15, 0.8, 4);
      data[pos + i] += gaussian(i, 22, -0.15, 4);
      // T wave partially merged with flutter waves
      data[pos + i] += gaussian(i, 42, 0.12, 8);
    }
    pos += qrsInterval;
  }

  return data;
}

// ── Ventricular Tachycardia ──
// Wide QRS complexes, fast rate, monomorphic
function generateVtach(): number[] {
  const samples = 600;
  const data: number[] = new Array(samples).fill(0);
  const beatLen = 80;
  const beats = Math.floor(samples / beatLen);

  for (let beat = 0; beat < beats; beat++) {
    const offset = beat * beatLen;
    for (let i = 0; i < beatLen && offset + i < samples; i++) {
      data[offset + i] += gaussian(i, 15, -0.3, 6);
      data[offset + i] += gaussian(i, 30, 0.95, 8);
      data[offset + i] += gaussian(i, 48, -0.5, 7);
      data[offset + i] += gaussian(i, 65, 0.2, 8);
    }
  }

  return data;
}

// ── Asystole ──
// Nearly flat line with subtle baseline noise
function generateAsystole(): number[] {
  const samples = 600;
  const data: number[] = new Array(samples).fill(0);

  for (let i = 0; i < samples; i++) {
    data[i] = 0.015 * Math.sin(i * 0.05) +
              0.008 * Math.sin(i * 0.13) +
              0.005 * Math.sin(i * 0.31);
  }

  return data;
}

// ── Waveform cache ──
const waveformCache = new Map<EcgRhythmType, number[]>();

const generators: Record<EcgRhythmType, () => number[]> = {
  "sinus-bradycardia": generateSinusBradycardia,
  "normal-sinus": generateNormalSinus,
  "sinus-tachycardia": generateSinusTachycardia,
  "premature-beats": generatePrematureBeats,
  wenckebach: generateWenckebach,
  "mobitz-ii": generateMobitzII,
  afib: generateAfib,
  aflutter: generateAflutter,
  vtach: generateVtach,
  asystole: generateAsystole,
};

export function getWaveformData(type: EcgRhythmType): number[] {
  if (!waveformCache.has(type)) {
    waveformCache.set(type, generators[type]());
  }
  return waveformCache.get(type)!;
}

// ── Student rhythm mapper ──
export interface StudentHealthInput {
  daysInactive: number;
  streak: number;
  avgQuizScore: number;
}

export function getStudentRhythm(input: StudentHealthInput): EcgRhythm {
  const { daysInactive, streak, avgQuizScore } = input;

  // Level 10: Asystole — 14+ days inactive or never active
  if (daysInactive >= 14 || daysInactive >= 999) {
    return RHYTHM_CONFIGS["asystole"];
  }

  // Level 9: VTach — 10+ days inactive OR (7+ AND quiz < 30%)
  if (daysInactive >= 10 || (daysInactive >= 7 && avgQuizScore < 30)) {
    return RHYTHM_CONFIGS["vtach"];
  }

  // Level 8: AFlutter — 7-9 days inactive OR (5+ AND quiz < 40%)
  if (daysInactive >= 7 || (daysInactive >= 5 && avgQuizScore < 40)) {
    return RHYTHM_CONFIGS["aflutter"];
  }

  // Level 7: AFib — 5-6 days inactive OR quiz < 30%
  if (daysInactive >= 5 || avgQuizScore < 30) {
    return RHYTHM_CONFIGS["afib"];
  }

  // Level 6: Mobitz II — 3-4 days inactive OR quiz < 45%
  if (daysInactive >= 3 || avgQuizScore < 45) {
    return RHYTHM_CONFIGS["mobitz-ii"];
  }

  // Level 5: Wenckebach — 2 days inactive OR quiz < 60%
  if (daysInactive >= 2 || avgQuizScore < 60) {
    return RHYTHM_CONFIGS["wenckebach"];
  }

  // Level 4: Premature beats — 1 day inactive OR quiz < 70%
  if (daysInactive >= 1 || avgQuizScore < 70) {
    return RHYTHM_CONFIGS["premature-beats"];
  }

  // Level 3: Sinus tachycardia — active but quiz < 85%
  if (avgQuizScore < 85) {
    return RHYTHM_CONFIGS["sinus-tachycardia"];
  }

  // Level 2: Normal sinus — active, quiz >= 85% but streak < 5 or quiz < 95%
  if (avgQuizScore < 95 || streak < 5) {
    return RHYTHM_CONFIGS["normal-sinus"];
  }

  // Level 1: Sinus bradycardia — elite: active, quiz >= 95%, streak >= 5
  return RHYTHM_CONFIGS["sinus-bradycardia"];
}

export function getStudentRhythmFromActivity(
  lastActivity: string | null,
  streak: number,
  avgQuizScore: number
): EcgRhythm {
  let daysInactive = 999;
  if (lastActivity) {
    daysInactive = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  return getStudentRhythm({ daysInactive, streak, avgQuizScore });
}
