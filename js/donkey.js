import { db, auth } from "../js/fire.js";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 🔍 get params
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");
document.title=gameId;
const gameIdDiv = document.getElementById("gameId");
gameIdDiv.innerText = `Game ID: ${gameId}`
const playerId = Number(urlParams.get("playerId"));
const playerName = urlParams.get("name");
let currentUser = null;
const gameRef = doc(db, "donkey", gameId);

// 🃏 cards
const cards = [
  ...["S", "H", "D", "C"].flatMap((s) =>
    Array.from({ length: 13 }, (_, i) => `${s}${i + 2}`)
  ),
];

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
  } else {
    currentUser = null;
    window.location.href = "./auth.html";
  }
});

function sortCards(cards) {
  const suitOrder = { S: 0, H: 1, D: 2, C: 3 };

  return cards.sort((a, b) => {
    let suitA = a[0];
    let suitB = b[0];

    let valueA = Number(a.slice(1));
    let valueB = Number(b.slice(1));

    if (suitA !== suitB) {
      return suitOrder[suitA] - suitOrder[suitB];
    }

    return valueA - valueB;
  });
}

function validateTurn(player, card, turnSuit) {
  if (card[0] === turnSuit) return true;
  return !player.cards.some((c) => c[0] === turnSuit);
}

function handleGamePlay(game, index, player, card) {
  player.cards.splice(index, 1);
  game.discardPile.push(card);

  let suit = card[0];

  // 🔴 suit break
  if (game.turnSuit !== suit) {
    game.players[game.maxPlayer].cards.push(...game.discardPile);
    game.discardPile = [];
    game.turn = game.maxPlayer;
    game.turnSuit = null;
    return false;
  }

  // 🏆 max card
  if (Number(game.maxCard.slice(1)) < Number(card.slice(1))) {
    game.maxCard = card;
    game.maxPlayer = game.turn;
  }

  game.turn = getNextTurn(game);
  return true;
}

function isRoundComplete(game) {
  let active = game.players.filter((p) => p.cards.length > 0);
  return game.discardPile.length === active.length;
}

// 🔀 shuffle
function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// 🟢 JOIN PLAYER
async function joinPlayer() {
  let snap = await getDoc(gameRef);
  let game = snap.data();

  let players = game.players;

  if (players.length < game.maxPlayers) {
    await updateDoc(gameRef, {
      players: arrayUnion({
        id: playerId,
        playerUID: currentUser.uid,
        name: playerName || `Player ${playerId + 1}`,
        cards: [],
        isPlaying: true,
        wins: 0,
      }),
    });
  }

  snap = await getDoc(gameRef);
  game = snap.data();
  players = game.players;

  // 🚀 start
  if (players.length === game.maxPlayers && !game.started) {
    startGame(players);
  }
}

// 🚀 START GAME
async function startGame(players) {
  let shuffled = shuffle([...cards]);

  let i = 0;
  while (i < 52) {
    for (let j = 0; j < players.length; j++) {
      if (i === 52) break;
      players[j].cards.push(shuffled[i++]);
    }
  }

  let firstTurn = findFirstPlayer(players);
  await updateDoc(gameRef, {
    players,
    started: true,
    status: "active",
    turn: firstTurn,
    discardPile: [],
    discard: [],
    turnSuit: null,
    maxCard: "S14",
    maxPlayer: firstTurn,
    isFirstTurn: true,
  });

}

function findFirstPlayer(players) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].cards.includes("S14")) {
      return i;
    }
  }
  return 0; // fallback
}

// 🎯 PLAY CARD
async function playCard(card) {
  let snap = await getDoc(gameRef);
  let game = snap.data();

  if (!game.started) return;

  let currentPlayer = game.players[game.turn];

  // ❌ not your turn
  if (game.turn !== playerId) {
    alert("Not your turn");
    return;
  }

  // ❌ skip empty player
  if (!currentPlayer.isPlaying || currentPlayer.cards.length === 0) {
    return;
  }

  let index = currentPlayer.cards.indexOf(card);
  if (index === -1) return;

  // 🟢 FIRST MOVE
  if (!game.turnSuit) {
    if (game.isFirstTurn && card !== "S14") {
      alert("Play S14 first");
      return;
    }

    game.isFirstTurn = false;
    game.turnSuit = card[0];
    game.maxPlayer = game.turn;
    game.maxCard = card;
  }

  // 🟡 VALIDATION
  if (!validateTurn(currentPlayer, card, game.turnSuit)) {
    alert("Play valid card");
    return;
  }

  let continueRound = handleGamePlay(game, index, currentPlayer, card);

  let playersWithCards = game.players.filter((p) => p.cards.length > 0);

  if (playersWithCards.length === 1) {
    game.winner = playersWithCards[0].name;
    game.finished = true;

    let winnerPlayer = playersWithCards[0];

    winnerPlayer.wins = (winnerPlayer.wins || 0) + 1;

    await updateDoc(gameRef, game);
    return; // 🛑 STOP GAME
  }

  // 🏁 END ROUND
  if (continueRound && isRoundComplete(game)) {
    game.turn = game.maxPlayer;
    if (game.players[game.turn].cards.length === 0) {
      game.turn = getNextTurn(game);
    }
    game.discard.push(...game.discardPile);
    game.discardPile = [];
    game.turnSuit = null;
  }

  await updateDoc(gameRef, game);
}

