/**
 * Exam Schedule Utilities
 *
 * Maps simulacro sections to specific global days based on a startDay and mode.
 *
 * WEEKLY mode (default): 8 sections across 2 weeks (8 weekdays)
 *   Week 1: sections 1-5 (Mon-Fri)
 *   Week 2: sections 6-8 (Mon-Wed)
 *
 * CONTINUOUS mode (Simulacro 5): ALL 8 sections on the SAME day (startDay)
 *   Replicates the real Saber Pro experience — all sections in one sitting.
 */

export type ExamMode = "WEEKLY" | "CONTINUOUS";

export interface SectionDayMapping {
  sectionNumber: number;
  globalDay: number;
}

/**
 * Given a startDay (global day 1-125) and mode, returns the 8 section-day mappings.
 *
 * WEEKLY:     Section 1 → startDay+0, Section 2 → startDay+1, ..., Section 8 → startDay+7
 * CONTINUOUS: All 8 sections → startDay (same day)
 */
export function getSectionSchedule(
  startDay: number,
  mode: ExamMode = "WEEKLY"
): SectionDayMapping[] {
  return Array.from({ length: 8 }, (_, i) => ({
    sectionNumber: i + 1,
    globalDay: mode === "CONTINUOUS" ? startDay : startDay + i,
  }));
}

/**
 * Given a startDay, mode, and the student's current global day, returns which
 * section number(s) are scheduled for today, or null if none.
 *
 * For WEEKLY mode: returns the single section scheduled for today, or null.
 * For CONTINUOUS mode: returns 1 (all sections are on startDay), or null.
 *   (In CONTINUOUS mode sectionNumber=1 signals "all sections available today")
 */
export function getTodaysSection(
  startDay: number,
  currentGlobalDay: number,
  mode: ExamMode = "WEEKLY"
): number | null {
  const schedule = getSectionSchedule(startDay, mode);
  const match = schedule.find((s) => s.globalDay === currentGlobalDay);
  return match ? match.sectionNumber : null;
}

/**
 * Validates that a simulacro starting at startDay fits within the 125-day program.
 *
 * WEEKLY:     The last section occupies startDay + 7.
 * CONTINUOUS: All sections are on startDay, so only startDay needs to be valid.
 */
export function isValidScheduleStart(
  startDay: number,
  mode: ExamMode = "WEEKLY"
): boolean {
  if (mode === "CONTINUOUS") {
    return startDay >= 1 && startDay <= 125;
  }
  return startDay >= 1 && startDay + 7 <= 125;
}

/**
 * Returns all global days that have already passed (are before currentGlobalDay)
 * in a given schedule — useful for checking missed sections.
 */
export function getMissedSections(
  startDay: number,
  currentGlobalDay: number,
  mode: ExamMode = "WEEKLY"
): SectionDayMapping[] {
  return getSectionSchedule(startDay, mode).filter(
    (s) => s.globalDay < currentGlobalDay
  );
}
