import { Question, QuestionOption } from '@/db/schema';

export interface LogicJumpResult {
  nextQuestionId: string | null; // null if end of survey
  isCompleted: boolean;
}

/**
 * Determine the next question to show based on selected options and logic jumps.
 */
export function getNextQuestionId(
  currentQuestion: Question,
  selectedOptionId: string,
  allQuestions: Question[]
): LogicJumpResult {
  const options = (currentQuestion.options || []) as QuestionOption[];
  const selectedOption = options.find((opt) => opt.id === selectedOptionId);

  // Check if selected option has explicit nextQuestionId
  if (selectedOption && selectedOption.nextQuestionId) {
    if (selectedOption.nextQuestionId === 'END_SURVEY') {
      return { nextQuestionId: null, isCompleted: true };
    }
    // Verify target question exists
    const targetExists = allQuestions.some((q) => q.id === selectedOption.nextQuestionId);
    if (targetExists) {
      return { nextQuestionId: selectedOption.nextQuestionId, isCompleted: false };
    }
  }

  // Fallback: Default to next question in orderIndex sequence
  const sorted = [...allQuestions].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIndex = sorted.findIndex((q) => q.id === currentQuestion.id);

  if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
    return { nextQuestionId: sorted[currentIndex + 1].id, isCompleted: false };
  }

  return { nextQuestionId: null, isCompleted: true };
}

/**
 * Calculate dynamic sequence of answered questions path given respondent's answers map.
 */
export function getQuestionExecutionPath(
  allQuestions: Question[],
  answers: Record<string, string>
): Question[] {
  const sorted = [...allQuestions].sort((a, b) => a.orderIndex - b.orderIndex);
  if (sorted.length === 0) return [];

  const path: Question[] = [];
  let currentId: string | null = sorted[0].id;

  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const q = sorted.find((item) => item.id === currentId);
    if (!q) break;

    path.push(q);

    const answerOptionId = answers[q.id];
    if (!answerOptionId) {
      // User hasn't answered this step yet
      break;
    }

    const { nextQuestionId, isCompleted } = getNextQuestionId(q, answerOptionId, sorted);
    if (isCompleted) break;
    currentId = nextQuestionId;
  }

  return path;
}

import { PersonalityArchetype } from '@/db/schema';

export interface PersonalityOutcomeResult {
  winningArchetype: PersonalityArchetype | null;
  scores: Record<string, number>;
  percentages: Record<string, number>;
  totalScore: number;
}

/**
 * Calculates personality outcome by accumulating option archetype weights.
 */
export function calculatePersonalityOutcome(
  questions: Question[],
  answers: Record<string, string>,
  archetypes: PersonalityArchetype[]
): PersonalityOutcomeResult {
  const scores: Record<string, number> = {};
  for (const arch of archetypes) {
    scores[arch.id] = 0;
  }

  let totalScore = 0;

  for (const q of questions) {
    const selectedOptionId = answers[q.id];
    if (!selectedOptionId) continue;

    const options = (q.options || []) as QuestionOption[];
    const selected = options.find((opt) => opt.id === selectedOptionId);
    if (selected?.archetypeWeights) {
      for (const [archId, weight] of Object.entries(selected.archetypeWeights)) {
        scores[archId] = (scores[archId] || 0) + Number(weight);
        totalScore += Number(weight);
      }
    }
  }

  // Calculate percentages
  const percentages: Record<string, number> = {};
  for (const arch of archetypes) {
    percentages[arch.id] = totalScore > 0 ? Math.round(((scores[arch.id] || 0) / totalScore) * 100) : 0;
  }

  // Determine winning archetype
  let highestScore = -1;
  let winningArch: PersonalityArchetype | null = null;

  for (const arch of archetypes) {
    const score = scores[arch.id] || 0;
    if (score > highestScore) {
      highestScore = score;
      winningArch = arch;
    }
  }

  return {
    winningArchetype: winningArch || archetypes[0] || null,
    scores,
    percentages,
    totalScore,
  };
}

