"use strict";

const state = {
    rounds: [],
    chatterPool: [],
    roundIndex: 0,
    stageIndex: 0,
    score: 0,
    solved: false,
    wrongNames: new Set(),
    results: [],
};

// cache
const el = {
    screens: {
        ragebait: document.getElementById("screen-ragebait"),
        menu: document.getElementById("screen-menu"),
        game: document.getElementById("screen-game"),
        end: document.getElementById("screen-end"),
    },
    roundCount: document.getElementById("round-count"),
    beginBtn: document.getElementById("begin-btn"),
    roundLabel: document.getElementById("round-label"),
    scoreValue: document.getElementById("score-value"),
    stageDots: document.getElementById("stage-dots"),
    stageImage: document.getElementById("stage-image"),
    feedback: document.getElementById("feedback"),
    revealCard: document.getElementById("reveal-card"),
    revealName: document.getElementById("reveal-name"),
    revealExtra: document.getElementById("reveal-extra"),
    choices: document.getElementById("choices"),
    nextStageBtn: document.getElementById("next-stage-btn"),
    nextRoundBtn: document.getElementById("next-round-btn"),
    finalScore: document.getElementById("final-score"),
    finalBreakdown: document.getElementById("final-breakdown"),
    restartBtn: document.getElementById("restart-btn"),
};

function showScreen(name) {
    Object.entries(el.screens).forEach(([key, section]) => {
        section.hidden = key !== name;
    });
}

const TRICKS = [trickCountdown, trickProgress, trickMirroredSlider, trickEvadingButton];

let currentTrickIndex = 0;

function initRagebait() {
    runTrick(0);
    document.getElementById("dev-skip").addEventListener("click", enterMenu);
    document.getElementById("skip-trick").addEventListener("click", () => {
        runTrick(currentTrickIndex + 1);
    });
}

function runTrick(index) {
    currentTrickIndex = index;
    if (index >= TRICKS.length) {
        enterMenu();
        return;
    }
    document.getElementById("trick-counter").textContent = `${index + 1} / ${TRICKS.length}`;
    const stage = document.getElementById("ragebait-stage");
    stage.innerHTML = "";
    TRICKS[index](stage, () => runTrick(index + 1));
}

function trickCountdown(container, next) {
    container.innerHTML = `
    <h1>Spiel startet in …</h1>
    <div class="trick-countdown-number" id="count-num">3</div>
    <p class="trick-sub" id="count-sub"></p>
  `;
    const numEl = document.getElementById("count-num");
    const subEl = document.getElementById("count-sub");
    let cycle = 0;
    let n = 3;

    const tick = () => {
        n--;
        if (n > 0) {
            numEl.textContent = n;
            setTimeout(tick, 700);
        } else {
            cycle++;
            if (cycle < 2) {
                numEl.textContent = "3";
                n = 3;
                subEl.textContent = "Moment, nochmal von vorne.";
                setTimeout(tick, 700);
            } else {
                numEl.textContent = "0";
                subEl.textContent = "Diesmal wirklich.";
                setTimeout(next, 600);
            }
        }
    };
    setTimeout(tick, 700);
}

function trickProgress(container, next) {
    container.innerHTML = `
    <h1 id="ragebait-status">Analysiere Chatqualität …</h1>
    <div class="fake-progress"><div id="fake-progress-bar" class="fake-progress-bar"></div></div>
  `;
    const bar = document.getElementById("fake-progress-bar");
    const status = document.getElementById("ragebait-status");
    const messages = [
        "Analysiere Chatqualität …",
        "Zähle Emotes …",
        "Suche nach Sinn im Content …",
        "Suche BIG CONTENT …",
        "Suche first Messages …"
    ];

    let progress = 0;
    let stall = 0;

    const interval = setInterval(() => {
        if (progress < 92) {
            progress += Math.random() * 9;
            progress = Math.min(progress, 92);
        } else {
            stall++;
            if (stall <= 20) {
                progress -= 18;
                status.textContent = messages[Math.min(stall, messages.length - 1)];
            } else {
                progress = 100;
                status.textContent = "Fertig. Viel Erfolg.";
                clearInterval(interval);
                setTimeout(next, 500);
            }
        }
        bar.style.width = `${progress}%`;
    }, 550);
}

