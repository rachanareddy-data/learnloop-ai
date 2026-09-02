import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 4321;
const baseUrl = `http://127.0.0.1:${port}/api`;
let server;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not start in time");
}

async function json(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json();
  assert.equal(response.ok, true, JSON.stringify(body));
  return body;
}

before(async () => {
  server = spawn("node", ["dist/index.mjs"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, PORT: String(port), AI_PROVIDER: "fallback" },
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  server?.kill();
});

test("incorrect answer can be explained and receives a deterministic learning insight", async () => {
  const question = await json("/skills/addition/question?level=2");
  assert.equal(question.activityType, "standard");

  const attempt = await json("/attempts", {
    method: "POST",
    body: JSON.stringify({
      questionId: question.id,
      skillId: question.skillId,
      answer: question.answer + 1,
      expectedAnswer: question.answer,
      level: question.level,
    }),
  });
  assert.equal(attempt.correct, false);

  const analysis = await json("/analysis", {
    method: "POST",
    body: JSON.stringify({
      gradeLevel: 3,
      skillId: question.skillId,
      skill: "Addition",
      question: question.prompt,
      correctAnswer: question.answer,
      studentAnswer: question.answer + 1,
      studentExplanation: "I counted the first number and then added one more.",
      previousAttemptCount: 1,
      previousWasIncorrect: true,
      currentDifficulty: question.level,
    }),
  });
  assert.match(analysis.explanation, /thinking|step|answer/i);
  assert.ok(analysis.misconception.length > 0);
  assert.ok(["low", "medium", "high"].includes(analysis.confidence));
  assert.ok(["retry", "simpler", "visual", "similar"].includes(analysis.recommendedNextActivity));
});

test("analysis recommendation can select a visual deterministic next activity", async () => {
  const question = await json("/skills/multiplication/question?level=2&activity=visual");
  assert.equal(question.activityType, "visual");
  assert.match(question.prompt, /×/);
});

test("correct answer remains deterministic and updates mastery", async () => {
  const question = await json("/skills/division/question?level=1");
  const attempt = await json("/attempts", {
    method: "POST",
    body: JSON.stringify({
      questionId: question.id,
      skillId: question.skillId,
      answer: question.answer,
      expectedAnswer: question.answer,
      level: question.level,
    }),
  });
  assert.equal(attempt.correct, true);

  const mastery = await json(`/mastery/${question.skillId}`);
  assert.ok(mastery.attempted >= 1);
  assert.ok(mastery.correct >= 1);
});

test("malformed explanations are rejected without exposing provider details", async () => {
  const response = await fetch(`${baseUrl}/analysis`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ studentExplanation: "" }),
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.doesNotMatch(JSON.stringify(body), /api key|provider missing|openai/i);
});