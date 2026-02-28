import './style.css';
import { sections, type Section } from './questions';
import { createQuizProgress, type QuizProgress, type QuizState } from './quiz-engine';
import { renderLanding, renderQuiz, renderResults, renderStandalonePlayground } from './renderer';

const app = document.getElementById('app')!;

let currentState: QuizState = 'landing';
let currentSection: Section | null = null;
let currentProgress: QuizProgress | null = null;
let currentView: 'quiz' | 'playground' = 'quiz';

function renderApp() {
    app.innerHTML = '';

    // Header
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
        <div class="header-inner">
            <span class="header-logo" id="logo">JSONata Learning</span>
            <nav class="header-nav">
                <button class="header-nav-btn ${currentView === 'quiz' ? 'active' : ''}" id="nav-quiz">クイズ</button>
                <button class="header-nav-btn ${currentView === 'playground' ? 'active' : ''}" id="nav-playground">プレイグラウンド</button>
            </nav>
        </div>
    `;
    app.appendChild(header);

    // Main content
    const main = document.createElement('main');
    app.appendChild(main);

    if (currentView === 'playground') {
        renderStandalonePlayground(main);
    } else {
        switch (currentState) {
            case 'landing':
                renderLanding(main, sections, (section) => {
                    currentSection = section;
                    currentProgress = createQuizProgress(section);
                    currentState = 'quiz';
                    renderApp();
                });
                break;
            case 'quiz':
                if (currentSection && currentProgress) {
                    renderQuiz(main, currentSection, currentProgress, () => {
                        currentState = 'landing';
                        currentSection = null;
                        currentProgress = null;
                        renderApp();
                    }, () => {
                        currentState = 'results';
                        renderApp();
                    });
                }
                break;
            case 'results':
                if (currentSection && currentProgress) {
                    renderResults(main, currentSection, currentProgress, () => {
                        currentState = 'landing';
                        currentSection = null;
                        currentProgress = null;
                        renderApp();
                    }, () => {
                        currentProgress = createQuizProgress(currentSection!);
                        currentState = 'quiz';
                        renderApp();
                    });
                }
                break;
        }
    }

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML = `
        <div class="container">
            <p>© 2026 ariaria2021 — <a href="https://ariaria2021.github.io/" target="_blank" rel="noopener">blog</a> · <a href="https://docs.jsonata.org/" target="_blank" rel="noopener">JSONata Docs</a></p>
        </div>
    `;
    app.appendChild(footer);

    // Wire up header navigation
    document.getElementById('logo')?.addEventListener('click', () => {
        currentState = 'landing';
        currentSection = null;
        currentProgress = null;
        currentView = 'quiz';
        renderApp();
    });

    document.getElementById('nav-quiz')?.addEventListener('click', () => {
        currentView = 'quiz';
        renderApp();
    });

    document.getElementById('nav-playground')?.addEventListener('click', () => {
        currentView = 'playground';
        renderApp();
    });
}

renderApp();
