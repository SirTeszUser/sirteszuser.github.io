"use strict";

/* ================================================================
   GUESS THE CHATTER
   Kompletter Spielablauf: Ragebait-Intro -> Menü -> Runden -> Ende.
   Alle Inhalte (Bilder, Chatter, Zusatzinfos) kommen aus
   data/rounds.json – dort erweiterst du das Spiel, ohne dieses
   Skript anfassen zu müssen. Siehe README.md.
   ================================================================ */

// ---------------------------------------------------------------
// Globaler Spielzustand
// ---------------------------------------------------------------
const state = {
    rounds: [],
    roundIndex: 0,
    stageIndex: 0, // 0-basiert, zeigt auf rounds[i].images[stageIndex]
    score: 0,
    solved: false,
    wrongNames: new Set(), // Namen, die in der aktuellen Runde schon falsch geraten wurden
    results: [], // { roundName, points, guessed }
};

// ---------------------------------------------------------------
// Elemente cachen
// ---------------------------------------------------------------
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

// ================================================================
// RAGEBAIT-INTRO
// Eine Abfolge kleiner "Tricks" im Stil von Level Devil / Trees
// Hate You: jeder Trick bricht eine andere Erwartung (Countdown
// lügt, Balken springt zurück, Regler ist gespiegelt, Button
// flüchtet). Neue Tricks fügst du einfach als weitere Funktion
// zum TRICKS-Array unten hinzu – Reihenfolge = Array-Reihenfolge.
//
// Kein Trick ist hart blockierend: jeder gibt nach ein paar
// Versuchen automatisch nach, damit das Spiel am Ende immer
// startbar bleibt.
// ================================================================
const TRICKS = [trickCountdown, trickProgress, trickMirroredSlider, trickEvadingButton];

function initRagebait() {
    runTrick(0);
    document.getElementById("dev-skip").addEventListener("click", enterMenu);
}

function runTrick(index) {
    if (index >= TRICKS.length) {
        enterMenu();
        return;
    }
    document.getElementById("trick-counter").textContent = `Trick ${index + 1} / ${TRICKS.length}`;
    const stage = document.getElementById("ragebait-stage");
    stage.innerHTML = "";
    TRICKS[index](stage, () => runTrick(index + 1));
}

// ---- Trick 1: Countdown, der sich selbst zurücksetzt ----
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

