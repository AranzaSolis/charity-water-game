// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let score = 0;
let roundDropsCollected = 0;
let totalDrops = Number(localStorage.getItem("totalDropsCollected") || 0);
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let lastFunFactIndex = -1;
let audioContext;
let countdownMaker;
let timeWarningMaker;
let collisionChecker;
let backgroundMusicMaker;
let backgroundMusicStep = 0;
let timeRemaining = 35;
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let volumeLevel = Number(localStorage.getItem("volumeLevel") || 70) / 100;
let factsVisible = localStorage.getItem("factsVisible") !== "false";
let gameStartTime = 0;
let theme = localStorage.getItem("theme") || "sunny";
let ownedStoreItems = JSON.parse(localStorage.getItem("ownedStoreItems") || '["bucket-jerry","border-basic"]');
let equippedBucket = localStorage.getItem("equippedBucket") || "bucket-jerry";
const legacyBorderIds = {
  "background-sky": "border-basic",
  "background-sunset": "border-sunrise",
  "background-ocean": "border-ocean",
  "background-galaxy": "border-purple"
};
let equippedBorder = localStorage.getItem("equippedBorder")
  || legacyBorderIds[localStorage.getItem("equippedBackground")]
  || "border-basic";

const funFacts = [
  "A nearby source of safe water can turn a daily trek into extra time for learning, earning, and family life.",
  "Safe water and sanitation help communities prevent waterborne diseases.",
  "Small drops of support can help bring lasting clean water solutions to communities.",
  "100% of public donations fund clean water projects!",
  "charity: water shares photos and GPS coordinates of its water projects so supporters can see where their contributions are making an impact.",
  "According to charity: water, approximately 696 million people lack access to clean and safe drinking water.",
  "According to charity: water Stories' \"The Water Crisis is a Women's Issue,\" women and girls spend an estimated 200 million hours every day collecting water worldwide."
];

const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const timeWarningElement = document.getElementById("time-warning");
const totalDropsElement = document.getElementById("total-drops");
const gameContainer = document.getElementById("game-container");
const bucketCursor = document.getElementById("bucket-cursor");
const howToDialog = document.getElementById("how-to-dialog");
const storeDialog = document.getElementById("store-dialog");
const gameOverDialog = document.getElementById("game-over-dialog");
const gameOverScore = document.getElementById("game-over-score");
const bestScoreElement = document.getElementById("best-score");
const funFactElement = document.getElementById("fun-fact-text");
const settingsDialog = document.getElementById("settings-dialog");
const volumeControl = document.getElementById("volume-control");
const volumeValue = document.getElementById("volume-value");
const soundToggle = document.getElementById("sound-toggle");
const factsToggle = document.getElementById("facts-toggle");
const resetSettingsButton = document.getElementById("reset-settings");
const themeControl = document.getElementById("theme-control");
const storeBalance = document.getElementById("store-balance");
const storeMessage = document.getElementById("store-message");
const bucketShop = document.getElementById("bucket-shop");
const borderShop = document.getElementById("border-shop");
let bucketPosition = 0;
let storeReturnToGame = false;
let storeReturnToGameOver = false;

const validThemes = ["sunny", "ocean", "night"];
ownedStoreItems = [...new Set(ownedStoreItems.map((itemId) => legacyBorderIds[itemId] || itemId))];
if (!ownedStoreItems.includes("bucket-jerry")) ownedStoreItems.unshift("bucket-jerry");
if (!ownedStoreItems.includes("border-basic")) ownedStoreItems.push("border-basic");
localStorage.setItem("ownedStoreItems", JSON.stringify(ownedStoreItems));
localStorage.setItem("equippedBucket", equippedBucket);
localStorage.setItem("equippedBorder", equippedBorder);
const storeItems = {
  buckets: [
    { id: "bucket-jerry", name: "Jerry Can", price: 0, icon: "🪣", className: "bucket-jerry" },
    { id: "bucket-classic", name: "Classic", price: 65, icon: "", className: "bucket-classic" },
    { id: "bucket-coral", name: "Coral", price: 100, icon: "🪣", className: "bucket-coral" },
    { id: "bucket-crystal", name: "Crystal Bucket", price: 100, icon: "✨", className: "bucket-crystal" },
    { id: "bucket-golden", name: "Golden Well", price: 175, icon: "🏆", className: "bucket-golden" }
  ],
  borders: [
    { id: "border-basic", name: "Default", price: 0, icon: "", className: "border-basic" },
    { id: "border-ocean", name: "Ocean", price: 60, icon: "", className: "border-ocean" },
    { id: "border-sunrise", name: "Sunrise", price: 100, icon: "", className: "border-sunrise" },
    { id: "border-purple", name: "Purple", price: 175, icon: "", className: "border-purple" }
  ]
};

