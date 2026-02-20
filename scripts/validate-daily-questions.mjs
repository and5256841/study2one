import { readFileSync } from "fs";
import { join } from "path";

const FILES = [
  { file: "module-01-lectura-critica.json", days: 15 },
  { file: "module-02-razonamiento-cuantitativo.json", days: 15 },
  { file: "module-03-competencias-ciudadanas.json", days: 15 },
  { file: "module-04-comunicacion-escrita.json", days: 10 },
  { file: "module-05-ingles.json", days: 10 },
  { file: "module-06-fundamentacion-dx-tx.json", days: 25 },
  { file: "module-07-atencion-en-salud.json", days: 15 },
  { file: "module-08-promocion-prevencion.json", days: 15 },
];

const base = "scripts/data/daily-questions";
let totalQ = 0;
let totalFieldIssues = 0;

for (const f of FILES) {
  const filePath = join(base, f.file);
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    let qCount = 0;
    let fieldNameIssues = new Set();
    let structErrors = [];

    if (data.length !== f.days) {
      structErrors.push(`Expected ${f.days} days, got ${data.length}`);
    }

    for (const day of data) {
      const questions = day.questions;
      if (!questions || questions.length !== 3) {
        structErrors.push(`Day ${day.dayNumber}: ${questions ? questions.length : 0} questions`);
        continue;
      }

      for (const q of questions) {
        // Check for wrong field names
        if (q.question !== undefined && q.questionText === undefined) {
          fieldNameIssues.add("question→questionText");
        }
        if (q.order !== undefined && q.questionOrder === undefined) {
          fieldNameIssues.add("order→questionOrder");
        }
        if (q.options) {
          for (const o of q.options) {
            if (o.correct !== undefined && o.isCorrect === undefined) {
              fieldNameIssues.add("correct→isCorrect");
            }
          }
        }

        // Validate structure
        const qText = q.questionText || q.question;
        if (!qText) structErrors.push(`Missing questionText`);
        if (!q.options || q.options.length !== 4) {
          structErrors.push(`Wrong options count`);
          continue;
        }
        const correctCount = q.options.filter(
          (o) => o.isCorrect === true || o.correct === true
        ).length;
        if (correctCount !== 1) structErrors.push(`${correctCount} correct answers`);

        qCount++;
      }
    }

    totalQ += qCount;

    if (fieldNameIssues.size > 0 || structErrors.length > 0) {
      console.log(`ISSUES ${f.file}: ${qCount}q`);
      if (fieldNameIssues.size > 0) {
        console.log(`  FIELD RENAMES NEEDED: ${[...fieldNameIssues].join(", ")}`);
        totalFieldIssues += fieldNameIssues.size;
      }
      if (structErrors.length > 0) {
        console.log(`  STRUCT: ${structErrors.slice(0, 3).join("; ")}`);
      }
    } else {
      console.log(`OK ${f.file}: ${qCount} questions`);
    }
  } catch (e) {
    console.log(`ERROR ${f.file}: ${e.message.substring(0, 100)}`);
  }
}

console.log(`\n=== TOTAL: ${totalQ} questions, ${totalFieldIssues} files need field renames ===`);
