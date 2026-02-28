import { type Section, type Question } from './questions';
import { type QuizProgress, getSectionProgress, submitAnswer, nextQuestion, isQuizComplete, getScorePercentage, resetSectionProgress } from './quiz-engine';
import { evaluateExpression } from './playground';

const LABELS = ['A', 'B', 'C', 'D'];

// ─── Landing Page ───

export function renderLanding(
    container: HTMLElement,
    sections: Section[],
    onSectionClick: (section: Section) => void,
) {
    container.innerHTML = `
        <div class="hero">
            <div class="container">
                <span class="hero-badge">INTERACTIVE LEARNING</span>
                <h1><span class="gradient-text">JSONata</span> を学ぼう</h1>
                <p class="hero-description">
                    JSON経験者が、JSONataの基礎からAWS Step Functions + DynamDB実践まで<br />
                    4択クイズ & インタラクティブ・プレイグラウンドで効率的に学べます。
                </p>
                <div class="hero-target">
                    <strong>🎯 ゴール:</strong> DynamoDB ScanのJSONをJSONataで変換して通常JSONで返せるようになる
                </div>
            </div>
        </div>
        <div class="container">
            <div class="sections-grid" id="sections-grid"></div>
        </div>
    `;

    const grid = container.querySelector('#sections-grid')!;

    sections.forEach(section => {
        const progress = getSectionProgress(section.id, section.questions.length);
        const pct = section.questions.length > 0 ? Math.round((progress.completed / section.questions.length) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'section-card';
        card.innerHTML = `
            <div class="section-card-header">
                <span class="section-card-number">Section ${section.number}</span>
                <span class="section-card-count">${section.questions.length} 問</span>
            </div>
            <h3>${section.title}</h3>
            <p>${section.description}</p>
            <div class="section-card-tags">
                ${section.tags.map(t => `<span class="section-card-tag">${t}</span>`).join('')}
            </div>
            ${progress.completed > 0 ? `
                <div class="section-card-progress">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="progress-text">${progress.correct}/${section.questions.length} 正解</span>
                </div>
            ` : ''}
        `;
        card.addEventListener('click', () => onSectionClick(section));
        grid.appendChild(card);
    });
}

// ─── Quiz View ───

export function renderQuiz(
    container: HTMLElement,
    section: Section,
    progress: QuizProgress,
    onBack: () => void,
    onComplete: () => void,
) {
    const question = section.questions[progress.currentIndex];
    const alreadyAnswered = progress.answers[progress.currentIndex] !== null;
    const totalQ = section.questions.length;

    container.innerHTML = `
        <div class="quiz-view">
            <div class="container">
                <div class="quiz-header">
                    <button class="quiz-back-btn" id="quiz-back">← 戻る</button>
                    <span style="font-size:0.875rem;color:var(--color-text-secondary);font-weight:500">${section.title}</span>
                    <span class="quiz-progress-info"><strong>${progress.currentIndex + 1}</strong> / ${totalQ}</span>
                </div>
                <div class="question-card" id="question-card">
                    <div class="question-number">Question ${progress.currentIndex + 1}</div>
                    <div class="question-text">${question.text}</div>
                    ${question.context ? `
                        <div class="question-context">
                            ${question.contextLabel ? `<div class="question-context-label">${question.contextLabel}</div>` : ''}
                            <pre>${escapeHtml(question.context)}</pre>
                        </div>
                    ` : ''}
                    <div class="choices" id="choices"></div>
                    <div id="explanation-area"></div>
                    <div id="playground-area"></div>
                    <div id="next-area"></div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#quiz-back')!.addEventListener('click', onBack);

    const choicesEl = container.querySelector('#choices')!;
    renderChoices(choicesEl, question, alreadyAnswered ? progress.answers[progress.currentIndex] : null, (choiceIndex: number) => {
        const isCorrect = submitAnswer(progress, question, choiceIndex);
        renderChoicesResult(choicesEl, question, choiceIndex);
        renderExplanation(container.querySelector('#explanation-area')!, question, isCorrect);
        renderPlayground(container.querySelector('#playground-area')!, question);
        renderNextButton(container.querySelector('#next-area')!, progress, totalQ, () => {
            if (isQuizComplete(progress, totalQ)) {
                onComplete();
            } else {
                nextQuestion(progress, totalQ);
                renderQuiz(container, section, progress, onBack, onComplete);
            }
        });
    });

    // If already answered, show result state
    if (alreadyAnswered) {
        const prevAnswer = progress.answers[progress.currentIndex]!;
        const wasCorrect = prevAnswer === question.correctIndex;
        renderChoicesResult(choicesEl, question, prevAnswer);
        renderExplanation(container.querySelector('#explanation-area')!, question, wasCorrect);
        renderPlayground(container.querySelector('#playground-area')!, question);
        renderNextButton(container.querySelector('#next-area')!, progress, totalQ, () => {
            if (isQuizComplete(progress, totalQ)) {
                onComplete();
            } else {
                nextQuestion(progress, totalQ);
                renderQuiz(container, section, progress, onBack, onComplete);
            }
        });
    }
}

function renderChoices(
    container: Element,
    question: Question,
    _alreadySelected: number | null,
    onSelect: (index: number) => void,
) {
    container.innerHTML = '';
    question.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `
            <span class="choice-label">${LABELS[i]}</span>
            <span class="choice-text">${choice}</span>
        `;
        btn.addEventListener('click', () => {
            // Disable all buttons
            container.querySelectorAll('.choice-btn').forEach(b => (b as HTMLButtonElement).disabled = true);
            onSelect(i);
        });
        container.appendChild(btn);
    });
}

function renderChoicesResult(container: Element, question: Question, selectedIndex: number) {
    container.querySelectorAll('.choice-btn').forEach((btn, i) => {
        (btn as HTMLButtonElement).disabled = true;
        btn.classList.remove('correct', 'wrong', 'dimmed');
        if (i === question.correctIndex) {
            btn.classList.add('correct');
        } else if (i === selectedIndex) {
            btn.classList.add('wrong');
        } else {
            btn.classList.add('dimmed');
        }
    });
}

function renderExplanation(container: HTMLElement, question: Question, isCorrect: boolean) {
    const status = isCorrect ? 'correct' : 'wrong';
    const icon = isCorrect ? '✓' : '✗';
    const title = isCorrect ? '正解！' : '不正解';

    container.innerHTML = `
        <div class="explanation">
            <div class="explanation-header">
                <div class="explanation-icon ${status}">${icon}</div>
                <span class="explanation-title ${status}">${title}</span>
            </div>
            <div class="explanation-text">${question.explanation}</div>
        </div>
    `;
}

function renderPlayground(container: HTMLElement, question: Question) {
    if (!question.playgroundInput && !question.playgroundExpression) return;

    const id = `pg-${question.id}`;

    container.innerHTML = `
        <div class="playground">
            <div class="playground-header">
                <span class="playground-title">プレイグラウンド — 自分で試してみよう</span>
                <button class="playground-run-btn" id="${id}-run">▶ 実行</button>
            </div>
            <div class="playground-body">
                <div class="playground-panel">
                    <div class="playground-panel-label">入力JSON</div>
                    <textarea id="${id}-input" rows="6">${escapeHtml(question.playgroundInput || '{}')}</textarea>
                </div>
                <div class="playground-panel">
                    <div class="playground-panel-label">結果</div>
                    <div class="playground-result" id="${id}-result">▶ 実行ボタンを押してください</div>
                </div>
            </div>
            <div class="playground-expression">
                <label>式:</label>
                <input type="text" id="${id}-expr" value="${escapeAttr(question.playgroundExpression || '')}" placeholder="JSONata式を入力..." />
            </div>
        </div>
    `;

    const inputEl = document.getElementById(`${id}-input`) as HTMLTextAreaElement;
    const exprEl = document.getElementById(`${id}-expr`) as HTMLInputElement;
    const resultEl = document.getElementById(`${id}-result`)!;
    const runBtn = document.getElementById(`${id}-run`)!;

    const run = async () => {
        resultEl.textContent = '実行中...';
        resultEl.classList.remove('error');
        const { result, isError } = await evaluateExpression(inputEl.value, exprEl.value);
        resultEl.textContent = result || '(結果なし)';
        if (isError) resultEl.classList.add('error');
        else resultEl.classList.remove('error');
    };

    runBtn.addEventListener('click', run);
    exprEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
}

function renderNextButton(
    container: HTMLElement,
    progress: QuizProgress,
    totalQuestions: number,
    onNext: () => void,
) {
    const isLast = progress.currentIndex + 1 >= totalQuestions;
    const label = isLast ? '結果を見る →' : '次の問題 →';

    container.innerHTML = `<button class="next-btn" id="next-btn">${label}</button>`;
    container.querySelector('#next-btn')!.addEventListener('click', onNext);
}

// ─── Results View ───

export function renderResults(
    container: HTMLElement,
    section: Section,
    progress: QuizProgress,
    onBack: () => void,
    onRetry: () => void,
) {
    const total = section.questions.length;
    const pct = getScorePercentage(progress, total);
    let emoji: string;
    let message: string;

    if (pct === 100) {
        emoji = '🎉';
        message = 'パーフェクト！JSONataマスターです！';
    } else if (pct >= 75) {
        emoji = '🌟';
        message = '素晴らしい成績です！';
    } else if (pct >= 50) {
        emoji = '💪';
        message = '良い調子！復習でさらに理解を深めましょう。';
    } else {
        emoji = '📚';
        message = 'もう一度チャレンジして理解を深めましょう！';
    }

    container.innerHTML = `
        <div class="results-view">
            <div class="container">
                <div class="results-card">
                    <div class="results-emoji">${emoji}</div>
                    <h2>${section.title}</h2>
                    <div class="results-score">${pct}%</div>
                    <p class="results-detail">${total}問中 ${progress.correctCount}問 正解</p>
                    <p class="results-detail">${message}</p>
                    <div class="results-actions">
                        <button class="btn-secondary" id="results-back">← セクション一覧</button>
                        <button class="next-btn" id="results-retry">もう一度挑戦 ↻</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('#results-back')!.addEventListener('click', onBack);
    container.querySelector('#results-retry')!.addEventListener('click', () => {
        resetSectionProgress(section.id);
        onRetry();
    });
}

// ─── Standalone Playground ───

export function renderStandalonePlayground(container: HTMLElement) {
    container.innerHTML = `
        <div class="quiz-view">
            <div class="container">
                <div class="question-card">
                    <div class="question-number">FREE PLAYGROUND</div>
                    <div class="question-text">自由にJSONata式を試してみましょう。入力JSONと式を入力して「実行」ボタンを押してください。</div>
                    <div class="playground">
                        <div class="playground-header">
                            <span class="playground-title">フリー・プレイグラウンド</span>
                            <button class="playground-run-btn" id="free-pg-run">▶ 実行</button>
                        </div>
                        <div class="playground-body">
                            <div class="playground-panel">
                                <div class="playground-panel-label">入力JSON</div>
                                <textarea id="free-pg-input" rows="10">{
  "Items": [
    {"name": "Apple", "price": 100},
    {"name": "Banana", "price": 200},
    {"name": "Cherry", "price": 300}
  ]
}</textarea>
                            </div>
                            <div class="playground-panel">
                                <div class="playground-panel-label">結果</div>
                                <div class="playground-result" id="free-pg-result">▶ 実行ボタンを押してください</div>
                            </div>
                        </div>
                        <div class="playground-expression">
                            <label>式:</label>
                            <input type="text" id="free-pg-expr" value="Items[price > 150].name" placeholder="JSONata式を入力..." />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const inputEl = document.getElementById('free-pg-input') as HTMLTextAreaElement;
    const exprEl = document.getElementById('free-pg-expr') as HTMLInputElement;
    const resultEl = document.getElementById('free-pg-result')!;
    const runBtn = document.getElementById('free-pg-run')!;

    const run = async () => {
        resultEl.textContent = '実行中...';
        resultEl.classList.remove('error');
        const { result, isError } = await evaluateExpression(inputEl.value, exprEl.value);
        resultEl.textContent = result || '(結果なし)';
        if (isError) resultEl.classList.add('error');
        else resultEl.classList.remove('error');
    };

    runBtn.addEventListener('click', run);
    exprEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
}

// ─── Helpers ───

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