totalDropsElement.textContent = totalDrops;
bestScoreElement.textContent = bestScore;
volumeControl.value = Math.round(volumeLevel * 100);
volumeValue.textContent = `${volumeControl.value}%`;
soundToggle.checked = soundEnabled;
factsToggle.checked = factsVisible;
if (!validThemes.includes(theme)) theme = "sunny";
themeControl.value = theme;
document.body.classList.add(`theme-${theme}`);
document.body.classList.toggle("facts-hidden", !factsVisible);
showRandomFunFact();
applyStoreCosmetics();
renderStore();
startBackgroundMusic();

document.addEventListener("pointerdown", resumeAudio, { once: true });
document.addEventListener("keydown", resumeAudio, { once: true });
document.addEventListener("click", (event) => {
  if (event.target.closest("button")) playTone(440, 0.12);
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", resetGame);
document.getElementById("game-home-button").addEventListener("click", endGame);
document.getElementById("results-home-button").addEventListener("click", returnHome);
document.getElementById("results-try-again").addEventListener("click", () => {
  gameOverDialog.close();
  startGame();
});
document.getElementById("results-store").addEventListener("click", () => {
  gameOverDialog.close();
  renderStore();
  storeReturnToGame = false;
  storeReturnToGameOver = true;
  storeDialog.showModal();
});
document.getElementById("settings-button").addEventListener("click", () => settingsDialog.showModal());
document.getElementById("how-to-play").addEventListener("click", () => howToDialog.showModal());
document.getElementById("store").addEventListener("click", () => {
  renderStore();
  storeReturnToGame = gameRunning;
  storeReturnToGameOver = false;
  storeDialog.showModal();
});
document.getElementById("store-exit-button").addEventListener("click", () => {
  const shouldRestartGame = storeReturnToGame;
  const shouldReturnToGameOver = storeReturnToGameOver;
  storeDialog.close();
  storeReturnToGame = false;
  storeReturnToGameOver = false;
  if (shouldRestartGame) resetGame();
  if (shouldReturnToGameOver) gameOverDialog.showModal();
});
document.getElementById("store-home-button").addEventListener("click", returnHomeFromStore);
document.getElementById("store-play-again-button").addEventListener("click", () => {
  storeDialog.close();
  startGame();
});
storeDialog.addEventListener("close", () => storeMessage.textContent = "");
gameContainer.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") {
    gameContainer.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
});
gameContainer.addEventListener("pointermove", (event) => {
  const bounds = gameContainer.getBoundingClientRect();
  moveBucket(event.clientX - bounds.left);
  checkBucketCollisions();
  if (event.pointerType === "touch") event.preventDefault();
});
volumeControl.addEventListener("input", () => {
  volumeLevel = Number(volumeControl.value) / 100;
  volumeValue.textContent = `${volumeControl.value}%`;
  localStorage.setItem("volumeLevel", volumeControl.value);
});
soundToggle.addEventListener("change", () => {
  soundEnabled = soundToggle.checked;
  localStorage.setItem("soundEnabled", soundEnabled);
  if (soundEnabled) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }
});
factsToggle.addEventListener("change", () => {
  factsVisible = factsToggle.checked;
  document.body.classList.toggle("facts-hidden", !factsVisible);
  localStorage.setItem("factsVisible", factsVisible);
});
resetSettingsButton.addEventListener("click", () => {
  volumeLevel = 0.7;
  soundEnabled = true;
  factsVisible = true;
  volumeControl.value = 70;
  volumeValue.textContent = "70%";
  soundToggle.checked = true;
  factsToggle.checked = true;
  theme = "sunny";
  themeControl.value = theme;
  document.body.classList.remove("theme-ocean", "theme-night");
  document.body.classList.add("theme-sunny");
  document.body.classList.remove("facts-hidden");
  localStorage.removeItem("volumeLevel");
  localStorage.removeItem("soundEnabled");
  localStorage.removeItem("factsVisible");
  localStorage.removeItem("theme");
  startBackgroundMusic();
});
themeControl.addEventListener("change", () => {
  theme = themeControl.value;
  document.body.classList.remove("theme-sunny", "theme-ocean", "theme-night");
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem("theme", theme);
});
document.querySelectorAll(".dialog-close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;
  score = 0;
  roundDropsCollected = 0;
  gameStartTime = Date.now();
  timeRemaining = 35;
  scoreElement.textContent = score;
  timeElement.textContent = timeRemaining;
  resetTimeWarning();
  homeScreen.hidden = true;
  gameScreen.hidden = false;
  moveBucket(gameContainer.offsetWidth / 2);

  scheduleNextDrop();
  collisionChecker = setInterval(checkBucketCollisions, 50);
  countdownMaker = setInterval(updateCountdown, 1000);
}

