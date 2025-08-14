// script.js

class WordStudyApp {
    constructor() {
        this.words = [];
        this.currentTab = 'dashboard';
        this.studyData = this.loadStudyData();
        
        // フラッシュカード関連
        this.flashcardIndex = 0;
        this.flashcardWords = [];
        this.isFlashcardFlipped = false;
        
        // クイズ関連
        this.quizWords = [];
        this.currentQuizIndex = 0;
        this.quizStartTime = null;
        this.quizAnswers = [];
        
        // タイピング関連
        this.typingWords = [];
        this.currentTypingIndex = 0;
        this.typingStartTime = null;
        this.typingStats = { correct: 0, total: 0 };
        
        this.init();
    }

    async init() {
        await this.loadWordsFromCSV();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderWordList();
    }

    async loadWordsFromCSV() {
    try {
        const response = await fetch('data.csv'); // 同じフォルダのCSVを取得
        if (!response.ok) throw new Error('CSVの読み込みに失敗しました');
        const csvText = await response.text();
        this.parseCSV(csvText);
    } catch (error) {
        console.error('CSVの読み込みに失敗しました:', error);
        // フォールバック用のサンプル
        this.words = [
            { word: 'hello', meaning: 'こんにちは' },
            { word: 'world', meaning: '世界' },
            { word: 'study', meaning: '勉強' }
        ];
    }
}


parseCSV(csvText) {
    const lines = csvText.trim().split('\n');

    this.words = lines.map(line => {
        const values = line.split(',');
        const word = {
            word: values[0]?.trim() || '',
            meaning: values[1]?.trim() || ''
        };

        // 学習データがなければ初期化
        if (!this.studyData[word.word]) {
            this.studyData[word.word] = {
                status: 'new',
                correctCount: 0,
                totalAttempts: 0,
                lastStudied: null
            };
        }

        return word;
    }).filter(word => word.word && word.meaning);

    this.saveStudyData();
}


    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // フラッシュカード
        document.getElementById('flashcardStart').addEventListener('click', () => this.startFlashcards());
        document.getElementById('flashcardShuffle').addEventListener('click', () => this.shuffleFlashcards());
        document.getElementById('flashcardReview').addEventListener('click', () => this.startReviewMode());
        document.getElementById('flashcard').addEventListener('click', () => this.flipCard());
        document.getElementById('cardHard').addEventListener('click', () => this.rateCard('hard'));
        document.getElementById('cardGood').addEventListener('click', () => this.rateCard('good'));
        document.getElementById('cardEasy').addEventListener('click', () => this.rateCard('easy'));
        document.getElementById('prevCard').addEventListener('click', () => this.previousCard());
        document.getElementById('nextCard').addEventListener('click', () => this.nextCard());

        // クイズ
        document.getElementById('quizStart').addEventListener('click', () => this.startQuiz());
        document.getElementById('nextQuestion').addEventListener('click', () => this.nextQuizQuestion());

        // タイピング
        document.getElementById('typingStart').addEventListener('click', () => this.startTyping());
        document.getElementById('typingInput').addEventListener('input', (e) => this.handleTypingInput(e));

