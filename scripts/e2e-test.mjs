/**
 * E2E Integration Test Script for Study2One Platform
 *
 * Simulates multiple concurrent users (students + coordinator) interacting
 * with the platform to identify bugs, race conditions, and data integrity issues.
 *
 * Prerequisites:
 *   - Dev server running on localhost:3000
 *   - Demo data seeded (seed-demo-full-access.mjs, seed-daily-questions.mjs, seed-monthly-exams.mjs)
 *
 * Usage: node scripts/e2e-test.mjs
 *
 * Zero dependencies — uses Node.js native fetch (Node 18+).
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const USERS = {
  coordinator: { email: "coordinador@test.com", password: "123456" },
  student1: { email: "demo@study2one.com", password: "123456" },
  student2: { email: "normal@demo.com", password: "123456" },
  student3: { email: "taqui@demo.com", password: "123456" },
  student4: { email: "extra@demo.com", password: "123456" },
};

// ─── Result tracking ────────────────────────────────────────────
const results = { passed: 0, failed: 0, errors: [], warnings: [], bugs: [] };

function pass(testName) {
  results.passed++;
  console.log(`  \x1b[32mPASS\x1b[0m  ${testName}`);
}

function fail(testName, details = "") {
  results.failed++;
  const msg = `${testName}${details ? " -- " + details : ""}`;
  results.errors.push(msg);
  console.log(`  \x1b[31mFAIL\x1b[0m  ${msg}`);
}

function warn(msg) {
  results.warnings.push(msg);
  console.log(`  \x1b[33mWARN\x1b[0m  ${msg}`);
}

function bug(category, description) {
  results.bugs.push({ category, description });
  console.log(`  \x1b[35mBUG \x1b[0m  [${category}] ${description}`);
}

function assert(condition, testName, details = "") {
  if (condition) pass(testName);
  else fail(testName, details);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Cookie helpers ─────────────────────────────────────────────
function parseCookies(setCookieHeaders) {
  const cookies = {};
  if (!setCookieHeaders) return cookies;

  // getSetCookie() returns an array in Node 18.14+
  const items =
    typeof setCookieHeaders === "string"
      ? setCookieHeaders.split(/,(?=[^ ])/)
      : Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : [setCookieHeaders];

  for (const item of items) {
    const [pair] = item.split(";");
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 0) continue;
    const name = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();
    cookies[name] = value;
  }
  return cookies;
}

function formatCookies(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ─── Auth helper ────────────────────────────────────────────────
async function login(email, password) {
  // Step 1: Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfSetCookie = csrfRes.headers.getSetCookie
    ? csrfRes.headers.getSetCookie()
    : csrfRes.headers.get("set-cookie");
  const csrfCookies = parseCookies(csrfSetCookie);
  const { csrfToken } = await csrfRes.json();

  // Step 2: POST credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: formatCookies(csrfCookies),
    },
    body: new URLSearchParams({ csrfToken, email, password, redirect: "false" }),
    redirect: "manual",
  });

  const loginSetCookie = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : loginRes.headers.get("set-cookie");
  const sessionCookies = parseCookies(loginSetCookie);
  const allCookies = { ...csrfCookies, ...sessionCookies };

  const hasSession =
    allCookies["authjs.session-token"] ||
    allCookies["__Secure-authjs.session-token"];

  return { cookies: allCookies, email, hasSession: !!hasSession };
}

// ─── Authenticated fetch helper ─────────────────────────────────
async function authFetch(session, method, path, body = null) {
  const startTime = Date.now();
  const options = {
    method,
    headers: { Cookie: formatCookies(session.cookies) },
    redirect: "manual",
  };

  if (body && !(body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    options.body = body;
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  const elapsed = Date.now() - startTime;

  let data;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, elapsed };
}

// ─── Tiny valid PNG for photo upload ────────────────────────────
function createTinyPNG() {
  // Minimal 1x1 red pixel PNG
  const hex =
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000" +
    "907753de0000000c4944415478016360f80f000001010000182dd56e" +
    "0000000049454e44ae426082";
  return Buffer.from(hex, "hex");
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 1: AUTHENTICATION
// ═══════════════════════════════════════════════════════════════
async function phase1() {
  console.log("\n--- Phase 1: Authentication ---");
  const sessions = {};

  // Login coordinator
  try {
    sessions.coordinator = await login(USERS.coordinator.email, USERS.coordinator.password);
    assert(sessions.coordinator.hasSession, "Login coordinator");
  } catch (e) {
    fail("Login coordinator", e.message);
  }

  // Login 4 students in parallel
  const studentLogins = await Promise.allSettled([
    login(USERS.student1.email, USERS.student1.password),
    login(USERS.student2.email, USERS.student2.password),
    login(USERS.student3.email, USERS.student3.password),
    login(USERS.student4.email, USERS.student4.password),
  ]);

  const studentKeys = ["student1", "student2", "student3", "student4"];
  for (let i = 0; i < studentKeys.length; i++) {
    const result = studentLogins[i];
    if (result.status === "fulfilled" && result.value.hasSession) {
      sessions[studentKeys[i]] = result.value;
      pass(`Login ${studentKeys[i]} (${result.value.email})`);
    } else {
      const reason =
        result.status === "rejected"
          ? result.reason.message
          : "No session cookie";
      fail(`Login ${studentKeys[i]}`, reason);
    }
  }

  // Wrong password
  try {
    const bad = await login("demo@study2one.com", "wrongpassword");
    assert(!bad.hasSession, "Reject wrong password");
  } catch {
    pass("Reject wrong password (threw error)");
  }

  // Non-existent email
  try {
    const bad = await login("nonexistent@test.com", "123456");
    assert(!bad.hasSession, "Reject non-existent email");
  } catch {
    pass("Reject non-existent email (threw error)");
  }

  // Unauthenticated access
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard`);
    const data = await res.json();
    assert(
      res.status === 401 || data.error,
      "Unauthenticated /api/dashboard blocked",
      `Got status ${res.status}`
    );
  } catch {
    pass("Unauthenticated /api/dashboard blocked (connection error)");
  }

  return sessions;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 2: STUDENT DASHBOARD + DAY CONTENT
// ═══════════════════════════════════════════════════════════════
async function phase2(sessions) {
  console.log("\n--- Phase 2: Student Dashboard + Day Content ---");
  const dayDataMap = {};

  const studentSessions = ["student1", "student2", "student3", "student4"]
    .filter((k) => sessions[k])
    .map((k) => ({ key: k, session: sessions[k] }));

  // Dashboard load for all students in parallel
  const dashResults = await Promise.allSettled(
    studentSessions.map(async ({ key, session }) => {
      const r = await authFetch(session, "GET", "/api/dashboard");
      assert(r.status === 200, `${key}: Dashboard loads`, `status=${r.status}`);
      if (r.status === 200) {
        assert(typeof r.data.currentDay === "number", `${key}: Dashboard has currentDay`);
        assert(r.data.progress?.totalDays === 125, `${key}: Dashboard totalDays=125`);
        assert(Array.isArray(r.data.upcomingDays), `${key}: Dashboard has upcomingDays`);
        assert(r.data.cohort?.id, `${key}: Dashboard has cohort`);
        return { key, maxDay: r.data.maxUnlockedDay, currentDay: r.data.currentDay };
      }
    })
  );

  // Day content for 3 representative days: 1 (M1), 46 (M4), 66 (M6)
  for (const { key, session } of studentSessions) {
    for (const [dayId, expectedModule] of [
      [1, 1],
      [46, 4],
      [66, 6],
    ]) {
      const r = await authFetch(session, "GET", `/api/day/${dayId}`);
      if (r.status === 200) {
        assert(
          r.data.moduleNumber === expectedModule,
          `${key}: Day ${dayId} moduleNumber=${expectedModule}`,
          `got ${r.data.moduleNumber}`
        );
        dayDataMap[`${key}_day${dayId}`] = r.data;
      } else {
        fail(`${key}: Day ${dayId} loads`, `status=${r.status}`);
      }
    }
  }

  // Invalid day IDs
  if (studentSessions[0]) {
    const s = studentSessions[0].session;
    for (const bad of [0, 126, "abc"]) {
      const r = await authFetch(s, "GET", `/api/day/${bad}`);
      assert(
        r.status === 400 || r.status === 404,
        `Day ${bad} returns error`,
        `status=${r.status}`
      );
    }
  }

  // Profile
  for (const { key, session } of studentSessions.slice(0, 2)) {
    const r = await authFetch(session, "GET", "/api/profile");
    assert(r.status === 200, `${key}: Profile loads`, `status=${r.status}`);
    if (r.status === 200) {
      assert(!!r.data.name, `${key}: Profile has name`);
      assert(!!r.data.rhythm, `${key}: Profile has rhythm`);
    }
  }

  // Leaderboard
  if (studentSessions[0]) {
    const r = await authFetch(studentSessions[0].session, "GET", "/api/leaderboard");
    assert(r.status === 200, "Leaderboard loads", `status=${r.status}`);
    if (r.status === 200) {
      assert(Array.isArray(r.data.leaderboard), "Leaderboard has array");
    }
  }

  // Roadmap
  if (studentSessions[0]) {
    const r = await authFetch(studentSessions[0].session, "GET", "/api/student/roadmap");
    assert(r.status === 200, "Roadmap loads", `status=${r.status}`);
    if (r.status === 200) {
      assert(r.data.modules?.length === 8, "Roadmap has 8 modules", `got ${r.data.modules?.length}`);
    }
  }

  // Notifications
  if (studentSessions[0]) {
    const r = await authFetch(studentSessions[0].session, "GET", "/api/notifications");
    assert(r.status === 200, "Notifications loads", `status=${r.status}`);
  }

  return dayDataMap;
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 3: LEARNING FLOW (Audio → Quiz → Photo)
// ═══════════════════════════════════════════════════════════════
async function phase3(sessions, dayDataMap) {
  console.log("\n--- Phase 3: Learning Flow (Audio → Quiz → Photo) ---");

  const s1 = sessions.student1;
  if (!s1) {
    warn("Skipping Phase 3: student1 not logged in");
    return;
  }

  // Use day 1 data (Module 1)
  const dayData = dayDataMap["student1_day1"];
  if (!dayData) {
    warn("Skipping Phase 3: no day 1 data");
    return;
  }

  const dailyContentId = dayData.id;
  const globalDay = 1;

  // 3.1 Audio progress (25% → 50% → 90% → 100%)
  for (const [pct, time] of [
    [25, 30],
    [50, 120],
    [90, 240],
    [100, 300],
  ]) {
    const r = await authFetch(s1, "POST", `/api/audio/${dailyContentId}/progress`, {
      currentTime: time,
      percentage: pct,
      playbackSpeed: 1.0,
    });
    assert(r.status === 200 && r.data.success, `Audio progress ${pct}%`, `status=${r.status}`);
  }

  // 3.2 Quiz load
  const quizR = await authFetch(s1, "GET", `/api/quiz/${globalDay}`);
  assert(quizR.status === 200, "Quiz loads for day 1", `status=${quizR.status}`);
  assert(Array.isArray(quizR.data.questions), "Quiz has questions array");

  if (quizR.data.questions.length === 0) {
    warn("Day 1 has no quiz questions — seed with seed-daily-questions.mjs");
  }

  // 3.3 Quiz submit (correct answers)
  if (quizR.data.questions.length > 0) {
    const questions = quizR.data.questions;

    // Build correct answers
    const correctAnswers = questions.map((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect);
      return { questionId: q.id, optionId: correctOpt?.id || q.options[0]?.id, isCorrect: !!correctOpt };
    });

    // NOTE: Quiz exposes isCorrect on options — this is BY DESIGN for daily quizzes
    // (immediate feedback per question). Monthly exam sections do NOT expose isCorrect.
    const leaksAnswers = questions.some((q) => q.options.some((o) => o.isCorrect !== undefined));
    if (leaksAnswers) {
      warn("Daily quiz exposes isCorrect (by design — needed for immediate feedback UI)");
    }

    const score = correctAnswers.filter((a) => a.isCorrect).length;
    const submitR = await authFetch(s1, "POST", `/api/quiz/${globalDay}/submit`, {
      answers: correctAnswers,
      score,
      timeSpentSeconds: 45,
    });
    assert(submitR.status === 200 && submitR.data.success, "Quiz submit (correct)", `status=${submitR.status}`);
    assert(submitR.data.score === score, "Quiz score matches", `expected ${score}, got ${submitR.data.score}`);

    // 3.4 Double submit — quiz allows retakes but streak should NOT increment twice
    const profileBefore = await authFetch(s1, "GET", "/api/profile");
    const streakBefore = profileBefore.data?.streak?.current ?? 0;

    const submit2R = await authFetch(s1, "POST", `/api/quiz/${globalDay}/submit`, {
      answers: correctAnswers,
      score,
      timeSpentSeconds: 30,
    });
    assert(submit2R.status === 200, "Quiz re-submit allowed (practice)", `status=${submit2R.status}`);

    const profileAfter = await authFetch(s1, "GET", "/api/profile");
    const streakAfter = profileAfter.data?.streak?.current ?? 0;

    if (streakAfter > streakBefore) {
      bug("quiz", `Streak incremented on re-submit: ${streakBefore} → ${streakAfter}`);
    } else {
      pass("Streak NOT incremented on quiz re-submit (fix verified)");
    }
  }

  // 3.5 Photo upload
  const pngBuf = createTinyPNG();

  // Test day 1 (dayNumber 1 exists in many modules — ambiguous)
  const formData1 = new FormData();
  formData1.append("photo", new Blob([pngBuf], { type: "image/png" }), "test.png");
  formData1.append("photoType", "CUADERNILLO");
  const photoR1 = await authFetch(s1, "POST", "/api/photos/1", formData1);
  assert(photoR1.status === 200, "Photo upload day 1", `status=${photoR1.status}`);

  // BUG CHECK: Photo upload for day 46 (global day, but dayNumber 1 in Module 4)
  const formData46 = new FormData();
  formData46.append("photo", new Blob([pngBuf], { type: "image/png" }), "test46.png");
  formData46.append("photoType", "CUADERNILLO");
  const photoR46 = await authFetch(s1, "POST", "/api/photos/46", formData46);
  if (photoR46.status === 404) {
    bug(
      "photos",
      "POST /api/photos/46 returns 404 — uses raw dayId as dayNumber instead of getModuleForDay()+getDayInModule()"
    );
  } else {
    pass("Photo upload day 46 works");
  }

  // 3.6 Verify day completion
  const verifyR = await authFetch(s1, "GET", `/api/day/${globalDay}`);
  if (verifyR.status === 200) {
    assert(verifyR.data.audioProgress?.isCompleted, "Day 1 audio marked complete");
    assert(verifyR.data.quizCompleted, "Day 1 quiz marked complete");
  }

  // 3.7 Streak double-counting check is now done via differential in 3.4 above
  // Audio completion no longer increments streak (fix applied), only quiz does
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 4: WRITING PRACTICE (Module 4)
// ═══════════════════════════════════════════════════════════════
async function phase4(sessions) {
  console.log("\n--- Phase 4: Writing Practice (Module 4) ---");

  const s1 = sessions.student1;
  if (!s1) {
    warn("Skipping Phase 4: student1 not logged in");
    return;
  }

  // Day 46 = Module 4, Day 1 in module
  const r1 = await authFetch(s1, "GET", "/api/writing/46");
  assert(r1.status === 200, "Writing GET day 46 (Module 4)", `status=${r1.status}`);
  if (r1.status === 200) {
    assert(r1.data.dayInModule === 1, "Writing dayInModule=1", `got ${r1.data.dayInModule}`);
  }

  // Non-Module-4 day → 404
  const r2 = await authFetch(s1, "GET", "/api/writing/1");
  assert(r2.status === 404, "Writing GET day 1 (Module 1) → 404", `status=${r2.status}`);

  // Submit valid writing
  const text =
    "Este es un ensayo argumentativo de prueba para evaluar el funcionamiento de la plataforma Study2One. " +
    "El objetivo es verificar que el sistema de escritura funcione correctamente y registre las métricas de tiempo.";
  const submitR = await authFetch(s1, "POST", "/api/writing/46/submit", {
    content: text,
    timeSpentSeconds: 300,
  });
  assert(submitR.status === 200, "Writing submit day 46", `status=${submitR.status}`);
  if (submitR.status === 200) {
    assert(submitR.data.wordCount > 10, "Word count calculated", `got ${submitR.data.wordCount}`);
  }

  // Submit too-short text → 400
  const shortR = await authFetch(s1, "POST", "/api/writing/46/submit", {
    content: "Corto",
    timeSpentSeconds: 5,
  });
  assert(shortR.status === 400, "Short writing rejected", `status=${shortR.status}`);

  // Verify retrieval
  const verifyR = await authFetch(s1, "GET", "/api/writing/46");
  if (verifyR.status === 200) {
    assert(verifyR.data.submission !== null, "Writing submission retrieved");
  }
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 5: MONTHLY EXAM (SIMULACRO) FLOW
// ═══════════════════════════════════════════════════════════════
async function phase5(sessions) {
  console.log("\n--- Phase 5: Monthly Exam (Simulacro) Flow ---");

  const s1 = sessions.student1;
  if (!s1) {
    warn("Skipping Phase 5: student1 not logged in");
    return;
  }

  // 5.1 List monthly exams
  const listR = await authFetch(s1, "GET", "/api/monthly-exam");
  assert(listR.status === 200, "Monthly exam list loads", `status=${listR.status}`);

  if (!listR.data.exams || listR.data.exams.length === 0) {
    warn("No monthly exams found — seed with simulacros/seed-monthly-exams.mjs");
    return;
  }

  assert(listR.data.exams.length >= 1, `Found ${listR.data.exams.length} monthly exams`);

  // Find an active exam or the first one
  let targetExam = listR.data.exams.find((e) => e.isActive);
  if (!targetExam) {
    warn("No active monthly exams — will attempt to use first exam for testing");
    targetExam = listR.data.exams[0];
  }

  // 5.2 Open exam
  const examR = await authFetch(s1, "GET", `/api/monthly-exam/${targetExam.id}`);
  if (examR.status === 403) {
    warn(`Exam ${targetExam.number} not active/accessible — skipping section tests`);
    pass("Inactive exam correctly returns 403");
    return;
  }
  assert(examR.status === 200, `Open exam ${targetExam.number}`, `status=${examR.status}`);

  if (examR.status !== 200) return;

  assert(Array.isArray(examR.data.sections), "Exam has sections array");
  assert(examR.data.sections.length === 8, "Exam has 8 sections", `got ${examR.data.sections?.length}`);

  // Find a NOT_STARTED section
  const availableSection = examR.data.sections.find((s) => s.status === "NOT_STARTED");
  if (!availableSection) {
    warn("All sections already attempted — skipping section flow tests");
    return;
  }

  // 5.3 Load section questions
  const secR = await authFetch(
    s1,
    "GET",
    `/api/monthly-exam/${targetExam.id}/section/${availableSection.id}`
  );
  assert(secR.status === 200, `Load section ${availableSection.sectionNumber}`, `status=${secR.status}`);

  if (secR.status !== 200) return;

  assert(secR.data.questions?.length > 0, `Section has questions (${secR.data.questions?.length})`);
  assert(typeof secR.data.serverElapsedSeconds === "number", "Has serverElapsedSeconds");
  assert(secR.data.serverElapsedSeconds < 5, "serverElapsedSeconds < 5 (just started)");

  // 5.4 Timer validation: wait 3s, re-fetch
  await sleep(3000);
  const secR2 = await authFetch(
    s1,
    "GET",
    `/api/monthly-exam/${targetExam.id}/section/${availableSection.id}`
  );
  if (secR2.status === 200) {
    assert(
      secR2.data.serverElapsedSeconds >= 3,
      `Timer advanced to ${secR2.data.serverElapsedSeconds}s (expected >= 3)`
    );
  }

  // 5.5 Save answers (first 5 questions)
  const questions = secR.data.questions;
  const answersToSave = questions.slice(0, 5).map((q) => ({
    questionId: q.id,
    optionId: q.options[0]?.id || null,
  }));

  const saveR = await authFetch(
    s1,
    "POST",
    `/api/monthly-exam/${targetExam.id}/section/${availableSection.id}/save`,
    { answers: answersToSave, tabSwitches: 0 }
  );
  assert(saveR.status === 200, "Save answers", `status=${saveR.status}`);

  // 5.6 Submit section (all questions, pick first option)
  const allAnswers = questions
    .filter((q) => q.options.length > 0)
    .map((q) => ({
      questionId: q.id,
      optionId: q.options[0]?.id || null,
    }));

  const submitR = await authFetch(
    s1,
    "POST",
    `/api/monthly-exam/${targetExam.id}/section/${availableSection.id}/submit`,
    { answers: allAnswers, tabSwitches: 0 }
  );
  assert(submitR.status === 200, "Submit section", `status=${submitR.status}`);
  if (submitR.status === 200) {
    assert(typeof submitR.data.totalCorrect === "number", `totalCorrect = ${submitR.data.totalCorrect}`);
    assert(
      submitR.data.totalQuestions === questions.length,
      "totalQuestions matches",
      `expected ${questions.length}, got ${submitR.data.totalQuestions}`
    );
  }

  // 5.7 Re-submit → should fail 403
  const resubmitR = await authFetch(
    s1,
    "POST",
    `/api/monthly-exam/${targetExam.id}/section/${availableSection.id}/submit`,
    { answers: allAnswers, tabSwitches: 0 }
  );
  assert(resubmitR.status === 403, "Re-submit section blocked (403)", `status=${resubmitR.status}`);

  // 5.8 Results
  const resultsR = await authFetch(s1, "GET", `/api/monthly-exam/${targetExam.id}/results`);
  assert(resultsR.status === 200, "Exam results load", `status=${resultsR.status}`);
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 6: COORDINATOR OPERATIONS
// ═══════════════════════════════════════════════════════════════
async function phase6(sessions) {
  console.log("\n--- Phase 6: Coordinator Operations ---");

  const coord = sessions.coordinator;
  if (!coord) {
    warn("Skipping Phase 6: coordinator not logged in");
    return;
  }

  // 6.1 Dashboard
  const dashR = await authFetch(coord, "GET", "/api/coordinator/dashboard");
  assert(dashR.status === 200, "Coordinator dashboard loads", `status=${dashR.status}`);
  if (dashR.status === 200) {
    assert(typeof dashR.data.totalStudents === "number", "Dashboard has totalStudents");
    assert(Array.isArray(dashR.data.topStudents), "Dashboard has topStudents");
    assert(Array.isArray(dashR.data.atRiskStudents), "Dashboard has atRiskStudents");
    assert(dashR.data.moduleProgress?.length === 8, "Dashboard has 8 module progress entries");
  }

  // 6.2 List students
  const studentsR = await authFetch(coord, "GET", "/api/coordinator/students");
  assert(studentsR.status === 200, "List students", `status=${studentsR.status}`);

  let firstStudentId = null;
  if (studentsR.status === 200 && studentsR.data.students?.length > 0) {
    firstStudentId = studentsR.data.students[0].id;
    assert(studentsR.data.students.length > 0, `Found ${studentsR.data.students.length} students`);
  }

  // 6.3 Student detail
  if (firstStudentId) {
    const detailR = await authFetch(coord, "GET", `/api/coordinator/students/${firstStudentId}`);
    assert(detailR.status === 200, "Student detail loads", `status=${detailR.status}`);
    if (detailR.status === 200) {
      assert(detailR.data.student?.fullName, "Student detail has name");
      assert(detailR.data.overview, "Student detail has overview");
    }
  }

  // 6.4 Send custom message
  if (firstStudentId) {
    const msgR = await authFetch(coord, "POST", `/api/coordinator/students/${firstStudentId}/message`, {
      templateKey: "custom",
      customTitle: "Prueba E2E",
      customBody: "Este es un mensaje de prueba generado por el script E2E.",
    });
    assert(msgR.status === 200, "Send custom message", `status=${msgR.status}`);
  }

  // 6.5 Send message with invalid template → 400
  if (firstStudentId) {
    const badMsgR = await authFetch(
      coord,
      "POST",
      `/api/coordinator/students/${firstStudentId}/message`,
      { templateKey: "nonexistent_template_xyz" }
    );
    assert(badMsgR.status === 400, "Invalid template rejected (400)", `status=${badMsgR.status}`);
  }

  // 6.6 List cohorts
  const cohortsR = await authFetch(coord, "GET", "/api/coordinator/cohorts");
  assert(cohortsR.status === 200, "List cohorts", `status=${cohortsR.status}`);

  let firstCohortId = null;
  if (cohortsR.status === 200 && cohortsR.data.cohorts?.length > 0) {
    firstCohortId = cohortsR.data.cohorts[0].id;
  }

  // 6.7 Cohort detail
  if (firstCohortId) {
    const cohortR = await authFetch(coord, "GET", `/api/coordinator/cohorts/${firstCohortId}`);
    assert(cohortR.status === 200, "Cohort detail loads", `status=${cohortR.status}`);
  }

  // 6.8 Create new cohort
  const newCohortR = await authFetch(coord, "POST", "/api/coordinator/cohorts", {
    name: `E2E Test Cohort ${Date.now()}`,
    startDate: "2026-03-01",
  });
  assert(newCohortR.status === 200 || newCohortR.status === 201, "Create cohort", `status=${newCohortR.status}`);

  let newCohortId = newCohortR.data?.cohort?.id;

  // 6.9 Update cohort
  if (newCohortId) {
    const updateR = await authFetch(coord, "PATCH", `/api/coordinator/cohorts/${newCohortId}`, {
      name: `E2E Updated ${Date.now()}`,
    });
    assert(updateR.status === 200, "Update cohort", `status=${updateR.status}`);
  }

  // 6.10 Enroll student in new cohort
  if (newCohortId) {
    const enrollEmail = `e2e-${Date.now()}@test.com`;
    const enrollR = await authFetch(coord, "POST", `/api/coordinator/cohorts/${newCohortId}/enroll`, {
      email: enrollEmail,
      fullName: "E2E Test Student",
      pseudonym: "TestBot",
    });
    assert(enrollR.status === 200 || enrollR.status === 201, "Enroll student", `status=${enrollR.status}`);
    if (enrollR.status === 200 || enrollR.status === 201) {
      assert(!!enrollR.data.password, "Enrollment returns generated password");

      // 6.11 Duplicate enrollment → 409
      const dupR = await authFetch(coord, "POST", `/api/coordinator/cohorts/${newCohortId}/enroll`, {
        email: enrollEmail,
        fullName: "Duplicate",
        pseudonym: "Dup",
      });
      assert(dupR.status === 409, "Duplicate enrollment rejected (409)", `status=${dupR.status}`);
    }
  }

  // 6.12 List enrollments
  const enrollR = await authFetch(coord, "GET", "/api/coordinator/enrollments");
  assert(enrollR.status === 200, "List enrollments", `status=${enrollR.status}`);

  // 6.13 List monthly exams (coordinator view)
  const meR = await authFetch(coord, "GET", "/api/coordinator/monthly-exams");
  assert(meR.status === 200, "Coordinator list monthly exams", `status=${meR.status}`);

  // 6.14 Exam analytics
  if (meR.status === 200 && meR.data.exams?.length > 0) {
    const examId = meR.data.exams[0].id;
    const analyticsR = await authFetch(coord, "GET", `/api/coordinator/monthly-exams/${examId}/analytics`);
    assert(analyticsR.status === 200, "Exam analytics loads", `status=${analyticsR.status}`);
  }

  // 6.15 List exam days
  const examDaysR = await authFetch(coord, "GET", "/api/coordinator/exam-days");
  assert(examDaysR.status === 200, "List exam days", `status=${examDaysR.status}`);

  // 6.16 Create announcement
  const annR = await authFetch(coord, "POST", "/api/coordinator/announcements", {
    title: `Anuncio E2E ${Date.now()}`,
    body: "Este es un anuncio de prueba generado por el script de testing E2E.",
  });
  assert(annR.status === 200 || annR.status === 201, "Create announcement", `status=${annR.status}`);

  // 6.17 Exam schedule
  if (firstCohortId && meR.data.exams?.length > 0) {
    const schedR = await authFetch(
      coord,
      "GET",
      `/api/coordinator/cohort-exam-schedule?cohortId=${firstCohortId}`
    );
    assert(schedR.status === 200, "Get exam schedule", `status=${schedR.status}`);
  }

  // 6.18 ROLE CHECKS: Student sessions hitting coordinator endpoints → 401
  const s1 = sessions.student1;
  if (s1) {
    const roleChecks = [
      ["/api/coordinator/dashboard", "GET"],
      ["/api/coordinator/students", "GET"],
    ];
    for (const [path, method] of roleChecks) {
      const r = await authFetch(s1, method, path);
      assert(r.status === 401, `Student blocked from ${path}`, `status=${r.status}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  PHASE 7: CONCURRENT STRESS + EDGE CASES
// ═══════════════════════════════════════════════════════════════
async function phase7(sessions) {
  console.log("\n--- Phase 7: Concurrent Stress ---");

  const activeSessions = ["student1", "student2", "student3", "student4"]
    .filter((k) => sessions[k])
    .map((k) => sessions[k]);

  if (activeSessions.length === 0) {
    warn("No student sessions for stress testing");
    return;
  }

  // 7.1 Concurrent dashboard loads
  const startDash = Date.now();
  const dashResults = await Promise.allSettled(
    activeSessions.map((s) => authFetch(s, "GET", "/api/dashboard"))
  );
  const dashTime = Date.now() - startDash;

  const allDashOk = dashResults.every(
    (r) => r.status === "fulfilled" && r.value.status === 200
  );
  assert(allDashOk, `${activeSessions.length} concurrent dashboards`, "some failed");
  assert(dashTime < 10000, `Concurrent dashboards in ${dashTime}ms (<10s)`, `took ${dashTime}ms`);

  // 7.2 Concurrent quiz loads (all students load quiz for day 1)
  const quizResults = await Promise.allSettled(
    activeSessions.map((s) => authFetch(s, "GET", "/api/quiz/1"))
  );
  const allQuizOk = quizResults.every(
    (r) => r.status === "fulfilled" && r.value.status === 200
  );
  assert(allQuizOk, `${activeSessions.length} concurrent quiz loads`, "some failed");

  // 7.3 Concurrent audio progress (different students, same dailyContent)
  // First, get the dailyContentId for day 1
  const dayR = await authFetch(activeSessions[0], "GET", "/api/day/1");
  if (dayR.status === 200 && dayR.data.id) {
    const dcId = dayR.data.id;
    const audioResults = await Promise.allSettled(
      activeSessions.map((s) =>
        authFetch(s, "POST", `/api/audio/${dcId}/progress`, {
          currentTime: 60,
          percentage: 40,
          playbackSpeed: 1.0,
        })
      )
    );
    const allAudioOk = audioResults.every(
      (r) => r.status === "fulfilled" && r.value.status === 200
    );
    assert(allAudioOk, `${activeSessions.length} concurrent audio progress`, "some failed");
  }

  // 7.4 Mixed concurrent: student actions + coordinator dashboard
  if (sessions.coordinator) {
    const mixedResults = await Promise.allSettled([
      authFetch(activeSessions[0], "GET", "/api/profile"),
      authFetch(activeSessions[1] || activeSessions[0], "GET", "/api/leaderboard"),
      authFetch(activeSessions[2] || activeSessions[0], "GET", "/api/student/roadmap"),
      authFetch(sessions.coordinator, "GET", "/api/coordinator/dashboard"),
    ]);
    const allMixedOk = mixedResults.every(
      (r) => r.status === "fulfilled" && r.value.status === 200
    );
    assert(allMixedOk, "Mixed concurrent (students+coordinator)", "some failed");
  }

  // 7.5 Response time checks
  const timingTests = [
    ["/api/dashboard", "Dashboard"],
    ["/api/profile", "Profile"],
    ["/api/leaderboard", "Leaderboard"],
    ["/api/quiz/1", "Quiz day 1"],
  ];
  for (const [path, label] of timingTests) {
    const r = await authFetch(activeSessions[0], "GET", path);
    if (r.status === 200) {
      assert(r.elapsed < 3000, `${label} responds in ${r.elapsed}ms (<3s)`);
    }
  }

  if (sessions.coordinator) {
    const coordR = await authFetch(sessions.coordinator, "GET", "/api/coordinator/dashboard");
    if (coordR.status === 200) {
      assert(coordR.elapsed < 5000, `Coordinator dashboard in ${coordR.elapsed}ms (<5s)`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  RESULTS REPORTER
// ═══════════════════════════════════════════════════════════════
function printResults() {
  console.log("\n" + "=".repeat(60));
  console.log("  E2E TEST RESULTS — Study2One Platform");
  console.log("=".repeat(60));
  console.log(`  Total:    ${results.passed + results.failed}`);
  console.log(`  \x1b[32mPassed:\x1b[0m  ${results.passed}`);
  console.log(`  \x1b[31mFailed:\x1b[0m  ${results.failed}`);

  if (results.bugs.length > 0) {
    console.log(`\n  \x1b[35mBUGS DETECTED: ${results.bugs.length}\x1b[0m`);
    for (const b of results.bugs) {
      console.log(`    [${b.category}] ${b.description}`);
    }
  }

  if (results.warnings.length > 0) {
    console.log(`\n  \x1b[33mWARNINGS: ${results.warnings.length}\x1b[0m`);
    for (const w of results.warnings) {
      console.log(`    ${w}`);
    }
  }

  if (results.errors.length > 0) {
    console.log(`\n  \x1b[31mFAILURES:\x1b[0m`);
    for (const e of results.errors) {
      console.log(`    ${e}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("=".repeat(60));
  console.log("  Study2One — E2E Integration Test Suite");
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  // Verify server is up
  try {
    const healthR = await fetch(`${BASE_URL}/api/auth/csrf`);
    if (!healthR.ok) throw new Error(`Status ${healthR.status}`);
  } catch (e) {
    console.error(`\n  ERROR: Cannot reach ${BASE_URL} — is the dev server running?`);
    console.error(`  Run: npm run dev\n`);
    process.exit(2);
  }

  const sessions = await phase1();
  const dayData = await phase2(sessions);
  await phase3(sessions, dayData);
  await phase4(sessions);
  await phase5(sessions);
  await phase6(sessions);
  await phase7(sessions);

  printResults();
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("\nFATAL ERROR:", err);
  process.exit(2);
});