function renderStore() {
  storeBalance.textContent = totalDrops;
  renderStoreItems(bucketShop, storeItems.buckets);
  renderStoreItems(borderShop, storeItems.borders);
}

function renderStoreItems(container, items) {
  container.innerHTML = items.map((item) => {
    const owned = ownedStoreItems.includes(item.id);
    const equipped = item.id === equippedBucket || item.id === equippedBorder;
    const action = equipped ? "Equipped" : owned ? "Equip" : item.price === 0 ? "Claim" : `${item.price} 💧`;
    return `<article class="store-item">
      <div class="store-preview ${item.className}">${item.icon}</div>
      <strong>${item.name}</strong>
      <button type="button" data-store-item="${item.id}" ${equipped ? "disabled" : ""}>${action}</button>
    </article>`;
  }).join("");
  container.querySelectorAll("[data-store-item]").forEach((button) => {
    button.addEventListener("click", () => purchaseStoreItem(button.dataset.storeItem));
  });
}

function purchaseStoreItem(itemId) {
  const item = [...storeItems.buckets, ...storeItems.borders].find((entry) => entry.id === itemId);
  if (!item) return;
  if (!ownedStoreItems.includes(itemId)) {
    if (totalDrops < item.price) {
      storeMessage.textContent = `You need ${item.price - totalDrops} more drops for ${item.name}.`;
      return;
    }
    totalDrops -= item.price;
    totalDropsElement.textContent = totalDrops;
    localStorage.setItem("totalDropsCollected", totalDrops);
    ownedStoreItems.push(itemId);
    localStorage.setItem("ownedStoreItems", JSON.stringify(ownedStoreItems));
  }
  if (itemId.startsWith("bucket-")) {
    equippedBucket = itemId;
    localStorage.setItem("equippedBucket", itemId);
  } else {
    equippedBorder = itemId;
    localStorage.setItem("equippedBorder", itemId);
  }
  applyStoreCosmetics();
  renderStore();
  storeMessage.textContent = "";
}

function applyStoreCosmetics() {
  bucketCursor.classList.remove(...storeItems.buckets.map((item) => item.className));
  gameContainer.classList.remove(...storeItems.borders.map((item) => item.className));
  const bucket = storeItems.buckets.find((item) => item.id === equippedBucket) || storeItems.buckets[0];
  const border = storeItems.borders.find((item) => item.id === equippedBorder) || storeItems.borders[0];
  bucketCursor.classList.add(bucket.className);
  gameContainer.classList.add(border.className);
}

function resetGame() {
  if (!gameRunning) {
    startGame();
    return;
  }

  clearTimeout(dropMaker);
  clearInterval(countdownMaker);
  clearInterval(collisionChecker);
  clearDrops();
  score = 0;
  roundDropsCollected = 0;
  timeRemaining = 35;
  gameStartTime = Date.now();
  scoreElement.textContent = score;
  timeElement.textContent = timeRemaining;
  resetTimeWarning();
  scheduleNextDrop();
  collisionChecker = setInterval(checkBucketCollisions, 50);
  countdownMaker = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  timeRemaining -= 1;
  timeElement.textContent = timeRemaining;

  if (timeRemaining === 10) {
    timeWarningElement.hidden = false;
    timeWarningMaker = setTimeout(() => {
      timeWarningElement.hidden = true;
    }, 4000);
  }

  if (timeRemaining <= 0) endGame();
}

function resetTimeWarning() {
  clearTimeout(timeWarningMaker);
  timeWarningElement.hidden = true;
}

function returnHome() {
  clearTimeout(dropMaker);
  clearInterval(countdownMaker);
  clearInterval(collisionChecker);
  resetTimeWarning();
  gameRunning = false;
  gameOverDialog.close();
  clearDrops();
  gameScreen.hidden = true;
  homeScreen.hidden = false;
  showRandomFunFact();
}

function returnHomeFromStore() {
  storeDialog.close();
  returnHome();
}

