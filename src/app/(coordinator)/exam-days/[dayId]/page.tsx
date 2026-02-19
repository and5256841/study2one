"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Option {
  id: string;
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionOrder: number;
  caseText: string | null;
  questionText: string;
  explanation: string;
  competency: string | null;
  difficulty: string;
  options: Option[];
}

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface FormState {
  caseText: string;
  questionText: string;
  explanation: string;
  competency: string;
  difficulty: Difficulty;
  options: { letter: string; text: string; isCorrect: boolean }[];
}

const EMPTY_FORM: FormState = {
  caseText: "",
  questionText: "",
  explanation: "",
  competency: "",
  difficulty: "MEDIUM",
  options: [
    { letter: "A", text: "", isCorrect: false },
    { letter: "B", text: "", isCorrect: false },
    { letter: "C", text: "", isCorrect: false },
    { letter: "D", text: "", isCorrect: false },
  ],
};

export default function ExamDayDetailPage() {
  const params = useParams();
  const dayId = params.dayId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coordinator/exam-days/${dayId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [dayId]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (q: Question) => {
    setForm({
      caseText: q.caseText || "",
      questionText: q.questionText,
      explanation: q.explanation,
      competency: q.competency || "",
      difficulty: q.difficulty as Difficulty,
      options: q.options.map((o) => ({
        letter: o.letter,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
    });
    setEditId(q.id);
    setShowForm(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    setDeletingId(questionId);
    try {
      await fetch(`/api/coordinator/exam-days/${dayId}/questions/${questionId}`, {
        method: "DELETE",
      });
      await fetchQuestions();
    } catch (error) {
      console.error(error);
    }
    setDeletingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editId
      ? `/api/coordinator/exam-days/${dayId}/questions/${editId}`
      : `/api/coordinator/exam-days/${dayId}/questions`;
    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await fetchQuestions();
        resetForm();
      }
    } catch (error) {
      console.error(error);
    }
    setSaving(false);
  };

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) =>
        i === index
          ? { ...o, [field]: value }
          : field === "isCorrect" && value === true
          ? { ...o, isCorrect: false }
          : o
      ),
    }));
  };

  return (
    <div className="px-4 py-6 space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/coordinator/exam-days" className="text-gray-400 hover:text-white">
          ←
        </Link>
        <div>
          <h2 className="text-lg font-bold">Día {dayId}</h2>
          <p className="text-gray-400 text-xs">{title}</p>
        </div>
      </div>

      {/* Question count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {questions.length}/15 preguntas cargadas
        </p>
        {!showForm && questions.length < 15 && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/30 transition-all"
          >
            + Agregar pregunta
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            {editId ? "Editar pregunta" : "Nueva pregunta"}
          </h3>

          <div>
            <label className="text-xs text-gray-400">Contexto / caso clínico (opcional)</label>
            <textarea
              value={form.caseText}
              onChange={(e) => setForm((p) => ({ ...p, caseText: e.target.value }))}
              rows={3}
              placeholder="Caso clínico o contexto..."
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Pregunta *</label>
            <textarea
              value={form.questionText}
              onChange={(e) => setForm((p) => ({ ...p, questionText: e.target.value }))}
              rows={2}
              required
              placeholder="¿Cuál es el diagnóstico más probable?"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">Opciones * (marca la correcta)</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={opt.letter} className="flex gap-2 items-start">
                  <button
                    type="button"
                    onClick={() => updateOption(i, "isCorrect", true)}
                    className={`mt-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      opt.isCorrect
                        ? "bg-green-500/30 text-green-300 border border-green-500/50"
                        : "bg-white/10 text-gray-400 border border-white/10"
                    }`}
                  >
                    {opt.letter}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(i, "text", e.target.value)}
                    required
                    placeholder={`Opción ${opt.letter}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Toca la letra para marcarla como correcta</p>
          </div>

          <div>
            <label className="text-xs text-gray-400">Explicación *</label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              rows={3}
              required
              placeholder="Explicación de la respuesta correcta..."
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Competencia</label>
              <input
                type="text"
                value={form.competency}
                onChange={(e) => setForm((p) => ({ ...p, competency: e.target.value }))}
                placeholder="Ej: Diagnóstico"
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Dificultad</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as Difficulty }))}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Medio</option>
                <option value="HARD">Difícil</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear pregunta"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Questions list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Cargando preguntas...</p>
      ) : questions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm">No hay preguntas aún.</p>
          <p className="text-gray-500 text-xs mt-1">
            Agrega preguntas manualmente o usa el script de seed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-semibold mb-1">
                    Pregunta {q.questionOrder}
                    {q.difficulty && (
                      <span className={`ml-2 ${q.difficulty === "HARD" ? "text-red-400" : q.difficulty === "EASY" ? "text-green-400" : "text-yellow-400"}`}>
                        · {q.difficulty === "EASY" ? "Fácil" : q.difficulty === "HARD" ? "Difícil" : "Medio"}
                      </span>
                    )}
                  </p>
                  {q.caseText && (
                    <p className="text-xs text-blue-400 mb-2 leading-relaxed line-clamp-2">{q.caseText}</p>
                  )}
                  <p className="text-sm text-white leading-relaxed">{q.questionText}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(q)}
                    className="text-xs px-2 py-1 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    {deletingId === q.id ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`text-xs px-2 py-1.5 rounded-lg flex gap-1.5 ${
                      opt.isCorrect
                        ? "bg-green-500/10 text-green-300 border border-green-500/20"
                        : "bg-white/5 text-gray-400"
                    }`}
                  >
                    <span className="font-bold">{opt.letter}.</span>
                    <span className="line-clamp-1">{opt.text}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                <span className="text-gray-400 font-semibold">Explicación: </span>
                {q.explanation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add button (bottom) */}
      {!showForm && questions.length < 15 && questions.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            + Agregar pregunta ({questions.length}/15)
          </button>
        </div>
      )}
    </div>
  );
}
