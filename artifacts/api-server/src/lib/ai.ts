import { AnalyzeThinkingResponse } from "@workspace/api-zod";

export type ExplanationContext = {
  gradeLevel: number;
  skillId: string;
  skill: string;
  prompt: string;
  answer: number;
  studentAnswer: number;
  studentExplanation: string;
  previousAttemptCount: number;
  previousWasIncorrect: boolean;
  currentDifficulty: number;
  hint: string;
  correct: boolean;
  repeatedMiss: boolean;
};

export type LearningAnalysis = {
  explanation: string;
  misconception: string;
  confidence: "low" | "medium" | "high";
  recommendedStrategy: string;
  recommendedNextActivity: "retry" | "simpler" | "visual" | "similar";
};

export interface LearningExplanationProvider {
  analyze(context: ExplanationContext): LearningAnalysis;
}

/**
 * Deterministic provider used by the MVP. A future AI provider can implement
 * the same interface without taking over answer validation or scoring.
 */
export const fallbackExplanationProvider: LearningExplanationProvider = {
  analyze({
    skillId,
    prompt,
    answer,
    studentAnswer,
    studentExplanation,
    previousAttemptCount,
    previousWasIncorrect,
    currentDifficulty,
    hint,
    correct,
    repeatedMiss,
  }) {
    const words = studentExplanation.trim().toLowerCase();
    const closeAnswer = Math.abs(studentAnswer - answer) <= 1;
    const confidence: LearningAnalysis["confidence"] = words.length > 0
      ? words.length > 28 && (words.includes("because") || words.includes("then"))
        ? "medium"
        : "low"
      : "low";

    if (correct) {
      return {
        explanation: `${prompt} equals ${answer}. You found the answer.`,
        misconception: "No learning pattern to unpack on a correct answer.",
        confidence: "low",
        recommendedStrategy: "Keep using the strategy that helped you find the answer.",
        recommendedNextActivity: "similar",
      };
    }

    let misconception = "You may be mixing up one step in the operation.";
    if (skillId === "multiplication" && (words.includes("add") || words.includes("plus"))) {
      misconception = "You may be counting one group instead of all the equal groups.";
    } else if (skillId === "division" && (words.includes("multiply") || words.includes("times"))) {
      misconception = "You may be looking for the total instead of how many equal groups fit.";
    } else if (closeAnswer) {
      misconception = "You may have stopped just one step before the answer.";
    } else if (!studentExplanation.trim()) {
      misconception = "There is not enough thinking written down yet to spot a specific pattern.";
    }

    const recommendedNextActivity = repeatedMiss || previousAttemptCount >= 2
      ? "simpler"
      : skillId === "multiplication" || skillId === "addition"
        ? "visual"
        : "similar";

    return {
      explanation: studentExplanation.trim()
        ? `Your thinking gives us a place to start. ${hint} Let’s try the same idea one small step at a time.`
        : `Let’s slow this one down. ${hint} The answer is ${answer}.`,
      misconception,
      confidence,
      recommendedStrategy: currentDifficulty >= 3 || previousWasIncorrect
        ? "Use a picture or equal groups, then count each part carefully."
        : "Say each step out loud and check the operation before moving on.",
      recommendedNextActivity,
    };
  },
};

const providerName = (process.env.AI_PROVIDER ?? "fallback").trim().toLowerCase();
const providers: Record<string, LearningExplanationProvider> = {
  fallback: fallbackExplanationProvider,
};

export const configuredProvider = providers[providerName] ? providerName : "fallback";

export function getExplanationProvider(): LearningExplanationProvider {
  return providers[configuredProvider] ?? fallbackExplanationProvider;
}

export function analyzeWithFallback(context: ExplanationContext): LearningAnalysis {
  try {
    const candidate = getExplanationProvider().analyze(context);
    const parsed = AnalyzeThinkingResponse.safeParse(candidate);
    return parsed.success ? parsed.data : fallbackExplanationProvider.analyze(context);
  } catch {
    return fallbackExplanationProvider.analyze(context);
  }
}