function endGame() {
  clearTimeout(dropMaker);
  clearInterval(countdownMaker);
  clearInterval(collisionChecker);
  gameRunning = false;
  clearDrops();
  gameOverScore.textContent = score;
  document.querySelector(".results-title").textContent = "GAME OVER!";
  if (score >= 20) launchConfetti();
  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem("bestScore", bestScore);
  }
  bestScoreElement.textContent = bestScore;
  gameOverDialog.showModal();
  animateDropsToTotal(roundDropsCollected);
}

function animateDropsToTotal(dropsToAdd) {
  if (dropsToAdd === 0) return;

  const source = gameOverScore.getBoundingClientRect();
  const target = totalDropsElement.parentElement.getBoundingClientRect();
  const dialogBounds = gameOverDialog.getBoundingClientRect();
  let completedDrops = 0;

  for (let index = 0; index < dropsToAdd; index += 1) {
    const flyingDrop = document.createElement("span");
    flyingDrop.className = "flying-drop";
    flyingDrop.textContent = "💧";
    flyingDrop.style.left = `${source.left + source.width / 2 - dialogBounds.left}px`;
    flyingDrop.style.top = `${source.top + source.height / 2 - dialogBounds.top}px`;
    flyingDrop.style.setProperty("--drop-x", `${target.left + target.width / 2 - source.left - source.width / 2}px`);
    flyingDrop.style.setProperty("--drop-y", `${target.top + target.height / 2 - source.top - source.height / 2}px`);
    flyingDrop.style.animationDelay = `${index * 45}ms`;
    gameOverDialog.appendChild(flyingDrop);
    flyingDrop.addEventListener("animationend", () => {
      flyingDrop.remove();
      playTone(720 + completedDrops * 35, 0.08);
      completedDrops += 1;
      totalDrops += 1;
      totalDropsElement.textContent = totalDrops;
      localStorage.setItem("totalDropsCollected", totalDrops);
      if (completedDrops === dropsToAdd) {
        const totalDropsBox = totalDropsElement.closest(".drop-total");
        totalDropsBox.classList.add("total-drops-received");
        totalDropsBox.addEventListener(
          "animationend",
          () => totalDropsBox.classList.remove("total-drops-received"),
          { once: true }
        );
      }
    });
  }
}

function launchConfetti() {
  const colors = ["#ffc907", "#2e9df7", "#f16061", "#7de3d1"];
  for (let index = 0; index < 36; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.setProperty("--confetti-x", `${(Math.random() - 0.5) * 180}px`);
    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function showRandomFunFact() {
  let nextFunFactIndex;

  do {
    nextFunFactIndex = Math.floor(Math.random() * funFacts.length);
  } while (funFacts.length > 1 && nextFunFactIndex === lastFunFactIndex);

  lastFunFactIndex = nextFunFactIndex;
  funFactElement.textContent = funFacts[nextFunFactIndex];
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  const polluted = Math.random() < getPollutionChance();
  const isBig = Math.random() < 0.45;
  drop.className = polluted ? "water-drop bad-drop" : "water-drop";
  drop.setAttribute("role", "button");
  drop.setAttribute(
    "aria-label",
    polluted ? "Avoid polluted drop" : isBig ? "Collect large water drop for two drops" : "Collect water drop"
  );
  drop.dataset.value = isBig ? "2" : "1";

  drop.addEventListener("click", () => {
    if (!gameRunning || drop.dataset.resolved) return;
    collectDrop(drop, polluted);
  });

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = isBig
    ? Math.random() * 0.35 + 0.95
    : Math.random() * 0.3 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  drop.style.animationDuration = `${getFallDuration()}s`;

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    if (isTouchingBucket(drop)) {
      collectDrop(drop, polluted);
      return;
    }

    drop.remove(); // Clean up drops that weren't caught
  });
}

function moveBucket(position) {
  const bucketHalfWidth = bucketCursor.offsetWidth / 2;
  const edgeInset = bucketCursor.classList.contains("bucket-jerry")
    ? bucketHalfWidth * 0.45
    : bucketHalfWidth * 0.75;
  bucketPosition = Math.max(edgeInset, Math.min(position, gameContainer.offsetWidth - edgeInset));
  bucketCursor.style.left = `${bucketPosition}px`;
}

function checkBucketCollisions() {
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => {
    if (isTouchingBucket(drop)) {
      collectDrop(drop, drop.classList.contains("bad-drop"));
    }
  });
}

