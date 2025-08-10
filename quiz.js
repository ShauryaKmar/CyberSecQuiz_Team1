let quiz = [];
let currentIndex = 0;
let score = 0;
let username = "";
let useremail = "";
let department = "";
let answersLog = [];
let startTime = 0;        // total quiz timer start
let timerInterval = null; // total quiz timer interval

// NEW: per-question timer
const QUESTION_TIME = 20; // seconds per question (change if you want)
let qTimeLeft = QUESTION_TIME;
let qTimerInterval = null;
let answered = false;     // guards double-answers/timeouts

// BACKEND endpoints
const API_URL    = "https://cybersecquiz-team1.onrender.com/api/questions";
const RESULT_URL = "https://cybersecquiz-team1.onrender.com/api/results";

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);

function formatTime(totalSeconds){
  const m = Math.floor(totalSeconds/60);
  const s = totalSeconds%60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function startTotalTimer(){
  startTime = Date.now();
  timerInterval && clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime)/1000);
    $("timer").textContent = formatTime(elapsed);
  }, 1000);
}

function stopTotalTimer(){
  timerInterval && clearInterval(timerInterval);
  timerInterval = null;
}

function startQuestionTimer(onTimeout){
  clearQuestionTimer();
  qTimeLeft = QUESTION_TIME;
  $("q-timer").textContent = `${qTimeLeft}s`;
  qTimerInterval = setInterval(() => {
    qTimeLeft -= 1;
    $("q-timer").textContent = `${qTimeLeft}s`;
    if (qTimeLeft <= 0) {
      clearQuestionTimer();
      onTimeout && onTimeout();
    }
  }, 1000);
}

function clearQuestionTimer(){
  if (qTimerInterval) clearInterval(qTimerInterval);
  qTimerInterval = null;
}

/* ---------- load questions ---------- */
async function loadQuestions() {
  try {
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      alert("No questions found in the database.");
      return false;
    }
    quiz = data;
    return true;
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Please check your connection.");
    return false;
  }
}

/* ---------- start ---------- */
$("start-btn").addEventListener("click", async () => {
  username   = $("username").value.trim();
  useremail  = $("useremail").value.trim();
  department = $("department").value.trim();

  if (!username || !useremail || !department) {
    alert("Please fill in all fields!");
    return;
  }

  const ok = await loadQuestions();
  if (!ok) return;

  // init state
  currentIndex = 0;
  score = 0;
  answersLog = [];

  $("start-screen").style.display = "none";
  $("quiz-screen").style.display = "block";

  startTotalTimer(); // elapsed time chip
  showQuestion();
});

/* ---------- navigation ---------- */
$("next-btn").addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < quiz.length) {
    showQuestion();
  } else {
    endQuiz();
  }
});

/* ---------- UI updates ---------- */
function updateProgress() {
  const total = quiz.length;
  const current = currentIndex + 1;
  $("progress-label").textContent = `Question ${current}/${total}`;
  const pct = Math.round((current / total) * 100);
  $("progress-bar").style.width = `${pct}%`;
}

function showQuestion() {
  // reset per-question state
  answered = false;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("next-btn").style.display = "none";

  const q = quiz[currentIndex];
  $("question").textContent = q.question;
  updateProgress();

  const optionsDiv = $("options");
  optionsDiv.innerHTML = "";

  // build option buttons
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.setAttribute("data-index", i);
    btn.addEventListener("click", () => {
      if (answered) return; // guard double click
      handleAnswer(i, q, optionsDiv);
    });
    optionsDiv.appendChild(btn);
  });

  // start per-question timer
  startQuestionTimer(() => {
    if (answered) return; // already answered
    // time's up -> auto-mark incorrect (no selection)
    autoTimeOut(q, optionsDiv);
  });
}

function lockOptions(optionsDiv, correctIdx, selectedIdx){
  [...optionsDiv.querySelectorAll("button")].forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIdx) b.classList.add("correct");
    if (selectedIdx != null && idx === selectedIdx && selectedIdx !== correctIdx) {
      b.classList.add("wrong");
    }
  });
}

function handleAnswer(selected, q, optionsDiv){
  answered = true;
  clearQuestionTimer();

  const correct = selected === q.answer;
  lockOptions(optionsDiv, q.answer, selected);

  if (correct) {
    score++;
    $("feedback").textContent = "Correct!";
    $("feedback").classList.add("ok");
  } else {
    $("feedback").textContent = `Wrong! ${q.explanation || "Review company security policies."}`;
    $("feedback").classList.add("no");
  }

  // log attempt
  answersLog.push({
    questionId: q._id,
    selected,
    correct,
    topic: q.topic || "General"
  });

  $("next-btn").style.display = "inline-block";
}

function autoTimeOut(q, optionsDiv){
  answered = true;

  // lock options, highlight only the correct answer (no selection)
  lockOptions(optionsDiv, q.answer, null);

  $("feedback").textContent = `Time's up! ${q.explanation || "Review company security policies."}`;
  $("feedback").classList.add("no");

  // log with selected = null, correct = false
  answersLog.push({
    questionId: q._id,
    selected: null,
    correct: false,
    topic: q.topic || "General"
  });

  $("next-btn").style.display = "inline-block";
}

async function endQuiz() {
  $("quiz-screen").style.display = "none";
  $("end-screen").style.display = "block";
  $("final-name").textContent = `Nice work, ${username}.`;
  $("final-score").textContent = `Your Score: ${score} / ${quiz.length}`;

  stopTotalTimer();
  clearQuestionTimer();

  const totalTimeSeconds = Math.round((Date.now() - startTime) / 1000);

  // Save results
  try {
    await fetch(RESULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username,
        email: useremail,
        department,
        answers: answersLog,
        totalTime: totalTimeSeconds
      })
    });
  } catch (err) {
    console.error("Error saving results:", err);
  }
}

/* ---------- restart ---------- */
$("restart-btn")?.addEventListener("click", () => {
  window.location.reload();
});