        // 検索とフィルタ
        document.getElementById('searchInput').addEventListener('input', () => this.filterWords());
        document.getElementById('difficultyFilter').addEventListener('change', () => this.filterWords());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterWords());
    }

    switchTab(tabName) {
        // タブ切り替えの処理
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.remove('hidden');
        
        this.currentTab = tabName;

        // タブ固有の初期化
        if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'wordlist') {
            this.renderWordList();
        }
    }

    // ダッシュボード関連
    updateDashboard() {
        const totalWords = this.words.length;
        const masteredWords = Object.values(this.studyData).filter(data => data.status === 'mastered').length;
        const studyStreak = this.calculateStudyStreak();
        const totalScore = Object.values(this.studyData).reduce((sum, data) => sum + data.correctCount, 0);

        document.getElementById('totalWords').textContent = totalWords;
        document.getElementById('masteredWords').textContent = masteredWords;
        document.getElementById('studyStreak').textContent = studyStreak;
        document.getElementById('totalScore').textContent = totalScore;

        // プログレスバー更新
        const progressPercent = totalWords > 0 ? (masteredWords / totalWords) * 100 : 0;
        document.getElementById('overallProgress').style.width = `${progressPercent}%`;
        document.getElementById('progressText').textContent = `${Math.round(progressPercent)}% 習得済み`;
    }

    calculateStudyStreak() {
        // 簡略化された連続学習日数の計算
        const today = new Date().toDateString();
        const studiedToday = Object.values(this.studyData).some(data => 
            data.lastStudied === today
        );
        return studiedToday ? 1 : 0;
    }

    // 単語一覧関連
    renderWordList() {
        const wordGrid = document.getElementById('wordGrid');
        const filteredWords = this.getFilteredWords();
        
        wordGrid.innerHTML = '';
        
        filteredWords.forEach(word => {
            const wordCard = this.createWordCard(word);
            wordGrid.appendChild(wordCard);
        });
    }

    createWordCard(word) {
        const card = document.createElement('div');
        card.className = 'word-card';
        
        const studyInfo = this.studyData[word.word];
        const statusEmoji = this.getStatusEmoji(studyInfo.status);
        const difficultyEmoji = this.getDifficultyEmoji(word.difficulty);
        
        card.innerHTML = `
            <div class="word-status">${statusEmoji}</div>
            <div class="difficulty-indicator">${difficultyEmoji}</div>
            <div class="word-text">${word.word}</div>
            <div class="word-meaning">${word.meaning}</div>
        `;
        
        card.addEventListener('click', () => {
            this.showWordDetail(word);
        });
        
        return card;
    }

    getStatusEmoji(status) {
        const statusEmojis = {
            'new': '🆕',
            'learning': '📖',
            'mastered': '✅'
        };
        return statusEmojis[status] || '❓';
    }

    getDifficultyEmoji(difficulty) {
        const difficultyEmojis = {
            'easy': '🟢',
            'medium': '🟡',
            'hard': '🔴'
        };
        return difficultyEmojis[difficulty] || '⚪';
    }

    getFilteredWords() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const difficultyFilter = document.getElementById('difficultyFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        return this.words.filter(word => {
            const matchesSearch = word.word.toLowerCase().includes(searchTerm) || 
                                word.meaning.toLowerCase().includes(searchTerm);
            const matchesDifficulty = difficultyFilter === 'all' || word.difficulty === difficultyFilter;
            const studyInfo = this.studyData[word.word];
            const matchesStatus = statusFilter === 'all' || studyInfo.status === statusFilter;
            
            return matchesSearch && matchesDifficulty && matchesStatus;
        });
    }

    filterWords() {
        this.renderWordList();
    }

    // フラッシュカード関連
    startFlashcards() {
        this.flashcardWords = [...this.words];
        this.flashcardIndex = 0;
        this.showFlashcardArea();
        this.displayFlashcard();
    }

    shuffleFlashcards() {
        this.flashcardWords = this.shuffleArray([...this.words]);
        this.flashcardIndex = 0;
        this.displayFlashcard();
    }

    startReviewMode() {
        // 学習中や間違えた単語のみを表示
        this.flashcardWords = this.words.filter(word => {
            const studyInfo = this.studyData[word.word];
            return studyInfo.status === 'learning' || studyInfo.totalAttempts > studyInfo.correctCount;
        });
        
        if (this.flashcardWords.length === 0) {
            alert('復習する単語がありません！ 🎉');
            return;
        }
        
        this.flashcardIndex = 0;
        this.showFlashcardArea();
        this.displayFlashcard();
    }

    showFlashcardArea() {
        document.getElementById('flashcardArea').classList.remove('hidden');
        document.getElementById('flashcardArea').classList.add('fade-in');
    }

    displayFlashcard() {
        if (this.flashcardIndex >= this.flashcardWords.length) {
            this.endFlashcards();
            return;
        }

        const word = this.flashcardWords[this.flashcardIndex];
        const difficultyEmoji = this.getDifficultyEmoji(word.difficulty);
        
        document.getElementById('cardWord').textContent = word.word;
        document.getElementById('cardMeaning').textContent = word.meaning;
        document.getElementById('cardDifficulty').textContent = difficultyEmoji;
        document.getElementById('cardCounter').textContent = 
            `${this.flashcardIndex + 1} / ${this.flashcardWords.length}`;
        
        // カードをリセット
        document.getElementById('flashcard').classList.remove('flipped');
        this.isFlashcardFlipped = false;
    }

    flipCard() {
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.toggle('flipped');
        this.isFlashcardFlipped = !this.isFlashcardFlipped;
    }

    rateCard(difficulty) {
        const word = this.flashcardWords[this.flashcardIndex];
        this.updateStudyData(word.word, difficulty === 'easy' || difficulty === 'good');
        
        // 次のカードへ
        setTimeout(() => {
            this.nextCard();
        }, 500);
    }

    previousCard() {
        if (this.flashcardIndex > 0) {
            this.flashcardIndex--;
            this.displayFlashcard();
        }
    }

    nextCard() {
        this.flashcardIndex++;
        this.displayFlashcard();
    }

    endFlashcards() {
        alert('フラッシュカード完了！ お疲れ様でした！ ✨');
        document.getElementById('flashcardArea').classList.add('hidden');
        this.updateDashboard();
    }

    // クイズ関連
    startQuiz() {
        const difficulty = document.getElementById('quizDifficulty').value;
        const count = parseInt(document.getElementById('quizCount').value);
        
        // 単語をフィルタリング
        let availableWords = this.words;
        if (difficulty !== 'mixed') {
            availableWords = this.words.filter(word => word.difficulty === difficulty);
        }
        
        if (availableWords.length < 4) {
            alert('クイズに必要な単語が不足しています（最低4個必要）');
            return;
        }
        
        this.quizWords = this.shuffleArray(availableWords).slice(0, count);
        this.currentQuizIndex = 0;
        this.quizStartTime = new Date();
        this.quizAnswers = [];
        
        document.getElementById('quizArea').classList.remove('hidden');
        document.getElementById('quizArea').classList.add('fade-in');
        this.displayQuizQuestion();
    }

    displayQuizQuestion() {
        if (this.currentQuizIndex >= this.quizWords.length) {
            this.showQuizResults();
            return;
        }

        const currentWord = this.quizWords[this.currentQuizIndex];
        const options = this.generateQuizOptions(currentWord);
        
        // UI更新
        document.getElementById('questionText').textContent = `「${currentWord.word}」の意味は？`;
        document.getElementById('quizCounter').textContent = 
            `問題 ${this.currentQuizIndex + 1} / ${this.quizWords.length}`;
        
        // プログレスバー更新
        const progress = ((this.currentQuizIndex) / this.quizWords.length) * 100;
        document.getElementById('quizProgressFill').style.width = `${progress}%`;
        
        // タイマー更新（簡略化）
        this.updateQuizTimer();
        
        // 選択肢を表示
        this.displayQuizOptions(options, currentWord.meaning);
        
        // フィードバックとボタンをリセット
        document.getElementById('quizFeedback').classList.add('hidden');
        document.getElementById('nextQuestion').classList.add('hidden');
    }

    generateQuizOptions(correctWord) {
        // 正解の意味を含む4つの選択肢を生成
        const options = [correctWord.meaning];
        const otherWords = this.words.filter(word => word.word !== correctWord.word);
        
        while (options.length < 4 && otherWords.length > 0) {
            const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
            if (!options.includes(randomWord.meaning)) {
                options.push(randomWord.meaning);
            }
            otherWords.splice(otherWords.indexOf(randomWord), 1);
        }
        
        return this.shuffleArray(options);
    }

    displayQuizOptions(options, correctAnswer) {
        const optionsGrid = document.getElementById('optionsGrid');
        optionsGrid.innerHTML = '';
        
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
            button.addEventListener('click', () => this.selectQuizOption(option, correctAnswer, button));
            optionsGrid.appendChild(button);
        });
    }

    selectQuizOption(selectedAnswer, correctAnswer, buttonElement) {
        const isCorrect = selectedAnswer === correctAnswer;
        const currentWord = this.quizWords[this.currentQuizIndex];
        
        // 答えを記録
        this.quizAnswers.push({
            word: currentWord.word,
            correct: isCorrect,
            selectedAnswer,
            correctAnswer
        });
        
        // 学習データ更新
        this.updateStudyData(currentWord.word, isCorrect);
        
        // ボタンの色を変更
        const allButtons = document.querySelectorAll('.option-btn');
        allButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.includes(correctAnswer)) {
                btn.classList.add('correct');
            } else if (btn === buttonElement && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });
        
        // フィードバック表示
        this.showQuizFeedback(isCorrect, correctAnswer);
        
        // 次の問題ボタンを表示
        document.getElementById('nextQuestion').classList.remove('hidden');
    }

    showQuizFeedback(isCorrect, correctAnswer) {
        const feedback = document.getElementById('quizFeedback');
        feedback.classList.remove('hidden', 'correct', 'incorrect');
        
        if (isCorrect) {
            feedback.classList.add('correct');
            feedback.innerHTML = '🎉 正解です！ 素晴らしい！';
        } else {
            feedback.classList.add('incorrect');
            feedback.innerHTML = `❌ 不正解です。正解は「${correctAnswer}」でした。`;
        }
        
        feedback.classList.add('bounce-in');
    }

    nextQuizQuestion() {
        this.currentQuizIndex++;
        this.displayQuizQuestion();
    }

    updateQuizTimer() {
        if (!this.quizStartTime) return;
        
        const elapsed = Math.floor((new Date() - this.quizStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('quizTimer').textContent = 
            `⏰ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    showQuizResults() {
        document.getElementById('quizArea').classList.add('hidden');
        
        const correctAnswers = this.quizAnswers.filter(answer => answer.correct).length;
        const totalQuestions = this.quizAnswers.length;
        const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
        const totalTime = Math.floor((new Date() - this.quizStartTime) / 1000);
        
        let resultMessage = '';
        if (accuracy >= 90) resultMessage = '🌟 完璧です！';
        else if (accuracy >= 70) resultMessage = '🎉 よくできました！';
        else if (accuracy >= 50) resultMessage = '👍 まずまずです！';
        else resultMessage = '💪 もう少し頑張りましょう！';
        
        document.getElementById('quizResults').innerHTML = `
            <div class="results-score">${accuracy}%</div>
            <h2>${resultMessage}</h2>
            <div class="results-stats">
                <div class="results-stat">
                    <div class="results-stat-number">${correctAnswers}</div>
                    <div class="results-stat-label">正解数</div>
                </div>
                <div class="results-stat">
                    <div class="results-stat-number">${totalQuestions}</div>
                    <div class="results-stat-label">総問題数</div>
                </div>
                <div class="results-stat">
                    <div class="results-stat-number">${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}</div>
                    <div class="results-stat-label">所要時間</div>
                </div>
            </div>
            <div style="margin-top: 2rem;">
                <button class="action-btn primary" onclick="location.reload()">🔄 もう一度</button>
                <button class="action-btn secondary" onclick="switchTab('dashboard')">📊 ダッシュボードへ</button>
            </div>
        `;
        
        document.getElementById('quizResults').classList.remove('hidden');
        document.getElementById('quizResults').classList.add('fade-in');
        
        this.updateDashboard();
    }

    // タイピング関連
    startTyping() {
        const mode = document.getElementById('typingMode').value;
        this.typingWords = this.shuffleArray([...this.words]).slice(0, 20);
        this.currentTypingIndex = 0;
        this.typingStartTime = new Date();
        this.typingStats = { correct: 0, total: 0, wpm: 0 };
        
        document.getElementById('typingArea').classList.remove('hidden');
        document.getElementById('typingArea').classList.add('fade-in');
        
        this.displayTypingPrompt();
        this.startTypingTimer();
    }

    displayTypingPrompt() {
        if (this.currentTypingIndex >= this.typingWords.length) {
            this.endTyping();
            return;
        }

        const currentWord = this.typingWords[this.currentTypingIndex];
        const mode = document.getElementById('typingMode').value;
        const prompt = mode === 'word' ? currentWord.word : currentWord.meaning;
        
        document.getElementById('typingPrompt').textContent = prompt;
        document.getElementById('typingInput').value = '';
        document.getElementById('typingInput').focus();
    }


            handleTypingInput(event) {
        const input = event.target.value.trim();
        const currentWord = this.typingWords[this.currentTypingIndex];
        const mode = document.getElementById('typingMode').value;
        const target = mode === 'word' ? currentWord.word : currentWord.meaning;

        if (input.toLowerCase() === target.toLowerCase()) {
            this.typingStats.correct++;
            this.updateStudyData(currentWord.word, true);
            this.currentTypingIndex++;
            this.displayTypingPrompt();
        }
        this.typingStats.total++;
    }

    endTyping() {
        const totalTime = (new Date() - this.typingStartTime) / 1000 / 60; // 分
        const wpm = Math.round(this.typingStats.correct / totalTime);
        this.typingStats.wpm = wpm;

        document.getElementById('typingArea').classList.add('hidden');
        document.getElementById('typingResults').innerHTML = `
            <h2>タイピング結果</h2>
            <p>正解数: ${this.typingStats.correct}</p>
            <p>総入力: ${this.typingStats.total}</p>
            <p>WPM: ${this.typingStats.wpm}</p>
            <button class="action-btn primary" onclick="location.reload()">🔄 もう一度</button>
            <button class="action-btn secondary" onclick="app.switchTab('dashboard')">📊 ダッシュボードへ</button>
        `;
        document.getElementById('typingResults').classList.remove('hidden');
        this.updateDashboard();
    }

    startTypingTimer() {
        const timerEl = document.getElementById('typingTimer');
        const startTime = this.typingStartTime;
        const timerInterval = setInterval(() => {
            if (this.currentTypingIndex >= this.typingWords.length) {
                clearInterval(timerInterval);
                return;
            }
            const elapsed = Math.floor((new Date() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerEl.textContent = `⏰ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    // 学習データ更新
    updateStudyData(word, isCorrect) {
        if (!this.studyData[word]) {
            this.studyData[word] = {
                status: 'new',
                correctCount: 0,
                totalAttempts: 0,
                lastStudied: null,
                difficultyLevel: 'medium'
            };
        }
        const data = this.studyData[word];
        data.totalAttempts++;
        if (isCorrect) {
            data.correctCount++;
        }
        data.lastStudied = new Date().toDateString();

        // ステータス更新ロジック
        if (data.correctCount >= 3) {
            data.status = 'mastered';
        } else if (data.correctCount > 0) {
            data.status = 'learning';
        } else {
            data.status = 'new';
        }

        this.saveStudyData();
    }

    loadStudyData() {
        const saved = localStorage.getItem('studyData');
        return saved ? JSON.parse(saved) : {};
    }

    saveStudyData() {
        localStorage.setItem('studyData', JSON.stringify(this.studyData));
    }

    // 配列シャッフル
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 単語詳細表示
    showWordDetail(word) {
        const studyInfo = this.studyData[word.word] || {};
        const detailArea = document.getElementById('wordDetail');
        detailArea.innerHTML = `
            <h2>${word.word}</h2>
            <p>意味: ${word.meaning}</p>
            <p>難易度: ${word.difficulty}</p>
            <p>ステータス: ${studyInfo.status || 'new'}</p>
            <p>正解数: ${studyInfo.correctCount || 0}</p>
            <p>総試行数: ${studyInfo.totalAttempts || 0}</p>
            <button class="action-btn" onclick="app.switchTab('wordlist')">戻る</button>
        `;
        this.switchTab('wordDetailTab');
    }

}