function isTouchingBucket(drop) {
  const dropRect = drop.getBoundingClientRect();
  const bucketRect = getBucketCollisionRect();
  const dropCenterX = dropRect.left + dropRect.width / 2;
  const isJerryCan = bucketCursor.classList.contains("bucket-jerry");

  return dropRect.bottom >= bucketRect.top
    && dropRect.top <= bucketRect.bottom
    && (isJerryCan
      ? dropRect.right >= bucketRect.left && dropRect.left <= bucketRect.right
      : dropCenterX >= bucketRect.left && dropCenterX <= bucketRect.right);
}

function getBucketCollisionRect() {
  const bucketRect = bucketCursor.getBoundingClientRect();
  const isJerryCan = bucketCursor.classList.contains("bucket-jerry");
  const horizontalInset = bucketRect.width * (isJerryCan ? 0.35 : 0.08);
  const topInset = bucketRect.height * (isJerryCan ? 0.2 : 0.1);
  const bottomInset = bucketRect.height * (isJerryCan ? 0.2 : 0.05);

  return {
    left: bucketRect.left + horizontalInset,
    right: bucketRect.right - horizontalInset,
    top: bucketRect.top + topInset,
    bottom: bucketRect.bottom - bottomInset
  };
}

function collectDrop(drop, polluted) {
  if (drop.dataset.resolved) return;

  drop.dataset.resolved = "true";
  if (polluted) {
    const penalty = Number(drop.dataset.value) || 1;
    score = Math.max(0, score - penalty);
    playTone(180, 0.12);
    if (penalty > 1) {
      showScoreFeedback(drop, "-2", true);
      setTimeout(() => {
        playTone(140, 0.1);
        setTimeout(() => playTone(95, 0.12), 90);
      }, 70);
    }
  } else {
    const dropValue = Number(drop.dataset.value) || 1;
    score += dropValue;
    roundDropsCollected += dropValue;
    playTone(dropValue > 1 ? 880 : 660, 0.08);
    if (dropValue > 1) {
      showScoreFeedback(drop, "+2");
      setTimeout(() => playTone(1175, 0.1), 70);
    }
  }
  scoreElement.textContent = score;
  drop.remove();
}

function showScoreFeedback(drop, text, isPenalty = false) {
  const dropRect = drop.getBoundingClientRect();
  const gameRect = gameContainer.getBoundingClientRect();
  const feedback = document.createElement("span");
  feedback.className = `score-feedback${isPenalty ? " score-feedback-penalty" : ""}`;
  feedback.textContent = text;
  feedback.style.left = `${dropRect.left - gameRect.left + dropRect.width / 2}px`;
  feedback.style.top = `${dropRect.top - gameRect.top}px`;
  gameContainer.appendChild(feedback);
  feedback.addEventListener("animationend", () => feedback.remove(), { once: true });
}

function clearDrops() {
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
}

function scheduleNextDrop() {
  if (!gameRunning) return;

  dropMaker = setTimeout(() => {
    createDrop();
    scheduleNextDrop();
  }, getSpawnInterval());
}

function getDifficultyLevel() {
  return Math.floor((Date.now() - gameStartTime) / 5000);
}

function getSpawnInterval() {
  return Math.max(250, 1000 - getDifficultyLevel() * 130);
}

function getFallDuration() {
  return Math.max(1.2, 4 - getDifficultyLevel() * 0.45);
}

function getPollutionChance() {
  return Math.min(0.55, 0.08 + getDifficultyLevel() * 0.09);
}

function playTone(frequency, duration) {
  if (!soundEnabled || volumeLevel === 0) return;

  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volumeLevel * 0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function startBackgroundMusic() {
  stopBackgroundMusic();
  if (!soundEnabled || volumeLevel === 0) return;

  const melody = [392, 494, 587, 494, 440, 523, 659, 523];
  backgroundMusicStep = 0;
  playBackgroundNote(melody[backgroundMusicStep]);
  backgroundMusicMaker = setInterval(() => {
    backgroundMusicStep = (backgroundMusicStep + 1) % melody.length;
    playBackgroundNote(melody[backgroundMusicStep]);
  }, 650);
}

function stopBackgroundMusic() {
  clearInterval(backgroundMusicMaker);
  backgroundMusicMaker = undefined;
}

function resumeAudio() {
  if (audioContext?.state === "suspended") {
    audioContext.resume();
  }
}

function playBackgroundNote(frequency) {
  if (!soundEnabled || volumeLevel === 0) return;

  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volumeLevel * 0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.55);
}
