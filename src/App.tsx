import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

// ------------------------------------------------------------
// Factor‑Personality Quiz App (16 Personality Types × MSCI Factors)
// V6: JP translations for RESULT descriptions (axes + factors)
// • Quiz language toggle (EN/JA) still affects prompts & Likert only
// • Result page now shows Japanese descriptions when JA is selected
// • Chart labels/titles and CSV remain in English
// ------------------------------------------------------------

type AxisKey = "EI" | "SN" | "TF" | "JP" | "Quality" | "Momentum" | "Value" | "Growth" | "LowVol" | "Size" | "Yield" | "Liquidity";

interface Question {
  id: string;
  text: string; // English prompt (used for CSV)
  axis: AxisKey;
  weight: 1 | -1;
}

type Lang = 'en' | 'ja';

const LIKERT = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const LIKERT_JA = [
  { value: 1, label: "全くそう思わない" },
  { value: 2, label: "あまりそう思わない" },
  { value: 3, label: "どちらとも言えない" },
  { value: 4, label: "そう思う" },
  { value: 5, label: "とてもそう思う" },
];

const AXIS_META: Record<AxisKey, { label: string; sides?: [string, string]; desc?: string }> = {
  EI: { label: "Extraversion vs Introversion", sides: ["E", "I"], desc: "Energy from interaction vs reflection" },
  SN: { label: "Sensing vs iNtuition", sides: ["S", "N"], desc: "Facts/details vs patterns/possibilities" },
  TF: { label: "Thinking vs Feeling", sides: ["T", "F"], desc: "Logic/criteria vs values/empathy" },
  JP: { label: "Judging vs Perceiving", sides: ["J", "P"], desc: "Structure/closure vs flexibility/openness" },
  Quality: { label: "Quality", desc: "Careful, precise, consistent" },
  Momentum: { label: "Momentum", desc: "Adaptive, rides trends" },
  Value: { label: "Value", desc: "Pragmatic, grounded" },
  Growth: { label: "Growth", desc: "Visionary, forward-looking" },
  LowVol: { label: "Low Volatility", desc: "Calm, steady, risk-aware" },
  Size: { label: "Size (Small)", desc: "Entrepreneurial, nimble" },
  Yield: { label: "Yield", desc: "Dependable, supportive" },
  Liquidity: { label: "Liquidity", desc: "Social, connector" },
};

// Colors per factor
const FACTOR_COLORS: Record<Exclude<AxisKey, "EI" | "SN" | "TF" | "JP">, string> = {
  Quality: "#e11d48",
  Momentum: "#2563eb",
  Value: "#ca8a04",
  Growth: "#7c3aed",
  LowVol: "#0ea5e9",
  Size: "#059669",
  Yield: "#f97316",
  Liquidity: "#10b981",
};

// --- 16 Personality Types questions (32) ---
const PERSONALITY_QUESTIONS: Question[] = [
  // EI
  { id: "EI1", text: "I feel energized after meeting new people.", axis: "EI", weight: 1 },
  { id: "EI2", text: "I prefer deep, solitary work to group sessions.", axis: "EI", weight: -1 },
  { id: "EI3", text: "I talk through ideas to clarify my thinking.", axis: "EI", weight: 1 },
  { id: "EI4", text: "I need quiet time alone most days to recharge.", axis: "EI", weight: -1 },
  { id: "EI5", text: "I enjoy being the one to start conversations.", axis: "EI", weight: 1 },
  { id: "EI6", text: "Large social events drain me quickly.", axis: "EI", weight: -1 },
  { id: "EI7", text: "I make friends easily in new settings.", axis: "EI", weight: 1 },
  { id: "EI8", text: "I’d rather text than hop on a spontaneous call.", axis: "EI", weight: -1 },
  // SN
  { id: "SN1", text: "I trust concrete facts over hunches.", axis: "SN", weight: 1 },
  { id: "SN2", text: "I often think about big-picture possibilities.", axis: "SN", weight: -1 },
  { id: "SN3", text: "I like step-by-step instructions.", axis: "SN", weight: 1 },
  { id: "SN4", text: "I enjoy exploring patterns more than details.", axis: "SN", weight: -1 },
  { id: "SN5", text: "I prefer proven methods to experimental ones.", axis: "SN", weight: 1 },
  { id: "SN6", text: "I focus on what could be rather than what is.", axis: "SN", weight: -1 },
  { id: "SN7", text: "I notice practical details others miss.", axis: "SN", weight: 1 },
  { id: "SN8", text: "I get excited by abstract theories.", axis: "SN", weight: -1 },
  // TF
  { id: "TF1", text: "I make decisions by analyzing pros and cons.", axis: "TF", weight: 1 },
  { id: "TF2", text: "I prioritize harmony even if logic says otherwise.", axis: "TF", weight: -1 },
  { id: "TF3", text: "I value fairness over personal circumstances.", axis: "TF", weight: 1 },
  { id: "TF4", text: "I weigh people’s feelings heavily in choices.", axis: "TF", weight: -1 },
  { id: "TF5", text: "I’m comfortable giving blunt, objective feedback.", axis: "TF", weight: 1 },
  { id: "TF6", text: "I avoid conflict even when I disagree.", axis: "TF", weight: -1 },
  { id: "TF7", text: "I prefer criteria to vibes when judging options.", axis: "TF", weight: 1 },
  { id: "TF8", text: "I decide with my heart more than my head.", axis: "TF", weight: -1 },
  // JP
  { id: "JP1", text: "I like schedules and to-do lists.", axis: "JP", weight: 1 },
  { id: "JP2", text: "I keep plans flexible and open-ended.", axis: "JP", weight: -1 },
  { id: "JP3", text: "I feel better once decisions are finalized.", axis: "JP", weight: 1 },
  { id: "JP4", text: "I’m comfortable delaying decisions to gather more info.", axis: "JP", weight: -1 },
  { id: "JP5", text: "I prefer clear structure over spontaneity.", axis: "JP", weight: 1 },
  { id: "JP6", text: "I work best when I can adapt plans on the fly.", axis: "JP", weight: -1 },
  { id: "JP7", text: "I plan my work and work my plan.", axis: "JP", weight: 1 },
  { id: "JP8", text: "I like to keep options open as long as possible.", axis: "JP", weight: -1 },
];

