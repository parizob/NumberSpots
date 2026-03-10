// Number Spots Game Logic

// Fun facts dictionary - hint and 4-digit answer
const PUZZLES = [
    { hint: "Columbus sailed the ocean blue", answer: "1492" },
    { hint: "Googol = X followed by X zeros", answer: "1100" },
    { hint: "Iron's boiling point (F)", answer: "5182" },
    { hint: "Mt. Olympus height (Meters)", answer: "2917" },
    { hint: "Minutes in a day", answer: "1440" },
    { hint: "Total hours in a year", answer: "8760" },
    { hint: "Sun's surface temperature (F)", answer: "8540" },
    { hint: "Perfect number (4-digit)", answer: "8128" }
];

class NumberSpots {
    constructor() {
        this.secretCode = [];
        this.currentHint = '';
        this.currentRow = 0;
        this.currentCol = 0;
        this.maxRows = 6;
        this.gameOver = false;
        this.isRevealing = false;
        this.hasStartedGame = false;
        this.flipDuration = 400;
        
        // Session stats
        this.stats = {
            wins: [0, 0, 0, 0, 0, 0],
            fails: 0,
            totalPlayed: 0,
            currentStreak: 0
        };
        
        this.initElements();
        this.initBoard();
        this.initEventListeners();
        this.updateAllStatsDisplays();
        this.newGame();
    }
    
    initElements() {
        this.gameBoard = document.getElementById('gameBoard');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.gameMessage = document.getElementById('gameMessage');
        this.gameHint = document.getElementById('gameHint');
        
        // Game end modal
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalCode = document.getElementById('modalCode');
        this.modalBtn = document.getElementById('modalBtn');
        
        // Stats modal
        this.statsModal = document.getElementById('statsModal');
        this.statsBtn = document.getElementById('statsBtn');
        this.statsCloseBtn = document.getElementById('statsCloseBtn');
        
        // Confirm modal
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmCancelBtn = document.getElementById('confirmCancelBtn');
        this.confirmYesBtn = document.getElementById('confirmYesBtn');
    }
    
    initBoard() {
        this.gameBoard.innerHTML = '';
        
        for (let row = 0; row < this.maxRows; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'guess-row';
            rowElement.dataset.row = row;
            
            for (let col = 0; col < 4; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Inner container for flip
                const cellInner = document.createElement('div');
                cellInner.className = 'cell-inner';
                
                // Front of card (input)
                const cellFront = document.createElement('div');
                cellFront.className = 'cell-front';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'cell-input';
                input.maxLength = 1;
                input.inputMode = 'numeric';
                input.pattern = '[0-9]';
                input.autocomplete = 'off';
                input.dataset.row = row;
                input.dataset.col = col;
                input.disabled = row !== 0;
                
                cellFront.appendChild(input);
                
                // Back of card (revealed state)
                const cellBack = document.createElement('div');
                cellBack.className = 'cell-back';
                
                const indicatorAbove = document.createElement('span');
                indicatorAbove.className = 'indicator-above';
                
                const backNumber = document.createElement('span');
                backNumber.className = 'back-number';
                
                const indicatorBelow = document.createElement('span');
                indicatorBelow.className = 'indicator-below';
                
                cellBack.appendChild(indicatorAbove);
                cellBack.appendChild(backNumber);
                cellBack.appendChild(indicatorBelow);
                
                cellInner.appendChild(cellFront);
                cellInner.appendChild(cellBack);
                cell.appendChild(cellInner);
                rowElement.appendChild(cell);
            }
            
            this.gameBoard.appendChild(rowElement);
        }
    }
    
    initEventListeners() {
        // Custom keyboard clicks
        const keyboard = document.getElementById('keyboard');
        keyboard.addEventListener('click', (e) => {
            e.preventDefault();
            const key = e.target.closest('.key');
            if (key && key.dataset.key) {
                this.handleKeyPress(key.dataset.key);
            }
        });
        
        // Physical keyboard for desktop
        document.addEventListener('keydown', (e) => {
            // Ignore if modal is open or typing in another input
            if (document.querySelector('.modal.show')) return;
            
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                this.handleKeyPress(e.key);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.handleKeyPress('Enter');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this.handleKeyPress('Backspace');
            }
        });
        
