// In playWComp.js

window.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tiles = Array.from(document.querySelectorAll('.tile'));
    const display = document.querySelector('.display');
    const resetButton = document.querySelector('#reset');
    const announcer = document.querySelector('.announcer');

    // --- Game State Variables ---
    let board = ['', '', '', '', '', '', '', '', ''];
    const computerPlayer = 'X';
    const humanPlayer = 'O';
    let currentPlayer = computerPlayer; // Computer starts
    let isGameActive = true;

    // --- Winning Conditions ---
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // --- Functions ---

    function handleResultValidation() {
        let roundWon = false;
        for (let i = 0; i < winningConditions.length; i++) {
            const [aIdx, bIdx, cIdx] = winningConditions[i];
            const a = board[aIdx], b = board[bIdx], c = board[cIdx];
            
            if (a && a === b && b === c) {
                roundWon = true;
                break;
            }
        }

        if (roundWon) {
            announce(currentPlayer === humanPlayer ? 'PLAYER_O_WINS' : 'PLAYER_X_WINS');
            isGameActive = false;
            return;
        }

        if (!board.includes('')) {
            announce('TIE');
            isGameActive = false;
        }
    }

    const announce = (type) => {
        switch (type) {
            case 'PLAYER_O_WINS':
                announcer.innerHTML = 'You Won! (<span class="playerO">O</span>)';
                break;
            case 'PLAYER_X_WINS':
                announcer.innerHTML = 'Computer Won (<span class="playerX">X</span>)';
                break;
            case 'TIE':
                announcer.innerText = 'Tie';
        }
        announcer.classList.remove('hide');
    };

    const isValidAction = (tile) => {
        return tile.innerText === '' && board[tiles.indexOf(tile)] === '';
    };
    
    const updateBoard = (index) => {
        board[index] = currentPlayer;
    }

    const updateDisplay = () => {
        if (currentPlayer === humanPlayer) {
            display.innerHTML = 'Your Turn (<span class="playerO">O</span>)';
        } else {
            display.innerHTML = "Computer's Turn (<span class='playerX'>X</span>)";
        }
    }

    const changePlayer = () => {
        currentPlayer = currentPlayer === humanPlayer ? computerPlayer : humanPlayer;
        updateDisplay();
    }

    // --- Minimax AI ---
    const minimax = (newBoard, player) => {
        const availSpots = newBoard
            .map((val, idx) => val === '' ? idx : null)
            .filter(v => v !== null);

        // --- Check for terminal states ---
        const checkWin = (brd, pl) => {
            return winningConditions.some(cond =>
                cond.every(idx => brd[idx] === pl)
            );
        };

        if (checkWin(newBoard, humanPlayer)) return { score: -10 };
        if (checkWin(newBoard, computerPlayer)) return { score: 10 };
        if (availSpots.length === 0) return { score: 0 };

        // --- Collect moves and scores ---
        const moves = [];

        for (let i = 0; i < availSpots.length; i++) {
            const idx = availSpots[i];
            const move = {};
            move.index = idx;

            newBoard[idx] = player;

            if (player === computerPlayer) {
                const result = minimax(newBoard, humanPlayer);
                move.score = result.score;
            } else {
                const result = minimax(newBoard, computerPlayer);
                move.score = result.score;
            }

            newBoard[idx] = ''; // reset
            moves.push(move);
        }

        // --- Choose best move depending on player ---
        let bestMove;
        if (player === computerPlayer) {
            let bestScore = -Infinity;
            moves.forEach((mv, i) => {
                if (mv.score > bestScore) {
                    bestScore = mv.score;
                    bestMove = i;
                }
            });
        } else {
            let bestScore = Infinity;
            moves.forEach((mv, i) => {
                if (mv.score < bestScore) {
                    bestScore = mv.score;
                    bestMove = i;
                }
            });
        }

        return moves[bestMove];
    };

    const computerMove = () => {
        if (!isGameActive) return;

        const bestSpot = minimax(board.slice(), computerPlayer).index;
        const tile = tiles[bestSpot];

        tile.innerText = currentPlayer;
        tile.classList.add(`player${currentPlayer}`);
        updateBoard(bestSpot);
        handleResultValidation();

        if (isGameActive) {
            changePlayer();
        }
    }

    const userAction = (tile, index) => {
        if (isValidAction(tile) && isGameActive && currentPlayer === humanPlayer) {
            tile.innerText = currentPlayer;
            tile.classList.add(`player${currentPlayer}`);
            updateBoard(index);
            handleResultValidation();
            
            if (isGameActive) {
                changePlayer();
                setTimeout(computerMove, 400); 
            }
        }
    }

    const resetBoard = () => {
        board = ['', '', '', '', '', '', '', '', ''];
        isGameActive = true;
        announcer.classList.add('hide');
        announcer.innerText = '';
        currentPlayer = computerPlayer;

        tiles.forEach(tile => {
            tile.innerText = '';
            tile.classList.remove('playerX');
            tile.classList.remove('playerO');
        });

        updateDisplay();
        setTimeout(computerMove, 400);
    }

    // --- Event Listeners ---
    tiles.forEach((tile, index) => {
        tile.addEventListener('click', () => userAction(tile, index));
    });

    resetButton.addEventListener('click', resetBoard);

    // --- Initial Game Start ---
    updateDisplay();
    setTimeout(computerMove, 400);
});
