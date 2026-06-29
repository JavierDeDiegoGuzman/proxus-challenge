import { Effect } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import {
  scoreQuestionCorrections,
  type ArtifactAttempt,
  type ArtifactRepository,
  type QuestionCorrection,
  type ShortAnswerCorrection,
  type ShortAnswerQuestion,
  type TestArtifact
} from "../../artifacts/artifact.ts";

/**
 * The deterministic exact-string grading in artifact.ts marks a short answer
 * wrong if it isn't worded exactly like `expectedAnswer`. This re-checks only
 * the answers that were marked wrong, with a lenient-but-fair LLM judge, so a
 * correct answer phrased differently doesn't unfairly cost the student points.
 *
 * Uses generateText with a constrained reply format instead of generateObject:
 * the project's hand-rolled Gemini adapter (gemini.ts) has no native JSON
 * response mode, and generateObject's text-to-JSON parsing was unreliable
 * against it in testing (the model replied in prose, not JSON).
 */
const judgeShortAnswer = (
  question: ShortAnswerQuestion,
  studentAnswer: string,
  correction: ShortAnswerCorrection
): Effect.Effect<ShortAnswerCorrection, never, LanguageModel.LanguageModel> => {
  if (correction.score > 0) {
    return Effect.succeed(correction);
  }

  return LanguageModel.generateText({
    prompt: `Question: "${question.prompt}"\nExpected answer: "${question.expectedAnswer}"\nStudent answer: "${studentAnswer}"\n\n` +
      "Judge like a lenient but fair teacher: is the student's answer conceptually correct, even if worded differently or using synonyms?\n" +
      "Reply with exactly one line in this format: CORRECT|INCORRECT: <one short sentence of feedback>"
  }).pipe(
    Effect.map((response): ShortAnswerCorrection => {
      const text = response.text.trim();
      const isCorrect = /^correct\b/i.test(text);
      const feedback = text.replace(/^(correct|incorrect):?\s*/i, "").trim();

      return isCorrect
        ? { ...correction, score: correction.maxScore, feedback: feedback || correction.feedback }
        : { ...correction, feedback: feedback || correction.feedback };
    }),
    Effect.catch(() => Effect.succeed(correction))
  );
};

/**
 * Re-judges every wrong short-answer correction on a graded test attempt and
 * persists the updated attempt. No-op for quizzes and for tests without
 * short-answer questions, since those are already deterministic.
 */
export const reviewShortAnswers = (
  artifacts: ArtifactRepository,
  attempt: ArtifactAttempt
): Effect.Effect<ArtifactAttempt, never, LanguageModel.LanguageModel> => {
  if (attempt.status !== "graded" || attempt.artifactKind !== "test") {
    return Effect.succeed(attempt);
  }

  const hasShortAnswer = attempt.corrections.some((correction) => correction.questionType === "short-answer");
  if (!hasShortAnswer) {
    return Effect.succeed(attempt);
  }

  return artifacts.getArtifact(attempt.artifactId).pipe(
    Effect.flatMap((artifact) => {
      const testArtifact = artifact as TestArtifact;

      return Effect.forEach(attempt.corrections, (correction): Effect.Effect<QuestionCorrection, never, LanguageModel.LanguageModel> => {
        if (correction.questionType !== "short-answer") {
          return Effect.succeed(correction);
        }

        const question = testArtifact.questions.find((candidate) => candidate.id === correction.questionId);
        const answer = attempt.answers.find((candidate) => candidate.questionId === correction.questionId);
        if (question?.type !== "short-answer" || answer?.questionType !== "short-answer") {
          return Effect.succeed(correction);
        }

        return judgeShortAnswer(question, answer.answer, correction);
      });
    }),
    Effect.map((corrections) => {
      const { score, maxScore } = scoreQuestionCorrections(corrections);
      return {
        ...attempt,
        corrections,
        score,
        maxScore,
        summary: `${score}/${maxScore} points`
      };
    }),
    Effect.flatMap((updated) => artifacts.saveAttempt(updated).pipe(Effect.as(updated))),
    Effect.catch(() => Effect.succeed(attempt))
  );
};