        // Click on cell to set cursor position
        this.gameBoard.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell && !this.gameOver && !this.isRevealing) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                if (row === this.currentRow) {
                    this.currentCol = col;
                    this.updateCellStates();
                }
            }
        });
        
        this.modalBtn.addEventListener('click', () => {
            this.hideModal();
            this.newGame();
        });
        
        // Stats modal
        this.statsBtn.addEventListener('click', () => this.showStatsModal());
        this.statsCloseBtn.addEventListener('click', () => this.hideStatsModal());
        
        // Help modal for mobile
        const helpBtn = document.getElementById('helpBtn');
        const helpModal = document.getElementById('helpModal');
        const helpCloseBtn = document.getElementById('helpCloseBtn');
        
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            helpModal.classList.add('show');
        });
        
        helpCloseBtn.addEventListener('click', () => {
            helpModal.classList.remove('show');
            // Mark that user has seen the help
            localStorage.setItem('numberSpotsHelpSeen', 'true');
        });
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.classList.remove('show');
                localStorage.setItem('numberSpotsHelpSeen', 'true');
            }
        });
        
        // Show help modal on first visit
        if (!localStorage.getItem('numberSpotsHelpSeen')) {
            helpModal.classList.add('show');
        }
        
        // Confirm modal
        this.confirmCancelBtn.addEventListener('click', () => this.hideConfirmModal());
        this.confirmYesBtn.addEventListener('click', () => {
            this.hideConfirmModal();
            this.recordFail();
            this.newGame();
        });
        
        // Close modals on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        this.statsModal.addEventListener('click', (e) => {
            if (e.target === this.statsModal) {
                this.hideStatsModal();
            }
        });
        
        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) {
                this.hideConfirmModal();
            }
        });
    }
    
    handleNewGameClick() {
        if (this.hasStartedGame && !this.gameOver) {
            this.showConfirmModal();
        } else {
            this.newGame();
        }
    }
    
    handleKeyPress(key) {
        if (key === 'NewGame') {
            this.handleNewGameClick();
            return;
        }
        
        if (this.gameOver || this.isRevealing) return;
        
        if (key === 'Enter') {
            this.submitGuess();
            return;
        }
        
        if (key === 'Backspace') {
            const input = this.getInput(this.currentRow, this.currentCol);
            if (input && input.value) {
                input.value = '';
            } else if (this.currentCol > 0) {
                this.currentCol--;
                const prevInput = this.getInput(this.currentRow, this.currentCol);
                if (prevInput) {
                    prevInput.value = '';
                }
            }
            this.updateCellStates();
            return;
        }
        
        // Number key
        if (key >= '0' && key <= '9') {
            const input = this.getInput(this.currentRow, this.currentCol);
            if (input) {
                input.value = key;
                
                // Pulse animation
                const cell = this.getCell(this.currentRow, this.currentCol);
                if (cell) {
                    cell.classList.add('pulse');
                    setTimeout(() => cell.classList.remove('pulse'), 300);
                }
                
                // Move to next cell (but don't auto-submit)
                if (this.currentCol < 3) {
                    this.currentCol++;
                }
                this.updateCellStates();
            }
        }
    }
    
    updateCellStates() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('current', 'active');
        });
        
        const currentRowCells = document.querySelectorAll(`.cell[data-row="${this.currentRow}"]`);
        currentRowCells.forEach((cell, index) => {
            cell.classList.add('active');
            if (index === this.currentCol) {
                cell.classList.add('current');
            }
        });
    }
    
    getInput(row, col) {
        return document.querySelector(`.cell-input[data-row="${row}"][data-col="${col}"]`);
    }
    
    getCell(row, col) {
        return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    }
    
    selectPuzzle() {
        const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        this.currentHint = puzzle.hint;
        this.secretCode = puzzle.answer.split('').map(d => parseInt(d, 10));
        this.gameHint.textContent = `"${this.currentHint}"`;
        console.log('Secret code:', this.secretCode.join(''));
    }
    
    newGame() {
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameOver = false;
        this.isRevealing = false;
        this.hasStartedGame = false;
        
        this.selectPuzzle();
        this.initBoard();
        this.gameMessage.textContent = '';
        this.gameMessage.className = 'game-message';
        
        this.updateCellStates();
    }
    
    getGuess() {
        const guess = [];
        for (let col = 0; col < 4; col++) {
            const input = this.getInput(this.currentRow, col);
            const value = input?.value.trim();
            if (value === '' || !/^\d$/.test(value)) {
                return null;
            }
            guess.push(parseInt(value, 10));
        }
        return guess;
    }
    
    evaluateGuess(guess) {
        const results = [];
        const secretCopy = [...this.secretCode];
        const guessCopy = [...guess];
        
        for (let i = 0; i < 4; i++) {
            if (guess[i] === this.secretCode[i]) {
                results[i] = { type: 'correct', showAbove: false, showBelow: false };
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }
        
        for (let i = 0; i < 4; i++) {
            if (results[i]) continue;
            
            const secretIndex = secretCopy.findIndex(n => n === guess[i]);
            
            if (secretIndex !== -1) {
                secretCopy[secretIndex] = null;
                
                let arrowType = null;
                let arrowIndicator = null;
                if (guess[i] < this.secretCode[i]) {
                    arrowType = 'higher';
                    arrowIndicator = '↑';
                } else if (guess[i] > this.secretCode[i]) {
                    arrowType = 'lower';
                    arrowIndicator = '↓';
                }
                
                results[i] = { 
                    type: 'wrong-spot', 
                    showAbove: true, 
                    aboveIndicator: '◇',
                    showBelow: arrowType !== null,
                    belowIndicator: arrowIndicator,
                    arrowType: arrowType
                };
            } else {
                if (guess[i] < this.secretCode[i]) {
                    results[i] = { 
                        type: 'higher', 
                        showAbove: false, 
                        showBelow: true, 
                        belowIndicator: '↑',
                        arrowType: 'higher'
                    };
                } else {
                    results[i] = { 
                        type: 'lower', 
                        showAbove: false, 
                        showBelow: true, 
                        belowIndicator: '↓',
                        arrowType: 'lower'
                    };
                }
            }
        }
        
        return results;
    }
    
    async submitGuess() {
        if (this.gameOver || this.isRevealing) return;
        
        const guess = this.getGuess();
        
        if (!guess) {
            this.showMessage('Enter all 4 digits', 'error');
            this.shakeRow();
            return;
        }
        
        this.isRevealing = true;
        this.hasStartedGame = true;
        
        for (let col = 0; col < 4; col++) {
            const input = this.getInput(this.currentRow, col);
            if (input) input.disabled = true;
        }
        
        const results = this.evaluateGuess(guess);
        
        for (let i = 0; i < 4; i++) {
            await this.revealCell(i, guess[i], results[i]);
        }
        
        const isWin = results.every(r => r.type === 'correct');
        
        if (isWin) {
            this.gameOver = true;
            this.recordWin(this.currentRow + 1);
            this.celebrateWin();
            await this.delay(600);
            this.showWinModal();
        } else {
            this.currentRow++;
            
            if (this.currentRow >= this.maxRows) {
                this.gameOver = true;
                this.recordFail();
                await this.delay(200);
                this.showLoseModal();
            } else {
                for (let col = 0; col < 4; col++) {
                    const input = this.getInput(this.currentRow, col);
                    if (input) input.disabled = false;
                }
                
                this.currentCol = 0;
                this.updateCellStates();
                
                this.showMessage(`${this.maxRows - this.currentRow} guesses remaining`, '');
            }
        }
        
        this.isRevealing = false;
    }
    
    revealCell(colIndex, guessedNumber, result) {
        return new Promise(resolve => {
            const cell = this.getCell(this.currentRow, colIndex);
            const backNumber = cell.querySelector('.back-number');
            const indicatorAbove = cell.querySelector('.cell-back .indicator-above');
            const indicatorBelow = cell.querySelector('.cell-back .indicator-below');
            
            // Set up the back content before flipping
            backNumber.textContent = guessedNumber;
            
            if (result.showAbove) {
                indicatorAbove.textContent = result.aboveIndicator;
            }
            if (result.showBelow && result.belowIndicator) {
                indicatorBelow.textContent = result.belowIndicator;
            }
            
            // Apply result classes to cell (affects back styling)
            if (result.type === 'correct') {
                cell.classList.add('correct');
            }
            if (result.arrowType) {
                cell.classList.add(result.arrowType);
            }
            
            // Trigger the flip
            cell.classList.add('flipping');
            cell.classList.remove('active', 'current');
            
            // Resolve when flip completes
            setTimeout(resolve, this.flipDuration);
        });
    }
    
    celebrateWin() {
        for (let col = 0; col < 4; col++) {
            const cell = this.getCell(this.currentRow, col);
            setTimeout(() => {
                cell.classList.add('celebrate');
            }, col * 100);
        }
    }
    
    recordWin(guessCount) {
        this.stats.wins[guessCount - 1]++;
        this.stats.totalPlayed++;
        this.stats.currentStreak++;
        this.updateAllStatsDisplays();
    }
    
    recordFail() {
        this.stats.fails++;
        this.stats.totalPlayed++;
        this.stats.currentStreak = 0;
        this.updateAllStatsDisplays();
    }
    
    updateAllStatsDisplays() {
        this.updateStatsDisplay('');
        this.updateStatsDisplay('end');
    }
    
    updateStatsDisplay(prefix) {
        const winCount = this.stats.wins.reduce((a, b) => a + b, 0);
        const winRate = this.stats.totalPlayed > 0 
            ? Math.round((winCount / this.stats.totalPlayed) * 100) 
            : 0;
        
        const playedEl = document.getElementById(`${prefix}StatPlayed`);
        const winPctEl = document.getElementById(`${prefix}StatWinPct`);
        const streakEl = document.getElementById(`${prefix}StatStreak`);
        
        if (playedEl) playedEl.textContent = this.stats.totalPlayed;
        if (winPctEl) winPctEl.textContent = winRate;
        if (streakEl) streakEl.textContent = this.stats.currentStreak;
        
        const maxWins = Math.max(...this.stats.wins, 1);
        
        for (let i = 0; i < 6; i++) {
            const bar = document.getElementById(`${prefix}Bar${i + 1}`);
            const count = document.getElementById(`${prefix}Count${i + 1}`);
            const wins = this.stats.wins[i];
            
            if (count) count.textContent = wins;
            
            if (bar) {
                if (wins > 0) {
                    const percentage = (wins / maxWins) * 100;
                    bar.style.width = `${percentage}%`;
                    bar.classList.add('has-value');
                } else {
                    bar.style.width = '0%';
                    bar.classList.remove('has-value');
                }
            }
        }
        
        const failCountEl = document.getElementById(`${prefix}FailCount`);
        if (failCountEl) failCountEl.textContent = this.stats.fails;
    }
    
    showMessage(message, type) {
        this.gameMessage.textContent = message;
        this.gameMessage.className = `game-message ${type}`;
    }
    
    shakeRow() {
        const row = document.querySelector(`[data-row="${this.currentRow}"].guess-row`);
        if (row) {
            row.classList.add('shake');
            setTimeout(() => {
                row.classList.remove('shake');
            }, 300);
        }
    }
    
    showConfirmModal() {
        this.confirmModal.classList.add('show');
    }
    
    hideConfirmModal() {
        this.confirmModal.classList.remove('show');
    }
    
    showStatsModal() {
        this.updateStatsDisplay('');
        this.statsModal.classList.add('show');
    }
    
    hideStatsModal() {
        this.statsModal.classList.remove('show');
    }
    
    showWinModal() {
        this.modalTitle.textContent = 'BRILLIANT!';
        this.modalTitle.className = 'win';
        this.modalMessage.textContent = `You cracked the code in ${this.currentRow + 1} ${this.currentRow === 0 ? 'guess' : 'guesses'}!`;
        document.getElementById('modalHint').textContent = `"${this.currentHint}"`;
        this.updateModalCode();
        this.updateStatsDisplay('end');
        this.highlightWinningBar(this.currentRow + 1);
        this.modal.classList.add('show');
    }
    
    showLoseModal() {
        this.modalTitle.textContent = 'GAME OVER';
        this.modalTitle.className = 'lose';
        this.modalMessage.textContent = 'The code was:';
        document.getElementById('modalHint').textContent = `"${this.currentHint}"`;
        this.updateModalCode();
        this.updateStatsDisplay('end');
        this.modal.classList.add('show');
    }
    
    highlightWinningBar(guessCount) {
        document.querySelectorAll('.bar-fill.highlight').forEach(el => {
            el.classList.remove('highlight');
        });
        
        const bar = document.getElementById(`endBar${guessCount}`);
        if (bar) {
            bar.classList.add('highlight');
        }
    }
    
    updateModalCode() {
        this.modalCode.innerHTML = '';
        this.secretCode.forEach(digit => {
            const span = document.createElement('span');
            span.textContent = digit;
            this.modalCode.appendChild(span);
        });
    }
    
    hideModal() {
        this.modal.classList.remove('show');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NumberSpots();
});