// --- Factor overlay (8 base + 5 extra = 13) ---
const FACTOR_QUESTIONS: Question[] = [
  { id: "FQ1", text: "I double-check my work for accuracy and consistency.", axis: "Quality", weight: 1 },
  { id: "FQ2", text: "I act quickly on opportunities that seem to be gaining traction.", axis: "Momentum", weight: 1 },
  { id: "FQ3", text: "I look for undervalued ideas that others ignore.", axis: "Value", weight: 1 },
  { id: "FQ4", text: "I focus on long-term vision over short-term outcomes.", axis: "Growth", weight: 1 },
  { id: "FQ5", text: "I prefer steady progress and avoid unnecessary risk.", axis: "LowVol", weight: 1 },
  { id: "FQ6", text: "I like taking bold initiatives independently.", axis: "Size", weight: 1 },
  { id: "FQ7", text: "I enjoy providing stable, predictable support.", axis: "Yield", weight: 1 },
  { id: "FQ8", text: "I thrive when connecting and collaborating with others.", axis: "Liquidity", weight: 1 },
  // Extra to keep total at 40 after trimming 5 Type questions
  { id: "FQ9", text: "I enjoy working in fast-paced, evolving environments.", axis: "Momentum", weight: 1 },
  { id: "FQ10", text: "I am cautious with risks and think about downside protection.", axis: "LowVol", weight: 1 },
  { id: "FQ11", text: "I think about compounding effects over time.", axis: "Growth", weight: 1 },
  { id: "FQ12", text: "I take pride in being dependable and consistent.", axis: "Yield", weight: 1 },
  { id: "FQ13", text: "I move fluidly across different teams and ideas.", axis: "Liquidity", weight: 1 },
];