// ---- Trick 2: Ladebalken, der kurz vor Ende zurückspringt ----
function trickProgress(container, next) {
    container.innerHTML = `
    <h1 id="ragebait-status">Analysiere Chatqualität …</h1>
    <div class="fake-progress"><div id="fake-progress-bar" class="fake-progress-bar"></div></div>
  `;
    const bar = document.getElementById("fake-progress-bar");
    const status = document.getElementById("ragebait-status");
    const messages = [
        "Analysiere Chatqualität …",
        "Zähle Kappa-Emotes …",
        "Suche nach Sinn im Chat …",
        "Bestätige, dass Chat kein Sinn ergibt …",
    ];

    let progress = 0;
    let stall = 0;

    const interval = setInterval(() => {
        if (progress < 92) {
            progress += Math.random() * 9;
            progress = Math.min(progress, 92);
        } else {
            stall++;
            if (stall <= 2) {
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

// ---- Trick 3: gespiegelter Regler – zieht man rechts, geht er links ----
function trickMirroredSlider(container, next) {
    container.innerHTML = `
    <h1>Chat-IQ-Regler</h1>
    <p class="trick-sub">Zieh den Regler ganz nach rechts (Patrick Star).</p>
    <div class="iq-slider-wrap">
      <input type="range" id="iq-slider" min="0" max="4" step="1" value="0" class="iq-slider">
      <div class="iq-stops"><span>Dumm</span><span>Brot</span><span>Fisch</span><span>Patrick Star</span><span>Schlau</span></div>
      <p id="iq-reaction" class="iq-reaction">Viel Erfolg, die Richtung stimmt nicht ganz …</p>
    </div>
  `;
    const slider = document.getElementById("iq-slider");
    const reaction = document.getElementById("iq-reaction");
    const reactions = ["Kalt.", "Wärmer.", "Fast.", "Fast fast.", "Geschafft!"];
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

// ---- Trick 4: Button, der vorm Mauszeiger flieht ----
function trickEvadingButton(container, next) {
    container.innerHTML = `
    <h1>Fast geschafft</h1>
    <p class="trick-sub">Klick auf „Spiel starten“.</p>
    <div class="evade-zone" id="evade-zone">
      <button id="start-btn" class="btn btn-primary evade-btn">Spiel starten</button>
    </div>
  `;
    const zone = document.getElementById("evade-zone");
    const btn = document.getElementById("start-btn");

    let evasions = 0;
    const maxEvasions = 5;

    function onMove(event) {
        if (evasions >= maxEvasions) return;

        const zoneRect = zone.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const btnCenterX = btnRect.left + btnRect.width / 2;
        const btnCenterY = btnRect.top + btnRect.height / 2;
        const dist = Math.hypot(event.clientX - btnCenterX, event.clientY - btnCenterY);
        const dangerRadius = 70;

        if (dist < dangerRadius) {
            evasions++;
            const maxX = Math.max(zoneRect.width - btnRect.width, 0);
            const maxY = Math.max(zoneRect.height - btnRect.height, 0);
            const newX = Math.random() * maxX;
            const newY = Math.random() * maxY;

            btn.classList.add("fleeing");
            btn.style.left = `${newX}px`;
            btn.style.top = `${newY}px`;

            if (evasions >= maxEvasions) {
                btn.classList.remove("fleeing");
                btn.classList.add("ready");
                btn.style.left = "";
                btn.style.top = "";
                btn.textContent = "Ok, genug gerannt 😅 Los geht's";
                zone.removeEventListener("mousemove", onMove);
            }
        }
    }

    zone.addEventListener("mousemove", onMove);
    btn.addEventListener("click", next);
}

// ================================================================
// MENÜ
// ================================================================
function enterMenu() {
    showScreen("menu");
    el.roundCount.textContent = state.rounds.length;
}

// ================================================================
// SPIEL-ABLAUF
// ================================================================
function startGame() {
    state.roundIndex = 0;
    state.score = 0;
    state.results = [];
    startRound();
}

function startRound() {
    state.stageIndex = 0;
    state.solved = false;
    state.wrongNames.clear();
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

// Anzahl der Ratestufen: alle Bilder außer dem letzten
// (das letzte Bild ist immer die volle Aufdeckung).
function guessStageCount(round) {
    return round.images.length - 1;
}

function pointsForStage(round, stageIdx) {
    const stages = guessStageCount(round);
    return Math.max(stages - 1 - stageIdx, 0);
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

    round.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice.name;

        const alreadyWrong = state.wrongNames.has(choice.name);
        if (alreadyWrong) btn.classList.add("wrong");
        btn.disabled = state.solved || isReveal || alreadyWrong;

        btn.addEventListener("click", () => handleChoiceClick(choice, btn));
        el.choices.appendChild(btn);
    });
}

function handleChoiceClick(choice, btnEl) {
    if (state.solved) return;

    if (choice.correct) {
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
        state.wrongNames.add(choice.name);
        el.feedback.textContent = "Nicht ganz – nächster Versuch?";
        el.feedback.className = "feedback bad";
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

    const correctChoice = round.choices.find((c) => c.correct);
    el.revealCard.hidden = false;
    el.revealName.textContent = correctChoice ? correctChoice.name : "?";

    el.revealExtra.innerHTML = "";
    if (correctChoice && correctChoice.extra) {
        Object.entries(correctChoice.extra).forEach(([label, value]) => {
            const wrap = document.createElement("div");
            const dt = document.createElement("dt");
            dt.textContent = label;
            const dd = document.createElement("dd");
            dd.textContent = value;
            wrap.appendChild(dt);
            wrap.appendChild(dd);
            el.revealExtra.appendChild(wrap);
        });
    }
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

// ================================================================
// TASTATURSTEUERUNG (praktisch für Streamer:innen ohne Maus-Fokus)
// Pfeil rechts / Leertaste = nächste Nachricht
// Zahlentasten 1-9         = entsprechende Auswahl anklicken
// ================================================================
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

// ================================================================
// DATEN LADEN & INITIALISIERUNG
// ================================================================
async function loadRounds() {
    const response = await fetch("data/rounds.json");
    if (!response.ok) throw new Error(`rounds.json konnte nicht geladen werden (${response.status})`);
    const data = await response.json();
    return data.rounds || [];
}

async function init() {
    el.beginBtn.addEventListener("click", startGame);
    el.nextStageBtn.addEventListener("click", goToNextStage);
    el.nextRoundBtn.addEventListener("click", goToNextRound);
    el.restartBtn.addEventListener("click", () => {
        showScreen("menu");
    });

    try {
        state.rounds = await loadRounds();
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