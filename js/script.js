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
// Kann bei Bedarf beliebig erweitert werden (siehe IDEEN-BEREICH
// im HTML). Zwei Sachen laufen hier parallel:
//  1) eine gefaketen Ladebalken, der kurz vor Ende hängen bleibt
//  2) ein "Spiel starten"-Button, der vor dem Mauszeiger flüchtet
// Beides ist NICHT hart blockierend: nach ein paar Versuchen /
// Sekunden gibt das System nach, und es gibt immer einen kleinen
// "direkt weiter"-Link für alle, die einfach nur spielen wollen.
// ================================================================
function initRagebait() {
    initFakeProgress();
    initIqSlider();
    initEvadingButton();

    document.getElementById("skip-ragebait").addEventListener("click", enterMenu);
}

function initFakeProgress() {
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
    status.textContent = messages[0];

    const interval = setInterval(() => {
        if (progress < 92) {
            progress += Math.random() * 9;
            progress = Math.min(progress, 92);
        } else {
            // kurz vor Ende "hängt" die Leiste ein paar Mal
            stall++;
            if (stall <= 2) {
                progress -= 18;
                status.textContent = messages[Math.min(stall, messages.length - 1)];
            } else {
                progress = 100;
                status.textContent = "Fertig. Viel Erfolg.";
                clearInterval(interval);
            }
        }
        bar.style.width = `${progress}%`;
    }, 550);
}

function initIqSlider() {
    const slider = document.getElementById("iq-slider");
    const reaction = document.getElementById("iq-reaction");
    const reactions = [
        "Ehrlich gesagt fair.",
        "Immerhin ein Anfang.",
        "Solide Mitte.",
        "Respekt, großer Fisch-Energie.",
        "Patrick-Star-Niveau erreicht. Läuft.",
    ];

    slider.addEventListener("input", () => {
        reaction.textContent = reactions[Number(slider.value)];
    });
}

function initEvadingButton() {
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
    btn.addEventListener("click", enterMenu);
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
        el.feedback.textContent = "Falsch – nächster Versuch";
        el.feedback.className = "feedback bad";

        goToNextStage()
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