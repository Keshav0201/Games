// --- DOM Element References ---
const userDisplayNameNav = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const dashboardContent = document.querySelector('.dashboard-content');
const homeLink = document.getElementById('home-link');
const playOnlineLink = document.getElementById('play-online-link');
const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const sidebar = document.getElementById('sidebar');

// --- Global variables ---
let currentUser = null;
let isGameActive = false;

// --- Event Listeners for UI ---
menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

sidebar.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && e.target.tagName === 'A') {
        sidebar.classList.remove('active');
    }
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    renderDashboardHome();
    setActiveSidebarLink(homeLink);
  } else {
    currentUser = null;
    window.location.href = "auth.html";
  }
});

logoutBtn.addEventListener("click", () => {
  if (isGameActive) {
    alert("Please complete the current game before logging out.");
    return;
  }
  auth.signOut().then(() => window.location.href = "index.html")
    .catch((error) => console.error("Logout failed:", error));
});

playOnlineLink.addEventListener("click", (e) => {
  e.preventDefault();
  if (isGameActive) {
    alert("Please complete the current game to start a new one.");
    return;
  }
  setActiveSidebarLink(playOnlineLink);
  renderLobbyView();
});

homeLink.addEventListener("click", (e) => {
  e.preventDefault();
  if (isGameActive) {
    alert("Please complete the current game before returning to the dashboard home.");
    return;
  }
  setActiveSidebarLink(homeLink);
  renderDashboardHome();
});


// --- View Rendering and State Management ---

function setActiveSidebarLink(activeLink) {
  sidebarLinks.forEach((link) => link.classList.remove("active"));
  if (activeLink) activeLink.classList.add("active");
}

function renderDashboardHome() {
  isGameActive = false;
  userDisplayNameNav.textContent = `Welcome, ${currentUser.displayName}!`;
  dashboardContent.innerHTML = `
        <h1>Welcome, <span id="welcome-user-name">${currentUser.displayName}</span>!</h1>
        <p class="subtitle">Select an option from the sidebar to get started.</p>
        <div class="stats-container">
            <div class="stat-card"><h2>Games Played</h2><p id="games-played">0</p></div>
            <div class="stat-card"><h2>Games Won</h2><p id="games-won">0</p></div>
            <div class="stat-card"><h2>Winning %</h2><p id="win-percentage">0%</p></div>
        </div>
    `;
  fetchAndDisplayStats(currentUser.uid);
}

function fetchAndDisplayStats(uid) {
  db.collection("users").doc(uid).get().then((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        const gamesPlayed = userData.gamesPlayed || 0;
        const gamesWon = userData.gamesWon || 0;
        let winPercentage = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : 0;
        document.getElementById("games-played").textContent = gamesPlayed;
        document.getElementById("games-won").textContent = gamesWon;
        document.getElementById("win-percentage").textContent = `${winPercentage}%`;
      }
    }).catch((error) => console.log("Error getting user stats:", error));
}

function renderLobbyView() {
  isGameActive = false;
  dashboardContent.innerHTML = `
        <div class="hero-container">
            <h1>Play Online</h1>
            <p class="subtitle">Create a new game or join one using a game ID.</p>
            <div class="button-container">
                <button id="make-game-btn" class="btn btn-primary">Make Game</button>
                <button id="join-game-btn" class="btn btn-secondary">Join Game</button>
            </div>
        </div>
    `;
  document.getElementById("make-game-btn").addEventListener("click", handleMakeGame);
  document.getElementById("join-game-btn").addEventListener("click", renderJoinGamePrompt);
}

function renderJoinGamePrompt() {
  dashboardContent.innerHTML = `
        <div class="hero-container">
            <h1>Join Game</h1>
            <p class="subtitle">Enter the 6-digit game ID from your friend.</p>
            <form id="join-form" class="join-form">
                <input type="text" id="game-id-input" placeholder="123456" maxlength="6" required>
                <button type="submit" class="btn btn-primary">Join Game</button>
            </form>
        </div>
    `;
  document.getElementById("join-form").addEventListener("submit", handleJoinGame);
}