// Japanese translations for question prompts (quiz UI only)
const QUESTION_JA: Record<string, string> = {
  // EI
  EI1: "新しい人と会うと元気が出る。",
  EI2: "グループよりも一人で深く作業する方が好きだ。",
  EI3: "考えを整理するために声に出して話す。",
  EI4: "充電するには静かな一人の時間が必要だ。",
  EI5: "会話を始める役になるのが好きだ。",
  EI6: "大きな社交の場はすぐに疲れてしまう。",
  EI7: "新しい環境でもすぐに友達ができる。",
  EI8: "思いつきの電話よりテキストの方がいい。",
  // SN
  SN1: "直感よりも具体的な事実を信頼する。",
  SN2: "大局的な可能性についてよく考える。",
  SN3: "段階的な手順書が好きだ。",
  SN4: "細部よりパターンを探る方が楽しい。",
  SN5: "実験的な方法より実証済みの方法を好む。",
  SN6: "現状よりも『どうなり得るか』に目が行く。",
  SN7: "他の人が見落とす実務的な細部に気づく。",
  SN8: "抽象的な理論にワクワクする。",
  // TF
  TF1: "賛否を分析して意思決定する。",
  TF2: "論理よりも調和を優先することがある。",
  TF3: "個別事情よりも公正さを重視する。",
  TF4: "選択の際に人の感情を大切にする。",
  TF5: "率直で客観的なフィードバックができる。",
  TF6: "反対でも対立は避けがちだ。",
  TF7: "判断する時は雰囲気より基準を好む。",
  TF8: "頭より心で決めることが多い。",
  // JP
  JP1: "スケジュールやToDoリストが好きだ。",
  JP2: "計画は柔軟に開いたままにしておく。",
  JP3: "決定が固まると安心する。",
  JP4: "情報を集めるために決定を遅らせても平気だ。",
  JP5: "明確な構造を自発性より好む。",
  JP6: "計画をその場で調整しながら進めるのが得意だ。",
  JP7: "計画を立てて、その計画通りに進める。",
  JP8: "できるだけ長く選択肢を残しておきたい。",
  // Factors
  FQ1: "正確さと一貫性のために二重チェックする。",
  FQ2: "勢いがついている機会には素早く動く。",
  FQ3: "他人が見過ごす割安なアイデアを探す。",
  FQ4: "短期より長期のビジョンを重視する。",
  FQ5: "不要なリスクを避け、着実に進める。",
  FQ6: "指示が少なくても大胆に主体的に動く。",
  FQ7: "安定的で予測可能な支援を提供するのが好きだ。",
  FQ8: "人とつながり協働する時に最も力を発揮する。",
  FQ9: "変化の速い環境で働くのが楽しい。",
  FQ10: "リスクには慎重で、下振れを考える。",
  FQ11: "時間とともに効いてくる複利効果を意識する。",
  FQ12: "頼りがいと一貫性に誇りを持っている。",
  FQ13: "異なるチームやアイデアの間をしなやかに行き来できる。",
};

function responseToScore(answer: number, weight: 1 | -1) {
  const base = answer - 3;
  const step = base === 0 ? 0 : base > 0 ? (base === 1 ? 1 : 2) : (base === -1 ? -1 : -2);
  return step * weight;
}
function interpretStrength(margin: number) {
  const m = Math.abs(margin);
  if (m >= 10) return "very strong";
  if (m >= 6) return "strong";
  if (m >= 3) return "moderate";
  return "slight";
}
function toPersonalityType(margins: Record<AxisKey, number>) {
  const pick = (axis: AxisKey) => (margins[axis] >= 0 ? AXIS_META[axis].sides![0] : AXIS_META[axis].sides![1]);
  return pick("EI") + pick("SN") + pick("TF") + pick("JP");
}
function normalizeFactors(scores: Record<string, number>) {
  const total = Object.values(scores).reduce((a, b) => a + Math.abs(b), 0);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) out[k] = total ? Math.round((Math.abs(v) / total) * 1000) / 10 : 0; // %
  return out;
}
function downloadCSV(rows: string[][], filename = "factor_personality_results.csv") {
  const content = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ==== 16 Types → Factor influence map (heuristic) ====
const TYPE_INFLUENCE: Record<string, Record<string, number>> = {
  E: { Liquidity: 1.0, Momentum: 0.6, Size: 0.4 },
  I: { Quality: 0.8, LowVol: 0.8, Value: 0.4 },
  S: { Value: 0.8, LowVol: 0.5, Quality: 0.4, Momentum: 0.2 },
  N: { Growth: 0.9, Momentum: 0.6, Liquidity: 0.2 },
  T: { Value: 0.7, Quality: 0.5, LowVol: 0.2 },
  F: { Yield: 0.8, Liquidity: 0.4, Growth: 0.2 },
  J: { Quality: 0.7, LowVol: 0.5, Yield: 0.4 },
  P: { Momentum: 0.7, Size: 0.6, Liquidity: 0.4, Growth: 0.2 },
};
function sideStrength(margin: number) { return Math.max(0, Math.min(16, Math.abs(margin))) / 16; }
function blendScores(baseScores: Record<string, number>, margins: Record<AxisKey, number>, alpha = 1.2) {
  const out: Record<string, number> = { ...baseScores };
  const side = {
    EI: margins.EI >= 0 ? 'E' : 'I',
    SN: margins.SN >= 0 ? 'S' : 'N',
    TF: margins.TF >= 0 ? 'T' : 'F',
    JP: margins.JP >= 0 ? 'J' : 'P',
  } as const;
  (Object.keys(side) as Array<keyof typeof side>).forEach(ax => {
    const letter = side[ax] as keyof typeof TYPE_INFLUENCE;
    const strength = sideStrength(margins[ax]);
    const inf = TYPE_INFLUENCE[letter] || {};
    for (const [factor, w] of Object.entries(inf)) out[factor] = (out[factor] || 0) + w * strength * alpha;
  });
  for (const k of Object.keys(out)) out[k] = Math.max(0, Math.min(10, Math.round(out[k] * 10) / 10));
  return out;
}

// Utility to shuffle array
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }

export default function App() {
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [blendPersonalityType, setBlendPersonalityType] = useState(true);
  const [lang, setLang] = useState<Lang>('en'); // NEW: quiz language
  const [isShortMode, setIsShortMode] = useState(false); // NEW: Short mode toggle

  // Build question set based on mode
  const QUESTIONS = useMemo(() => {
    // Full: 27 Type + 13 Factor = 40
    // Short: 18 Type + 2 Factor = 20
    const removeIds = new Set(["EI5", "SN5", "TF5", "JP5", "EI8"]);
    const filteredType = PERSONALITY_QUESTIONS.filter(q => !removeIds.has(q.id)); // 27 Type items left

    // Always shuffle full pools first
    const shuffledType = shuffle(filteredType);
    const shuffledFactor = shuffle(FACTOR_QUESTIONS);

    let finalSet: Question[] = [];
    if (isShortMode) {
      finalSet = [...shuffledType.slice(0, 18), ...shuffledFactor.slice(0, 2)];
    } else {
      finalSet = [...shuffledType, ...shuffledFactor];
      finalSet = finalSet.slice(0, 40); // safety cap, though exact count is 40
    }

    return shuffle(finalSet);
  }, [isShortMode]);

  const total = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const percent = Math.round((answeredCount / total) * 100);

  const margins = useMemo(() => {
    const m: Record<AxisKey, number> = { EI: 0, SN: 0, TF: 0, JP: 0, Quality: 0, Momentum: 0, Value: 0, Growth: 0, LowVol: 0, Size: 0, Yield: 0, Liquidity: 0 };
    for (const q of QUESTIONS) {
      const a = answers[q.id]; if (!a) continue; m[q.axis] += responseToScore(a, q.weight);
    }
    return m;
  }, [answers, QUESTIONS]);

  const personalityType = useMemo(() => toPersonalityType(margins), [margins]);

  const factorMixPct = useMemo(() => normalizeFactors({
    Quality: margins.Quality,
    Momentum: margins.Momentum,
    Value: margins.Value,
    Growth: margins.Growth,
    LowVol: margins.LowVol,
    Size: margins.Size,
    Yield: margins.Yield,
    Liquidity: margins.Liquidity,
  }), [margins]);

  const factorScores = useMemo(() => {
    const out: Record<string, number> = {};
    Object.entries(factorMixPct).forEach(([k, pct]) => { out[k] = Math.round((pct * 10 / 100) * 10) / 10; });
    return out;
  }, [factorMixPct]);

  const blendedScores = useMemo(() => blendScores(factorScores, margins, 1.2), [factorScores, margins]);

  function resetAll() { setAnswers({}); setStep("intro"); }
  function exportCSV() {
    const rows: string[][] = [];
    rows.push(["#", "Axis", "Question", "Answer(Label)"]);
    QUESTIONS.forEach((q, i) => rows.push([String(i + 1), q.axis, q.text, labelFromAnswer(answers[q.id])]));
    rows.push([]);
    rows.push(["Personality Type", personalityType]);
    rows.push([]);
    rows.push(["Factor", "Percent(%)", "Base Style Score (0-10)", "16 Types‑Blended Score (0-10)"]);
    Object.keys(factorScores).forEach(k => rows.push([k, String(factorMixPct[k]), String(factorScores[k]), String(blendedScores[k])]));
    downloadCSV(rows);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Factor‑Personality Profiler</h1>
          <div className="text-xs text-slate-500">
            {lang === 'ja' ? "性格タイプと投資ファクターの相関" : "16 Personality Types × MSCI Factor analogies"}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {step === "intro" && (
          <Intro
            onStart={() => setStep("quiz")}
            lang={lang}
            setLang={setLang}
            isShortMode={isShortMode}
            setIsShortMode={setIsShortMode}
          />
        )}
        {step === "quiz" && (
          <Quiz
            questions={QUESTIONS}
            answers={answers}
            setAnswers={setAnswers}
            onDone={() => setStep("result")}
            lang={lang}
          />
        )}
        {step === "result" && (
          <Result
            personalityType={personalityType}
            margins={margins}
            factorMixPct={factorMixPct}
            factorScores={factorScores}
            blendedScores={blendedScores}
            blendPersonalityType={blendPersonalityType}
            setBlendPersonalityType={setBlendPersonalityType}
            onRetake={resetAll}
            onCSV={exportCSV}
            lang={lang}
          />
        )}

        {step !== "intro" && (
          <div className="mt-8">
            <div className="h-2 rounded bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>
            <div className="text-xs text-slate-500 mt-1">Progress: {answeredCount}/{total} ({percent}%)</div>
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-8 text-xs text-slate-500">
        <p className="mt-6">Disclaimer: For fun/learning. Inspired by 16 Personality Types dimensions and factor concepts (e.g., Quality, Momentum); not a clinical or investment tool.</p>
      </footer>
    </div>
  );
}

function labelFromAnswer(a?: number) {
  if (!a) return "";
  const opt = LIKERT.find(o => o.value === a); return opt ? opt.label : String(a);
}

function Intro({ onStart, lang, setLang, isShortMode, setIsShortMode }: {
  onStart: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  isShortMode: boolean;
  setIsShortMode: (v: boolean) => void;
}) {
  return (
    <section className="grid gap-6 sm:grid-cols-2 items-center">
      <div className="order-2 sm:order-1">
        <h2 className="text-2xl sm:text-3xl font-semibold">
          {lang === 'ja' ? "性格タイプ × 投資ファクター" : "Discover your personality‑factor mix"}
        </h2>
        <p className="mt-3 text-slate-600">
          {lang === 'ja'
            ? "4つの性格指標 (E–I/S–N/T–F/J–P) に、8つの投資スタイル要因 (クオリティ・モメンタム・バリュー等) を重ね合わせて分析します。"
            : "Four personality type axes (E–I, S–N, T–F, J–P) plus an overlay of eight factor analogies (Quality, Momentum, Value, Growth, Low Volatility, Size, Yield, Liquidity)."
          }
        </p>
        <ul className="mt-3 text-slate-600 list-disc list-inside space-y-1">
          <li>{lang === 'ja' ? (isShortMode ? "全20問・5段階評価" : "全40問・5段階評価") : (isShortMode ? "20 statements, 5‑point scale" : "40 statements, 5‑point scale")}</li>
          <li>{lang === 'ja' ? "回答で自動的に次へ進みます" : "Auto‑advance after each choice"}</li>
          <li>{lang === 'ja' ? "診断結果をチャートで即座に表示" : "Instant results with charts + optional Type blend"}</li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Language:</span>
            <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden">
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 text-sm ${lang === 'en' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>English</button>
              <button onClick={() => setLang('ja')} className={`px-3 py-1.5 text-sm ${lang === 'ja' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>日本語</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Mode:</span>
            <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden">
              <button onClick={() => setIsShortMode(true)} className={`px-3 py-1.5 text-sm ${isShortMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Short (20)</button>
              <button onClick={() => setIsShortMode(false)} className={`px-3 py-1.5 text-sm ${!isShortMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>Full (40)</button>
            </div>
          </div>
        </div>

        <button onClick={onStart} className="mt-8 px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all font-medium text-lg">
          {lang === 'ja' ? "診断を開始" : "Start Quiz"}
        </button>
      </div>
      <div className="order-1 sm:order-2">
        <div className="aspect-square rounded-3xl bg-gradient-to-br from-emerald-100 via-sky-100 to-violet-100 p-6 grid place-items-center">
          <div className="text-center">
            <div className="text-5xl font-black tracking-tight">{lang === 'ja' ? "16 Type × Factors" : "16 Types × Factors"}</div>
            <div className="mt-3 text-slate-600">{lang === 'ja' ? "性格診断とポートフォリオ理論の遊び心ある融合" : "A playful mash‑up of personality and portfolio ideas."}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Quiz({ questions, answers, setAnswers, onDone, lang }: {
  questions: Question[];
  answers: Record<string, number>;
  setAnswers: (updater: any) => void;
  onDone: () => void;
  lang: Lang;
}) {
  const [index, setIndex] = useState(0);
  const q = questions[index];

  const displayedText = lang === 'ja' ? (QUESTION_JA[q.id] || q.text) : q.text;
  const likert = lang === 'ja' ? LIKERT_JA : LIKERT;

  function handleAnswer(v: number) {
    setAnswers((prev: Record<string, number>) => ({ ...prev, [q.id]: v }));
    if (index < questions.length - 1) {
      setTimeout(() => setIndex(i => i + 1), 150); // auto‑advance
    } else {
      setTimeout(onDone, 150);
    }
  }
  function prev() { if (index > 0) setIndex(index - 1); }

  return (
    <section className="bg-white rounded-3xl shadow p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-slate-500">{index + 1} / {questions.length}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{AXIS_META[q.axis].label}</span>
      </div>
      <h3 className="mt-4 text-xl sm:text-2xl font-semibold leading-snug">{displayedText}</h3>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2">
        {likert.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleAnswer(opt.value)}
            className={`px-3 py-3 rounded-xl border text-sm sm:text-base ${answers[q.id] === opt.value
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white border-slate-300 hover:border-emerald-400"
              }`}
            title={opt.label}
          >{opt.label}</button>
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {lang === 'ja' ? '尺度： 全くそう思わない · あまりそう思わない · どちらとも言えない · そう思う · とてもそう思う' : 'Scale: Strongly Disagree · Disagree · Neutral · Agree · Strongly Agree'}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={prev} disabled={index === 0} className={`px-4 py-2 rounded-xl border ${index === 0 ? "opacity-40" : "hover:border-slate-400"}`}>Back</button>
      </div>
    </section>
  );
}

function Result({ personalityType, margins, factorMixPct, factorScores, blendedScores, blendPersonalityType, setBlendPersonalityType, onRetake, onCSV, lang }: {
  personalityType: string;
  margins: Record<AxisKey, number>;
  factorMixPct: Record<string, number>;
  factorScores: Record<string, number>;
  blendedScores: Record<string, number>;
  blendPersonalityType: boolean;
  setBlendPersonalityType: (v: boolean) => void;
  onRetake: () => void;
  onCSV: () => void;
  lang: Lang;
}) {
  const scores = blendPersonalityType ? blendedScores : factorScores;
  const factorData = Object.entries(scores).map(([k, score]) => ({ key: k, name: AXIS_META[k as AxisKey].label, score, pct: factorMixPct[k] }));

  // JA descriptions (result page only)
  const AXIS_DESC_JA: Record<'EI' | 'SN' | 'TF' | 'JP', string> = {
    EI: '人との関わり(E) vs 内省・熟考(I)',
    SN: '事実・細部(S) vs パターン・可能性(N)',
    TF: '論理・基準(T) vs 価値観・調和(F)',
    JP: '計画・構造(J) vs 柔軟・臨機応変(P)',
  };
  const FACTOR_DESC_JA: Record<string, string> = {
    Quality: '丁寧・正確・一貫性',
    Momentum: '流れに乗り素早く適応',
    Value: '実直で地に足がついた姿勢',
    Growth: '未来志向・ビジョン重視',
    LowVol: '落ち着き・安定・リスク配慮',
    Size: '起業家的・小回りが利く',
    Yield: '頼れる・安定的に支える',
    Liquidity: 'つながりを作り橋渡しする',
  };
  const factorDesc = (k: string) => (lang === 'ja' ? (FACTOR_DESC_JA[k] || AXIS_META[k as AxisKey].desc) : AXIS_META[k as AxisKey].desc);
  const axisDesc = (ax: 'EI' | 'SN' | 'TF' | 'JP') => (lang === 'ja' ? AXIS_DESC_JA[ax] : AXIS_META[ax].desc || '');
  const radarData = factorData.map(d => ({ factor: d.name, score: d.score }));

  // Auto‑scale the radar domain (cap at 10; floor at 2 to avoid a tiny chart)
  const maxScore = Math.max(0, ...radarData.map(d => d.score));
  const upperLimit = Math.min(10, Math.max(2, Math.ceil((maxScore + 0.5) * 2) / 2));

  const axisBars = (["EI", "SN", "TF", "JP"] as const).map(ax => ({ axis: ax, margin: margins[ax], label: `${AXIS_META[ax].sides![0]}/${AXIS_META[ax].sides![1]}` }));

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="bg-white rounded-3xl shadow p-6">
        <h3 className="text-2xl font-semibold">
          {lang === 'ja' ? "あなたの性格タイプ: " : "Your Personality Type: "}
          <span className="font-black tracking-tight">{personalityType}</span>
        </h3>
        <p className="mt-2 text-slate-600 text-sm">
          {lang === 'ja' ? "各軸の数値は、左右どちらの傾向が強いかを表します。" : "Per‑axis margins indicate how strongly you lean toward each side."}
        </p>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={axisBars} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="axis" />
              <YAxis domain={[-16, 16]} />
              <Tooltip formatter={(v: number) => [v, "Margin"]} />
              <Legend />
              <Bar dataKey="margin" fill="#0ea5e9" name="Axis margin (E/S/T/J positive)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 text-sm text-slate-700 space-y-2">
          {(["EI", "SN", "TF", "JP"] as const).map(ax => (
            <li key={ax}>
              <div><span className="font-medium">{ax}</span> — {AXIS_META[ax].label}: {margins[ax] >= 0 ? AXIS_META[ax].sides![0] : AXIS_META[ax].sides![1]} · {interpretStrength(margins[ax])} preference (margin {margins[ax]})</div>
              {lang === 'ja' && <div className="text-slate-500">{axisDesc(ax)}</div>}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button onClick={onRetake} className="px-4 py-2 rounded-xl border hover:border-slate-400">Retake</button>
          <button onClick={onCSV} className="px-4 py-2 rounded-xl border hover:border-slate-400">Download CSV</button>
          <label className="ml-auto text-sm inline-flex items-center gap-2 select-none">
            <input type="checkbox" checked={blendPersonalityType} onChange={(e) => setBlendPersonalityType(e.target.checked)} />
            Blend 16 Types into Styles
          </label>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow p-6">
        <h3 className="text-2xl font-semibold">
          {blendPersonalityType
            ? (lang === 'ja' ? "16タイプ・ブレンド スタイルスコア (自動調整)" : "16 Types‑Blended Style Exposure Scores (auto‑scaled)")
            : (lang === 'ja' ? "スタイル別スコア (自動調整)" : "Style Exposure Scores (auto‑scaled)")
          }
        </h3>
        <p className="mt-2 text-slate-600 text-sm">
          {lang === 'ja' ? "スコアは0〜10。" : "Scores are 0–10. "}
          {blendPersonalityType
            ? (lang === 'ja' ? "回答に加え、性格タイプ（軸の強さ）による補正を加味しています。" : "Includes a heuristic 16 Types overlay based on axis strengths.")
            : (lang === 'ja' ? "回答のみに基づいたスコアです（タイプ補正なし）。" : "These are from responses only (no Type overlay).")
          }
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={85}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, upperLimit]} tickCount={6} />
                <Radar name="Style Exposure Score" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.35} />
                <Tooltip formatter={(v: number) => `${v} / ${upperLimit}`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="pct" data={Object.entries(factorMixPct).map(([k, pct]) => ({ key: k, name: AXIS_META[k as AxisKey].label, pct }))} innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {Object.keys(factorMixPct).map((key, index) => (<Cell key={`cell-${index}`} fill={FACTOR_COLORS[key as keyof typeof FACTOR_COLORS] || "#64748b"} />))}
                </Pie>
                <Tooltip formatter={(v: number, n: any, e: any) => [`${v}%`, e.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {factorData.sort((a, b) => b.score - a.score).map(d => (
            <div key={d.key} className="p-3 rounded-xl border flex items-start gap-2">
              <div className="w-2 h-2 mt-1.5 rounded-full" style={{ background: FACTOR_COLORS[d.key as keyof typeof FACTOR_COLORS] }} />
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-slate-600">{d.score} / 10 · {factorDesc(d.key)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-3xl shadow p-6">
        <h3 className="text-xl font-semibold mb-4 text-slate-700">{lang === 'ja' ? "性格特性とファクターのつながり" : "Style factors and personality traits"}</h3>
        <RelationsChart personalityType={personalityType} lang={lang} />
      </div>
    </section>
  );
}

function RelationsChart({ personalityType, lang }: { personalityType: string; lang: Lang }) {
  // Letters
  const letters = personalityType.split("");
  // Factors
  const factors = ["Quality", "Momentum", "Value", "Growth", "LowVol", "Size", "Yield", "Liquidity"];

  // Layout config
  const w = 600;
  const h = 300;
  const colLeft = 50;
  const colRight = 300;

  const letterY = (i: number) => 50 + i * 60;
  const factorY = (i: number) => 30 + i * 35;

  // Build connections
  const connections: Array<{ from: string; to: string; weight: number; startY: number; endY: number; color: string }> = [];

  letters.forEach((char, letterIdx) => {
    const influence = TYPE_INFLUENCE[char] || {};
    Object.entries(influence).forEach(([factorKey, weight]) => {
      const factorIdx = factors.indexOf((factorKey === "Size (Small)" ? "Size" : (factorKey === "Low Volatility" ? "LowVol" : factorKey)));
      // Mapping fix: "Size" in influence vs "Size (Small)" in display? 
      // In TYPE_INFLUENCE, keys are: Liquidity, Momentum, Size, Quality, LowVol, Value, Growth, Yield.
      // My factors list matches these keys.
      const fIdx = factors.indexOf(factorKey);

      if (fIdx !== -1) {
        connections.push({
          from: char,
          to: factorKey,
          weight,
          startY: letterY(letterIdx),
          endY: factorY(fIdx),
          color: FACTOR_COLORS[factorKey as keyof typeof FACTOR_COLORS] || "#ccc"
        });
      }
    });
  });

  const TEXT = {
    EI: {
      label: lang === 'ja' ? "外向型 (Extraversion) vs 内向型 (Introversion)" : "Extraversion vs. Introversion",
      desc: lang === 'ja' ? "【行動 vs 内省】外向型（E）は「流動性」や「モメンタム」（スピード・社交性）に近く、内向型（I）は「クオリティ」や「低ボラティリティ」（着実・緻密）と親和性があります。" : "Action vs. reflection. Extraverts mirror Liquidity & Momentum (fast, social); Introverts lean toward Quality & Low Volatility (steady, precise)."
    },
    SN: {
      label: lang === 'ja' ? "感覚型 (Sensing) vs 直観型 (Intuition)" : "Sensing vs. Intuition",
      desc: lang === 'ja' ? "【事実 vs 可能性】感覚型（S）は「バリュー」「クオリティ」（実用・具体性）を好み、直観型（N）は「グロース」「モメンタム」（ビジョン・適応力）と重なります。" : "Facts vs. possibilities. Sensors resemble Value & Quality (practical, concrete); Intuitives align with Growth & Momentum (visionary, adaptive)."
    },
    TF: {
      label: lang === 'ja' ? "思考型 (Thinking) vs 感情型 (Feeling)" : "Thinking vs. Feeling",
      desc: lang === 'ja' ? "【論理 vs 共感】思考型（T）は「バリュー」「クオリティ」（分析・客観性）を重視し、感情型（F）は「利回り」「流動性」（支援・関係性）に近い動きを見せます。" : "Logic vs. empathy. Thinkers fit Value & Quality (analytical, objective); Feelers echo Yield & Liquidity (supportive, relational)."
    },
    JP: {
      label: lang === 'ja' ? "判断型 (Judging) vs 知覚型 (Perceiving)" : "Judging vs. Perceiving",
      desc: lang === 'ja' ? "【構造 vs 柔軟】判断型（J）は「クオリティ」「低ボラティリティ」（組織的・慎重）なアプローチを取り、知覚型（P）は「モメンタム」「サイズ」（俊敏・機会探索）の要素を強く持ちます。" : "Structure vs. flexibility. Judgers prefer Quality & Low Volatility (organized, cautious); Perceivers match Momentum & Size (agile, opportunistic)."
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex-1 overflow-x-auto">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full">
          {/* Lines */}
          {connections.map((conn, i) => (
            <path
              key={i}
              d={`M ${colLeft + 20} ${conn.startY} C ${colLeft + 150} ${conn.startY}, ${colRight - 50} ${conn.endY}, ${colRight} ${conn.endY}`}
              fill="none"
              stroke={conn.color}
              strokeWidth={conn.weight * 5}
              strokeOpacity={0.6}
            />
          ))}

          {/* Left Nodes (Letters) */}
          {letters.map((char, i) => (
            <g key={i} transform={`translate(${colLeft}, ${letterY(i)})`}>
              <circle r={18} fill="white" stroke="#64748b" strokeWidth={2} />
              <text dy=".35em" textAnchor="middle" className="text-sm font-bold fill-slate-700">{char}</text>
            </g>
          ))}

          {/* Right Nodes (Factors) */}
          {factors.map((f, i) => (
            <g key={i} transform={`translate(${colRight}, ${factorY(i)})`}>
              <rect x={-5} y={-10} width={10} height={20} fill={FACTOR_COLORS[f as keyof typeof FACTOR_COLORS]} rx={2} />
              <text x={15} dy=".35em" className="text-sm font-medium fill-slate-700">{AXIS_META[f as AxisKey].label}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend / Explanation */}
      <div className="flex-1 text-sm text-slate-600 space-y-4 pt-4">
        <div>
          <strong className="block text-slate-800">{TEXT.EI.label}</strong>
          {TEXT.EI.desc}
        </div>
        <div>
          <strong className="block text-slate-800">{TEXT.SN.label}</strong>
          {TEXT.SN.desc}
        </div>
        <div>
          <strong className="block text-slate-800">{TEXT.TF.label}</strong>
          {TEXT.TF.desc}
        </div>
        <div>
          <strong className="block text-slate-800">{TEXT.JP.label}</strong>
          {TEXT.JP.desc}
        </div>
      </div>
    </div>
  );
}
