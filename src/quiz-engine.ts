import { type Section, type Question } from './questions';

export type QuizState = 'landing' | 'quiz' | 'results';

export interface QuizProgress {
    sectionId: string;
    currentIndex: number;
    answers: (number | null)[];
    correctCount: number;
}

const STORAGE_KEY = 'jsonata-learning-progress';

interface SavedProgress {
    [sectionId: string]: {
        answers: (number | null)[];
        correctCount: number;
    };
}

export function loadProgress(): SavedProgress {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveProgress(sectionId: string, answers: (number | null)[], correctCount: number) {
    const saved = loadProgress();
    saved[sectionId] = { answers, correctCount };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
        // ignore storage errors
    }
}

export function getSectionProgress(sectionId: string, totalQuestions: number): { completed: number; correct: number } {
    const saved = loadProgress();
    const data = saved[sectionId];
    if (!data) return { completed: 0, correct: 0 };
    const completed = data.answers.filter(a => a !== null).length;
    return { completed: Math.min(completed, totalQuestions), correct: data.correctCount };
}

export function resetSectionProgress(sectionId: string) {
    const saved = loadProgress();
    delete saved[sectionId];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
        // ignore
    }
}

export function createQuizProgress(section: Section): QuizProgress {
    const saved = loadProgress();
    const data = saved[section.id];
    if (data && data.answers.length === section.questions.length) {
        // Resume from saved
        const firstUnanswered = data.answers.findIndex(a => a === null);
        return {
            sectionId: section.id,
            currentIndex: firstUnanswered >= 0 ? firstUnanswered : section.questions.length - 1,
            answers: [...data.answers],
            correctCount: data.correctCount,
        };
    }
    return {
        sectionId: section.id,
        currentIndex: 0,
        answers: new Array(section.questions.length).fill(null),
        correctCount: 0,
    };
}

export function submitAnswer(progress: QuizProgress, question: Question, choiceIndex: number): boolean {
    const isCorrect = choiceIndex === question.correctIndex;
    progress.answers[progress.currentIndex] = choiceIndex;
    if (isCorrect) progress.correctCount++;
    saveProgress(progress.sectionId, progress.answers, progress.correctCount);
    return isCorrect;
}

export function nextQuestion(progress: QuizProgress, totalQuestions: number): boolean {
    if (progress.currentIndex + 1 >= totalQuestions) return false;
    progress.currentIndex++;
    return true;
}

export function isQuizComplete(progress: QuizProgress, totalQuestions: number): boolean {
    return progress.answers.filter(a => a !== null).length >= totalQuestions;
}

export function getScorePercentage(progress: QuizProgress, totalQuestions: number): number {
    return Math.round((progress.correctCount / totalQuestions) * 100);
}
