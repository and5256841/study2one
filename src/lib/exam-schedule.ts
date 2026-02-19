/**
 * Exam Schedule Utilities
 *
 * Maps simulacro sections to specific global days based on a startDay.
 * 8 sections across 2 weeks (8 weekdays):
 *   Week 1: sections 1-5 (Mon-Fri)
 *   Week 2: sections 6-8 (Mon-Wed)
 */

export interface SectionDayMapping {
  sectionNumber: number;
  globalDay: number;
}

/**
 * Given a startDay (global day 1-125), returns the 8 section-day mappings.
 * Section 1 → startDay+0, Section 2 → startDay+1, ..., Section 8 → startDay+7
 */
export function getSectionSchedule(startDay: number): SectionDayMapping[] {
  return Array.from({ length: 8 }, (_, i) => ({
    sectionNumber: i + 1,
    globalDay: startDay + i,
  }));
}

/**
 * Given a startDay and the student's current global day, returns which
 * section number is scheduled for today, or null if none.
 */
export function getTodaysSection(
  startDay: number,
  currentGlobalDay: number
): number | null {
  const schedule = getSectionSchedule(startDay);
  const match = schedule.find((s) => s.globalDay === currentGlobalDay);
  return match ? match.sectionNumber : null;
}

/**
 * Validates that a simulacro starting at startDay fits within the 125-day program.
 * The last section occupies startDay + 7.
 */
export function isValidScheduleStart(startDay: number): boolean {
  return startDay >= 1 && startDay + 7 <= 125;
}

/**
 * Returns all global days that have already passed (are before currentGlobalDay)
 * in a given schedule — useful for checking missed sections.
 */
export function getMissedSections(
  startDay: number,
  currentGlobalDay: number
): SectionDayMapping[] {
  return getSectionSchedule(startDay).filter(
    (s) => s.globalDay < currentGlobalDay
  );
}
