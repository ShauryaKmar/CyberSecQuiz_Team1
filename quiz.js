let quiz = [];
let currentIndex = 0;
let score = 0;
let username = "";
let useremail = "";
let department = "";
let answersLog = [];
let startTime = 0;        // total quiz timer
let timerInterval = null; // elapsed timer
const QUESTION_TIME = 20; // seconds per question
let qTimeLeft = QUESTION_TIME;
let qTimerInterval = null;
let answered = false;

const API_URL    = "https://cybersecquiz-team1.onrender.com/api/questions";
const RESULT_URL = "https://cybersecquiz-team1.onrender.com/api/results";

const $ = (id) => document.getElementById(id);
const formatTime = (sec) => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;

function startTotalTimer(){
  startTime = Date.now();
  timerInterval && clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime)/1000);
    $("timer").textContent = formatTime(elapsed);
  }, 1000);
}
function stopTotalTimer(){ timerInterval && clearInterval(timerInterval); timerInterval = null; }

function startQuestionTimer(onTimeout){
  clearQuestionTimer();
  qTimeLeft = QUESTION_TIME;
  $("q-timer").textContent = `${qTimeLeft}s`;
  qTimerInterval = setInterval(() => {
    qTimeLeft -= 1;
    $("q-timer").textContent = `${qTimeLeft}s`;
    if (qTimeLeft <= 0) { clearQuestionTimer(); onTimeout && onTimeout(); }
  }, 1000);
}
function clearQuestionTimer(){ if (qTimerInterval) clearInterval(qTimerInterval); qTimerInterval = null; }

async function loadQuestions(){
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) { alert("No questions found in the database."); return false; }
    quiz = data;
    return true;
  } catch (e) {
    console.error(e);
    alert("Failed to load questions. Please check your connection.");
    return false;
  }
}

$("start-btn").addEventListener("click", async () => {
  username   = $("username").value.trim();
  useremail  = $("useremail").value.trim();
  department = $("department").value.trim();
  if (!username || !useremail || !department) { alert("Please fill in all fields!"); return; }

  const ok = await loadQuestions();
  if (!ok) return;

  currentIndex = 0; score = 0; answersLog = [];
  $("start-screen").style.display = "none";
  $("quiz-screen").style.display  = "block";

  startTotalTimer();
  showQuestion();
});

$("next-btn").addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < quiz.length) showQuestion();
  else endQuiz();
});

function updateProgress(){
  const total = quiz.length, current = currentIndex + 1;
  $("progress-label").textContent = `Question ${current}/${total}`;
  $("progress-bar").style.width = `${Math.round((current/total)*100)}%`;
}

function showQuestion(){
  answered = false;
  $("feedback").textContent = ""; $("feedback").className = "feedback"; $("next-btn").style.display = "none";

  const q = quiz[currentIndex];
  $("question").textContent = q.question;
  updateProgress();

  const optionsDiv = $("options");
  optionsDiv.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.addEventListener("click", () => { if (!answered) handleAnswer(i, q, optionsDiv); });
    optionsDiv.appendChild(btn);
  });

  startQuestionTimer(() => { if (!answered) autoTimeOut(q, optionsDiv); });
}

function lockOptions(optionsDiv, correctIdx, selectedIdx){
  [...optionsDiv.querySelectorAll("button")].forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIdx) b.classList.add("correct");
    if (selectedIdx != null && idx === selectedIdx && selectedIdx !== correctIdx) b.classList.add("wrong");
  });
}

function handleAnswer(selected, q, optionsDiv){
  answered = true; clearQuestionTimer();
  const correct = selected === q.answer;
  lockOptions(optionsDiv, q.answer, selected);

  if (correct) { score++; $("feedback").textContent = "Correct!"; $("feedback").classList.add("ok"); }
  else { $("feedback").textContent = `Wrong! ${q.explanation || "Review company security policies."}`; $("feedback").classList.add("no"); }

  answersLog.push({ questionId: q._id, selected, correct, topic: q.topic || "General" });
  $("next-btn").style.display = "inline-block";
}

function autoTimeOut(q, optionsDiv){
  answered = true;
  lockOptions(optionsDiv, q.answer, null);
  $("feedback").textContent = `Time's up! ${q.explanation || "Review company security policies."}`;
  $("feedback").classList.add("no");
  answersLog.push({ questionId: q._id, selected: null, correct: false, topic: q.topic || "General" });
  $("next-btn").style.display = "inline-block";
}

async function endQuiz(){
  $("quiz-screen").style.display = "none";
  $("end-screen").style.display  = "block";
  $("final-name").textContent  = `Nice work, ${username}.`;
  $("final-score").textContent = `Your Score: ${score} / ${quiz.length}`;

  stopTotalTimer(); clearQuestionTimer();
  const totalTimeSeconds = Math.round((Date.now() - startTime)/1000);

  try {
    await fetch(RESULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username, email: useremail, department,
        answers: answersLog, totalTime: totalTimeSeconds
      })
    });
  } catch (err) {
    console.error("Error saving results:", err);
  }
}

document.getElementById("restart-btn")?.addEventListener("click", () => window.location.reload());