// --- Game Creation and Joining Logic ---

async function handleMakeGame() {
  let gameId;
  let gameRef;
  let docExists = true;
  while (docExists) {
    gameId = Math.floor(100000 + Math.random() * 900000).toString();
    gameRef = db.collection("games").doc(gameId);
    const doc = await gameRef.get();
    if (!doc.exists) {
      docExists = false;
    } else {
      console.log(`Game ID ${gameId} already exists. Generating a new one.`);
    }
  }
  const newGame = {
    player1Id: currentUser.uid, player1Name: currentUser.displayName, player2Id: null, player2Name: null,
    player1Wins: 0, player2Wins: 0, p1StatsUpdated: false, p2StatsUpdated: false,
    board: ["", "", "", "", "", "", "", "", ""],
    currentPlayer: "X", status: "waiting", winner: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  await gameRef.set(newGame);
  enterGame(gameId);
}

async function handleJoinGame(e) {
  e.preventDefault();
  const gameId = document.getElementById("game-id-input").value;
  if (!gameId) return;
  const gameRef = db.collection("games").doc(gameId);
  const doc = await gameRef.get();
  if (!doc.exists) {
    alert("Game not found! Please check the ID.");
    return;
  }
  const gameData = doc.data();
  if (gameData.player2Id) {
    alert("This game is already full.");
    return;
  }
  await gameRef.update({
    player2Id: currentUser.uid,
    player2Name: currentUser.displayName,
    status: "active",
  });
  enterGame(gameId);
}


// --- Main Game Function ---

function enterGame(gameId) {
    isGameActive = true;
    dashboardContent.innerHTML = `
        <div class="game-wrapper">
            <div class="scoreboard">
                <div class="score playerX"><span id="p1-name">Player 1</span>: <span id="p1-score">0</span></div>
                <div class="score playerO"><span id="p2-name">Player 2</span>: <span id="p2-score">0</span></div>
            </div>
            <h2 id="game-status-display">Loading game...</h2>
            <p>Game ID: <strong>${gameId}</strong> (Share this with a friend!)</p>
            <section class="container" id="game-board">
                ${[...Array(9)].map((_, i) => `<div class="tile" data-index="${i}"></div>`).join('')}
            </section>
            <div class="permanent-controls">
                <button id="reset-round-btn" class="btn btn-reset">Reset Round</button>
                <button id="delete-game-btn" class="btn btn-secondary" style="display: none;">Delete Game</button>
            </div>
        </div>
    `;

    const gameBoard = document.getElementById('game-board');
    const gameStatusDisplay = document.getElementById('game-status-display');
    const p1NameDisplay = document.getElementById('p1-name');
    const p1ScoreDisplay = document.getElementById('p1-score');
    const p2NameDisplay = document.getElementById('p2-name');
    const p2ScoreDisplay = document.getElementById('p2-score');
    const resetRoundBtn = document.getElementById('reset-round-btn');
    const deleteGameBtn = document.getElementById('delete-game-btn');
    const gameRef = db.collection('games').doc(gameId);
    let mySymbol = '';

    function checkWinner(board) {
        const winningConditions = [ [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6] ];
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return { status: 'finished', winner: board[a] };
        }
        if (!board.includes('')) return { status: 'finished', winner: 'Tie' };
        return null;
    }

    async function handleTileClick(index, currentData) {
        if (currentData.status !== 'active' || currentData.board[index] !== '' || currentData.currentPlayer !== mySymbol) return;
        
        const newBoard = [...currentData.board];
        newBoard[index] = mySymbol;
        const nextPlayer = mySymbol === 'X' ? 'O' : 'X';
        let updateData = { board: newBoard, currentPlayer: nextPlayer };

        const result = checkWinner(newBoard);
        if (result) {
            updateData.status = result.status;
            updateData.winner = result.winner;
            if (result.winner === 'X') updateData.player1Wins = firebase.firestore.FieldValue.increment(1);
            else if (result.winner === 'O') updateData.player2Wins = firebase.firestore.FieldValue.increment(1);
        }
        await gameRef.update(updateData);
    }
    
    function handleGameFinish(gameData) {
        if (!gameData || !currentUser) return;

        const amIPlayer1 = currentUser.uid === gameData.player1Id;
        const amIPlayer2 = currentUser.uid === gameData.player2Id;
        const myStatsAlreadyUpdated = (amIPlayer1 && gameData.p1StatsUpdated) || (amIPlayer2 && gameData.p2StatsUpdated);

        if (gameData.status === 'finished' && !myStatsAlreadyUpdated) {
            // UPDATED: Disable buttons while processing stats
            resetRoundBtn.disabled = true;
            deleteGameBtn.disabled = true;

            const userStatsRef = db.collection('users').doc(currentUser.uid);
            const gameUpdate = {};
            const userStatsUpdate = { gamesPlayed: firebase.firestore.FieldValue.increment(1) };
            if ((amIPlayer1 && gameData.winner === 'X') || (amIPlayer2 && gameData.winner === 'O')) {
                userStatsUpdate.gamesWon = firebase.firestore.FieldValue.increment(1);
            }
            if (amIPlayer1) gameUpdate.p1StatsUpdated = true;
            if (amIPlayer2) gameUpdate.p2StatsUpdated = true;
            
            const batch = db.batch();
            batch.update(gameRef, gameUpdate);
            batch.update(userStatsRef, userStatsUpdate);
            batch.commit().then(() => {
                console.log('Your stats have been updated!');
                // Re-enable buttons after stats are saved
                resetRoundBtn.disabled = false;
                deleteGameBtn.disabled = false;
            });
        }
    }
    
    gameRef.onSnapshot(doc => {
        if (!doc.exists) {
            alert("The game session has ended.");
            renderDashboardHome();
            setActiveSidebarLink(homeLink);
            return;
        }

        const gameData = doc.data();
        handleGameFinish(gameData);
        
        isGameActive = (gameData.status === 'active' || gameData.status === 'waiting');
        mySymbol = (currentUser.uid === gameData.player1Id) ? 'X' : 'O';
        p1NameDisplay.textContent = gameData.player1Name || 'Player 1';
        p1ScoreDisplay.textContent = gameData.player1Wins || 0;
        p2NameDisplay.textContent = gameData.player2Name || 'Waiting...';
        p2ScoreDisplay.textContent = gameData.player2Wins || 0;

        let statusText = '';
        if (gameData.status === 'waiting' || gameData.status === 'finished') {
            deleteGameBtn.style.display = 'inline-block';
        } else {
            deleteGameBtn.style.display = 'none';
        }
        if (gameData.status === 'waiting') {
            statusText = 'Waiting for Player 2 to join...';
            resetRoundBtn.style.display = 'none';
        } else if (gameData.status === 'finished') {
            statusText = (gameData.winner === 'Tie') ? "It's a Tie!" : `${gameData.winner === 'X' ? gameData.player1Name : gameData.player2Name} Won!`;
            resetRoundBtn.style.display = 'inline-block';
        } else {
            statusText = (gameData.currentPlayer === mySymbol) ? 'Your Turn' : "Opponent's Turn";
            resetRoundBtn.style.display = 'inline-block';
        }
        gameStatusDisplay.textContent = statusText;

        const tiles = gameBoard.querySelectorAll('.tile');
        tiles.forEach((tile, index) => {
            tile.textContent = gameData.board[index];
            tile.classList.remove('playerX', 'playerO');
            if(gameData.board[index]) tile.classList.add(gameData.board[index] === 'X' ? 'playerX' : 'playerO');
            tile.onclick = () => handleTileClick(index, gameData);
        });
    });

    // UPDATED: The reset button now also resets the stat-update flags
    resetRoundBtn.addEventListener('click', () => {
        gameRef.update({
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            status: 'active',
            winner: null,
            p1StatsUpdated: false,
            p2StatsUpdated: false
        });
    });

    deleteGameBtn.addEventListener('click', () => {
        gameRef.delete().catch((error) => {
            console.error("Error removing game: ", error);
        });
    });
}