function trickMirroredSlider(container, next) {
    container.innerHTML = `
    <h1>IQ-Regler</h1>
    <p class="trick-sub">Wie schlau ist Leeeonn?</p>
    <div class="iq-slider-wrap">
      <input type="range" id="iq-slider" min="0" max="4" step="1" value="0" class="iq-slider">
      <div class="iq-stops"><span>Dumm</span><span>Patrick</span><span>Fisch</span><span>Brot</span><span>Schlau</span></div>
      <p id="iq-reaction" class="iq-reaction">Viel Erfolg, die Richtung stimmt nicht ganz …</p>
    </div>
  `;
    const slider = document.getElementById("iq-slider");
    const reaction = document.getElementById("iq-reaction");
    const reactions = ["Kalt.", "Wärmer.", "Fast heiß.", "Mr_Tesz.", "Geschafft!"];
    let holdTimer = null;

    slider.addEventListener("input", () => {
        const value = Number(slider.value);
        reaction.textContent = reactions[value];
        if (value === 4) {
            holdTimer = setTimeout(next, 400);
        } else if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
    });
}

function trickEvadingButton(container, next) {
    container.innerHTML = `
    <h1>Fast geschafft</h1>
    <p class="trick-sub">Klick auf <img src="../assets/aga.png" alt="aga" height="32" width="32"> um das spiel zu starten.</p>
  `;

    const btn = document.createElement("button");
    btn.id = "start-btn";
    btn.className = "btn btn-primary evade-btn-floating";
    btn.innerHTML = `<img src="../assets/aga.png" alt="aga" height="64" width="64">`;
    document.body.appendChild(btn);
    document.body.classList.add("evading");
    placeButtonRandom(btn);

    const dangerRadius = 55;

    function onMove(event) {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(event.clientX - cx, event.clientY - cy);
        if (dist < dangerRadius) {
            placeButtonRandom(btn, event.clientX, event.clientY);
        }
    }

    function finish() {
        document.removeEventListener("mousemove", onMove);
        document.body.classList.remove("evading");
        btn.remove();
        next();
    }

    document.addEventListener("mousemove", onMove);
    btn.addEventListener("click", finish);
}

function placeButtonRandom(btn, awayFromX, awayFromY) {
    const margin = 24;
    const w = btn.offsetWidth || 170;
    const h = btn.offsetHeight || 50;
    const maxX = Math.max(window.innerWidth - w - margin * 2, 0);
    const maxY = Math.max(window.innerHeight - h - margin * 2, 0);

    let x = margin;
    let y = margin;
    let tries = 0;
    do {
        x = margin + Math.random() * maxX;
        y = margin + Math.random() * maxY;
        tries++;
    } while (
        awayFromX != null &&
        Math.hypot(x + w / 2 - awayFromX, y + h / 2 - awayFromY) < 180 &&
        tries < 12
        );

    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
}

function enterMenu() {
    showScreen("menu");
    el.roundCount.textContent = state.rounds.length;
}

function startGame() {
    state.roundIndex = 0;
    state.score = 0;
    state.results = [];
    startRound();
}

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function buildChoices(round) {
    const wantedCount = round.choiceCount || 5;
    const pool = state.chatterPool.filter((name) => name !== round.correct);

    const decoys = shuffle(pool).slice(0, wantedCount - 1);

    return shuffle([round.correct, ...decoys]);
}

function startRound() {
    state.stageIndex = 0;
    state.solved = false;
    state.wrongNames.clear();
    currentRound()._choices = buildChoices(currentRound());
    el.feedback.textContent = "";
    el.feedback.className = "feedback";
    el.revealCard.hidden = true;
    el.nextRoundBtn.hidden = true;
    el.nextStageBtn.hidden = false;

    showScreen("game");
    renderStage();
}

function currentRound() {
    return state.rounds[state.roundIndex];
}

function guessStageCount(round) {
    return round.images.length - 1;
}

function pointsForStage(round, stageIdx) {
    const stages = guessStageCount(round);
    return Math.max((stages - 1 - stageIdx) + 1, 0);
}

function renderStage() {
    const round = currentRound();
    const stages = guessStageCount(round);
    const isReveal = state.stageIndex >= stages;

    el.roundLabel.textContent = round.roundName || `Runde ${state.roundIndex + 1}`;
    el.scoreValue.textContent = state.score;

    const imageIdx = isReveal ? round.images.length - 1 : state.stageIndex;
    el.stageImage.src = round.images[imageIdx];
    el.stageImage.alt = isReveal
        ? "Aufgedeckte Nachrichten inkl. Name"
        : `Nachricht(en) 1 bis ${state.stageIndex + 1}`;

    renderStageDots(stages, isReveal);
    renderChoices(round);

    if (isReveal) {
        revealAnswer(round);
    }
}

function renderStageDots(stages, isReveal) {
    el.stageDots.innerHTML = "";
    for (let i = 0; i < stages; i++) {
        const dot = document.createElement("span");
        dot.className = "stage-dot";
        if (isReveal || i < state.stageIndex) dot.classList.add("filled");
        if (!isReveal && i === state.stageIndex) dot.classList.add("current");
        el.stageDots.appendChild(dot);
    }
}

