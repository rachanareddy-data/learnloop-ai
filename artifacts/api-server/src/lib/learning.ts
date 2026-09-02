export type SkillId = "addition" | "subtraction" | "multiplication" | "division";

export type Skill = {
  id: SkillId;
  name: string;
  description: string;
  symbol: string;
  accent: string;
  examples: string[];
};

export type Question = {
  id: string;
  skillId: SkillId;
  prompt: string;
  answer: number;
  level: number;
  hint: string;
  activityType: "standard" | "visual";
};

export type Mastery = {
  skillId: SkillId;
  attempted: number;
  correct: number;
  mastery: number;
  level: number;
  streak: number;
};

export type Activity = {
  id: string;
  skillId: SkillId;
  skillName: string;
  correct: boolean;
  question: string;
  createdAt: string;
};

type SkillState = {
  attempted: number;
  correct: number;
  level: number;
  streak: number;
  nextSeed: number;
};

const skillStates = new Map<SkillId, SkillState>();
const recentActivity: Activity[] = [];

export const skills: Skill[] = [
  {
    id: "addition",
    name: "Addition",
    description: "Put numbers together and build fluency",
    symbol: "+",
    accent: "sun",
    examples: ["7 + 5", "24 + 18"],
  },
  {
    id: "subtraction",
    name: "Subtraction",
    description: "Find the difference with confidence",
    symbol: "−",
    accent: "sky",
    examples: ["12 − 4", "43 − 17"],
  },
  {
    id: "multiplication",
    name: "Multiplication",
    description: "See groups and patterns faster",
    symbol: "×",
    accent: "coral",
    examples: ["3 × 4", "7 × 8"],
  },
  {
    id: "division",
    name: "Division",
    description: "Share equally and think in groups",
    symbol: "÷",
    accent: "mint",
    examples: ["12 ÷ 3", "56 ÷ 7"],
  },
];

function getState(skillId: SkillId): SkillState {
  const state = skillStates.get(skillId);
  if (state) return state;
  const initialState = { attempted: 0, correct: 0, level: 1, streak: 0, nextSeed: 0 };
  skillStates.set(skillId, initialState);
  return initialState;
}

function getSkill(skillId: string): Skill | undefined {
  return skills.find((skill) => skill.id === skillId);
}

function normalizeLevel(level: number): number {
  return Math.min(5, Math.max(1, Math.round(level || 1)));
}

export function isSkillId(value: string): value is SkillId {
  return Boolean(getSkill(value));
}

export function generateQuestion(
  skillId: SkillId,
  level: number,
  seed: number,
  activityType: "standard" | "visual" = "standard",
): Question {
  const safeLevel = normalizeLevel(level);
  const safeSeed = Math.max(0, Math.round(seed));
  const base = safeSeed + safeLevel * 11;
  let left = 0;
  let right = 0;
  let answer = 0;
  let prompt = "";
  let hint = "";

  if (skillId === "addition") {
    const ceiling = 9 + safeLevel * 18;
    left = 2 + ((base * 7) % ceiling);
    right = 1 + ((base * 11 + 3) % ceiling);
    answer = left + right;
    prompt = `${left} + ${right}`;
    hint = "Start with the larger number, then count on.";
  } else if (skillId === "subtraction") {
    const ceiling = 12 + safeLevel * 19;
    left = 8 + ((base * 13) % ceiling);
    right = (base * 5 + 2) % Math.max(2, left - 1);
    answer = left - right;
    prompt = `${left} − ${right}`;
    hint = "Think: what number added to the smaller one makes the larger one?";
  } else if (skillId === "multiplication") {
    const maxFactor = Math.min(12, 3 + safeLevel * 2);
    left = 2 + ((base * 3) % maxFactor);
    right = 2 + ((base * 5 + 1) % maxFactor);
    answer = left * right;
    prompt = `${left} × ${right}`;
    hint = "Picture equal groups, or use a fact you already know.";
  } else {
    const divisor = 2 + ((base * 3) % Math.min(10, 2 + safeLevel));
    const quotient = 2 + ((base * 5 + 1) % (3 + safeLevel * 2));
    left = divisor * quotient;
    right = divisor;
    answer = quotient;
    prompt = `${left} ÷ ${right}`;
    hint = "Ask: how many equal groups of the divisor fit into the total?";
  }

  return {
    id: `${skillId}:${safeLevel}:${safeSeed}`,
    skillId,
    prompt,
    answer,
    level: safeLevel,
    hint,
    activityType,
  };
}

export function nextQuestion(
  skillId: SkillId,
  requestedLevel?: number,
  activityType: "standard" | "visual" = "standard",
): Question {
  const state = getState(skillId);
  const level = normalizeLevel(requestedLevel ?? state.level);
  const question = generateQuestion(skillId, level, state.nextSeed, activityType);
  state.nextSeed += 1;
  return question;
}

export function nextActivityQuestion(
  skillId: SkillId,
  recommendation: "retry" | "simpler" | "visual" | "similar",
): Question {
  const state = getState(skillId);
  const level = recommendation === "simpler" ? Math.max(1, state.level - 1) : state.level;
  const activityType = recommendation === "visual" ? "visual" : "standard";
  return nextQuestion(skillId, level, activityType);
}

export function getMastery(skillId: SkillId): Mastery {
  const state = getState(skillId);
  if (state.attempted === 0) {
    return { skillId, attempted: 0, correct: 0, mastery: 0, level: state.level, streak: state.streak };
  }
  const accuracy = state.correct / state.attempted;
  const mastery = Math.min(100, Math.round(accuracy * 75 + (state.level - 1) * 6.25));
  return { skillId, attempted: state.attempted, correct: state.correct, mastery, level: state.level, streak: state.streak };
}

export function scoreAttempt(question: Question, answer: number) {
  const state = getState(question.skillId);
  const correct = Number.isFinite(answer) && answer === question.answer;
  state.attempted += 1;

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    state.level = Math.min(5, state.level + 1);
  } else {
    state.streak = 0;
    state.level = Math.max(1, state.level - 1);
  }

  const skill = getSkill(question.skillId)!;
  recentActivity.unshift({
    id: `${question.id}:${state.attempted}`,
    skillId: question.skillId,
    skillName: skill.name,
    correct,
    question: question.prompt,
    createdAt: new Date().toISOString(),
  });
  recentActivity.splice(8);

  const repeatedMiss = !correct && state.attempted >= 2 && state.streak === 0;
  const feedback = correct
    ? state.streak > 1
      ? "You kept the streak going."
      : "That’s right. Nice work."
    : "Not quite yet. You can try the next one with a fresh clue.";
  const explanation = correct
    ? `${question.prompt} equals ${question.answer}. You found the answer.`
    : repeatedMiss
      ? `Let’s slow this one down. ${question.hint} The answer is ${question.answer}.`
      : `A helpful way to see it: ${question.hint} The answer is ${question.answer}.`;

  return {
    correct,
    feedback,
    explanation,
    nextLevel: state.level,
    mastery: getMastery(question.skillId).mastery,
    streak: state.streak,
    recommendation: correct
      ? state.level >= 4
        ? "Ready for a bigger challenge"
        : "Keep building your momentum"
      : "Practice one step at a time",
  };
}

export function listActivity(): Activity[] {
  return [...recentActivity];
}