window.restartGame = async function () {
  let snap = await getDoc(gameRef);
  let game = snap.data();

  let players = game.players.map((p) => ({
    ...p,
    cards: [],
  }));

  // 🔀 reshuffle
  let shuffled = shuffle([...cards]);

  let i = 0;
  while (i < 52) {
    for (let j = 0; j < players.length; j++) {
      if (i === 52) break;
      players[j].cards.push(shuffled[i++]);
    }
  }

  let firstTurn = findFirstPlayer(players);

  await updateDoc(gameRef, {
    players,
    turn: firstTurn,
    discardPile: [],
    discard: [],
    turnSuit: null,
    maxCard: "S14",
    maxPlayer: firstTurn,
    isFirstTurn: true,
    finished: false,
    winner: null,
  });
};

function formatCard(card) {
  const suitMap = {
    S: "♠",
    H: "♥",
    D: "♦",
    C: "♣",
  };

  let suit = card[0];
  let value = Number(card.slice(1));

  // face cards
  if (value === 11) value = "J";
  else if (value === 12) value = "Q";
  else if (value === 13) value = "K";
  else if (value === 14) value = "A";

  return {
    suit: suitMap[suit],
    value,
    color: suit === "H" || suit === "D" ? "red" : "black",
  };
}

function render(game) {
  if (!game) return;
  let restartBtn = document.getElementById("restartBtn");

  if (game.finished) {
    document.getElementById("turn").innerText = `🏆 Winner: ${game.winner}`;
    restartBtn.style.display = "inline-block";
    return;
  } else {
    restartBtn.style.display = "none";
  }

  // 🛑 ensure players exist
  if (!game.players || !game.players[playerId]) return;

  let currentPlayer = game.players[playerId];

  // 🎯 TURN TEXT
  let turnDiv = document.getElementById("turn");
  if (game.turn === playerId) {
    turnDiv.innerText = "🟢 Your Turn";
  } else {
    turnDiv.innerText = `Turn: ${game.players[game.turn]?.name}`;
  }

  // 🛑 ensure discardPile exists
  if (!game.discardPile) game.discardPile = [];

  // 👥 PLAYERS UI
  let playersDiv = document.getElementById("players");
  playersDiv.innerHTML = "";

  game.players.forEach((p, idx) => {
    let div = document.createElement("div");
    div.className = "player";

    if (idx === game.turn) {
      div.style.border = "3px solid green";
    }

    div.innerText = `${p.name}${p.id === playerId ? " (You)" : ""}
🃏 ${p.cards.length || 0}   🏆 ${p.wins || 0}`;

    playersDiv.appendChild(div);
  });

  // 🃏 MY CARDS
  let myDiv = document.getElementById("myCards");
  myDiv.innerHTML = "";

  // ✅ define this (your missing bug)
  let isMyTurn = game.turn === playerId;

  // 🛑 waiting state
  if (!game.started) {
    myDiv.innerText = "Waiting for players...";
    return;
  }

  let myCards = [...(currentPlayer.cards || [])];
  myCards = sortCards(myCards);

  if (myCards.length === 0) {
    myDiv.innerText = "No cards";
  }

  myCards.forEach((c) => {
    let card = document.createElement("div");
    card.className = "card";
    let formatted = formatCard(c);

    card.innerHTML = `
  <div class="card-inner ${formatted.color}">
    <div class="top">${formatted.value}${formatted.suit}</div>
    <div class="center">${formatted.suit}</div>
    <div class="bottom">${formatted.value}${formatted.suit}</div>
  </div>
`;

    if (isMyTurn) {
      card.onclick = () => playCard(c);
    } else {
      card.classList.add("disabled");
    }

    myDiv.appendChild(card);
  });

  // 🗑 DISCARD
  let discardDiv = document.getElementById("discard");
  discardDiv.innerHTML = "";

  (game.discardPile || []).forEach((c) => {
    let formatted = formatCard(c);

    let card = document.createElement("div");
    card.className = "card small";

    card.innerHTML = `
    <div class="card-inner ${formatted.color}">
      <div class="top">${formatted.value}${formatted.suit}</div>
      <div class="center">${formatted.suit}</div>
      <div class="bottom">${formatted.value}${formatted.suit}</div>
    </div>
  `;

    discardDiv.appendChild(card);
  });
}
// 🔁 LISTEN
onSnapshot(gameRef, async (snap) => {
  let game = snap.data();
  if (!game) return;
  
  render(game);
});

function getNextTurn(game) {
  let next = (game.turn + 1) % game.players.length;

  while (game.players[next].cards.length === 0) {
    next = (next + 1) % game.players.length;

    // safety (avoid infinite loop)
    if (next === game.turn) break;
  }

  return next;
}

// init
joinPlayer();
