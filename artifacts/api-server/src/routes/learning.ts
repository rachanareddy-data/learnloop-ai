import { Router, type IRouter } from "express";
import {
  AnalyzeThinkingBody,
  AnalyzeThinkingResponse,
  GetMasteryParams,
  GetPracticeQuestionParams,
  GetPracticeQuestionQueryParams,
  ListSkillsResponse,
  ListRecentActivityResponse,
  GetPracticeQuestionResponse,
  SubmitAttemptBody,
  SubmitAttemptResponse,
  GetMasteryResponse,
} from "@workspace/api-zod";
import {
  analyzeWithFallback,
} from "../lib/ai";
import {
  generateQuestion,
  getMastery,
  isSkillId,
  listActivity,
  nextQuestion,
  scoreAttempt,
  skills,
  type SkillId,
} from "../lib/learning";

const router: IRouter = Router();

router.get("/skills", (_req, res) => {
  res.json(ListSkillsResponse.parse(skills));
});

router.get("/skills/:skillId/question", (req, res) => {
  const params = GetPracticeQuestionParams.safeParse(req.params);
  const query = GetPracticeQuestionQueryParams.safeParse(req.query);
  if (!params.success || !query.success || !isSkillId(params.data.skillId)) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }

  const question = query.data.seed === undefined
    ? nextQuestion(params.data.skillId as SkillId, query.data.level, query.data.activity)
    : generateQuestion(
        params.data.skillId as SkillId,
        query.data.level ?? 1,
        query.data.seed,
        query.data.activity,
      );
  res.json(GetPracticeQuestionResponse.parse(question));
});

router.post("/attempts", (req, res) => {
  const parsed = SubmitAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please submit a valid answer." });
    return;
  }

  const parts = parsed.data.questionId.split(":");
  const [skillId, levelText, seedText] = parts;
  if (!isSkillId(skillId) || parts.length !== 3) {
    res.status(400).json({ error: "That question is no longer available." });
    return;
  }

  const question = generateQuestion(
    skillId,
    Number(levelText),
    Number(seedText),
  );
  if (!Number.isFinite(question.answer)) {
    res.status(400).json({ error: "That question is no longer available." });
    return;
  }

  const result = scoreAttempt(question, parsed.data.answer);
  res.json(SubmitAttemptResponse.parse(result));
});

router.post("/analysis", (req, res) => {
  const parsed = AnalyzeThinkingBody.safeParse(req.body);
  if (!parsed.success || !isSkillId(parsed.data.skillId)) {
    res.status(400).json({ error: "Please add a little more about your thinking." });
    return;
  }

  const question = generateQuestion(
    parsed.data.skillId as SkillId,
    parsed.data.currentDifficulty,
    0,
  );
  const result = analyzeWithFallback({
    gradeLevel: parsed.data.gradeLevel,
    skillId: parsed.data.skillId,
    skill: parsed.data.skill,
    prompt: parsed.data.question,
    answer: parsed.data.correctAnswer,
    studentAnswer: parsed.data.studentAnswer,
    studentExplanation: parsed.data.studentExplanation,
    previousAttemptCount: parsed.data.previousAttemptCount,
    previousWasIncorrect: parsed.data.previousWasIncorrect,
    currentDifficulty: parsed.data.currentDifficulty,
    hint: question.hint,
    correct: parsed.data.studentAnswer === parsed.data.correctAnswer,
    repeatedMiss: parsed.data.previousWasIncorrect && parsed.data.previousAttemptCount >= 2,
  });
  res.json(AnalyzeThinkingResponse.parse(result));
});

router.get("/mastery/:skillId", (req, res) => {
  const params = GetMasteryParams.safeParse(req.params);
  if (!params.success || !isSkillId(params.data.skillId)) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }
  res.json(GetMasteryResponse.parse(getMastery(params.data.skillId as SkillId)));
});

router.get("/activity", (_req, res) => {
  res.json(ListRecentActivityResponse.parse(listActivity()));
});

export default router;