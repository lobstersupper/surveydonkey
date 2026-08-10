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