function renderChoices(round) {
    el.choices.innerHTML = "";
    const isReveal = state.stageIndex >= guessStageCount(round);

    round._choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice;

        const alreadyWrong = state.wrongNames.has(choice);
        if (alreadyWrong) btn.classList.add("wrong");
        btn.disabled = state.solved || isReveal || alreadyWrong;

        btn.addEventListener("click", () => handleChoiceClick(choice, round, btn));
        el.choices.appendChild(btn);
    });
}

function handleChoiceClick(choice, round, btnEl) {
    if (state.solved) return;

    if (choice === round.correct) {
        state.solved = true;
        const points = pointsForStage(currentRound(), state.stageIndex);
        state.score += points;
        el.scoreValue.textContent = state.score;

        btnEl.classList.add("correct");
        el.feedback.textContent = `Richtig! +${points} Punkte`;
        el.feedback.className = "feedback good";

        disableAllChoices();
        state.results.push({
            roundName: currentRound().roundName,
            points,
            guessed: true,
        });

        state.stageIndex = guessStageCount(currentRound());
        setTimeout(renderStage, 550);
    } else {
        btnEl.classList.add("wrong");
        btnEl.disabled = true;
        state.wrongNames.add(choice);
        el.feedback.textContent = "Falsch – nächster Versuch";
        el.feedback.className = "feedback bad";

        setTimeout(goToNextStage, 100);
    }
}

function disableAllChoices() {
    el.choices.querySelectorAll(".choice-btn").forEach((b) => (b.disabled = true));
}

function revealAnswer(round) {
    el.nextStageBtn.hidden = true;
    el.nextRoundBtn.hidden = false;

    if (!state.solved) {
        el.feedback.textContent = "Nicht erraten – hier ist die Auflösung.";
        el.feedback.className = "feedback bad";
        state.results.push({ roundName: round.roundName, points: 0, guessed: false });
    }

    const correctChoice = round.correct;
    state.chatterPool = state.chatterPool.filter((c) => c !== correctChoice)

    el.revealCard.hidden = false;
    el.revealName.textContent = correctChoice;

    el.revealExtra.innerHTML = "";
}

function goToNextStage() {
    const round = currentRound();
    const stages = guessStageCount(round);
    if (state.stageIndex < stages) {
        state.stageIndex++;
        el.feedback.textContent = "";
        el.feedback.className = "feedback";
        renderStage();
    }
}

function goToNextRound() {
    state.roundIndex++;
    if (state.roundIndex >= state.rounds.length) {
        showEndScreen();
    } else {
        startRound();
    }
}

function showEndScreen() {
    showScreen("end");
    el.finalScore.textContent = state.score;
    el.finalBreakdown.innerHTML = "";
    state.results.forEach((r) => {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = r.roundName;
        const value = document.createElement("span");
        value.textContent = r.guessed ? `+${r.points}` : "0 (nicht erraten)";
        li.appendChild(label);
        li.appendChild(value);
        el.finalBreakdown.appendChild(li);
    });
}

document.addEventListener("keydown", (event) => {
    if (el.screens.game.hidden) return;

    if ((event.key === "ArrowRight" || event.code === "Space") && !el.nextStageBtn.hidden) {
        event.preventDefault();
        goToNextStage();
    }

    const num = Number(event.key);
    if (num >= 1 && num <= 9) {
        const buttons = el.choices.querySelectorAll(".choice-btn");
        const target = buttons[num - 1];
        if (target && !target.disabled) target.click();
    }
});

async function loadRounds() {
    const response = await fetch("data/rounds.json");
    if (!response.ok) throw new Error(`rounds.json konnte nicht geladen werden (${response.status})`);
    return  await response.json();
}

async function init() {
    el.beginBtn.addEventListener("click", startGame);
    el.nextStageBtn.addEventListener("click", goToNextStage);
    el.nextRoundBtn.addEventListener("click", goToNextRound);
    el.restartBtn.addEventListener("click", () => {
        showScreen("menu");
    });

    try {
        const data = await loadRounds();
        state.rounds = data.rounds;
        state.chatterPool = data.chatterPool;
    } catch (err) {
        console.error(err);
        document.body.innerHTML =
            `<div style="padding:40px;font-family:monospace;color:#fff;background:#0b0b12;min-height:100vh">
        <h1>rounds.json konnte nicht geladen werden</h1>
        <p>Das passiert meist, wenn die Seite direkt als Datei (file://) geöffnet wird.
        Öffne den Ordner stattdessen über einen lokalen Server, z. B. mit:</p>
        <pre>python -m http.server</pre>
        <p>und rufe dann http://localhost:8000 im Browser auf.</p>
      </div>`;
        return;
    }

    initRagebait();
}

init();