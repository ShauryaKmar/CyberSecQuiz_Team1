let quiz = [];
let currentIndex = 0;
let score = 0;
let username = "";

// ✅ Change this to your deployed backend URL if not testing locally
const API_URL = "https://cybersecquiz-team1.onrender.com/api/questions"; 

async function loadQuestions() {
  try {
    const res = await fetch(API_URL);
    quiz = await res.json();

    if (!Array.isArray(quiz) || quiz.length === 0) {
      alert("No questions found in the database.");
      return;
    }
  } catch (error) {
    console.error("Error loading questions:", error);
    alert("Failed to load questions. Please check your connection.");
  }
}

document.getElementById("start-btn").addEventListener("click", async () => {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your name!");
    return;
  }

  await loadQuestions(); // fetch from backend

  if (quiz.length > 0) {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("quiz-screen").style.display = "block";
    showQuestion();
  }
});

document.getElementById("next-btn").addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < quiz.length) {
    showQuestion();
  } else {
    showCertificate();
  }
});

function showQuestion() {
  document.getElementById("feedback").textContent = "";
  document.getElementById("next-btn").style.display = "none";

  const q = quiz[currentIndex];
  document.getElementById("question").textContent = q.question;
  document.getElementById("question-progress").textContent = `Question ${currentIndex + 1} of ${quiz.length}`;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i, q);
    optionsDiv.appendChild(btn);
  });
}

function checkAnswer(selected, q) {
  if (selected === q.answer) {
    score++;
    document.getElementById("feedback").textContent = "✅ Correct!";
  } else {
    document.getElementById("feedback").textContent = `❌ Wrong! ${q.explanation || "Review company security policies."}`;
  }
  document.getElementById("next-btn").style.display = "block";
}

function showCertificate() {
  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("certificate-screen").style.display = "block";
  document.getElementById("cert-name").textContent = `Awarded to: ${username}`;
  document.getElementById("cert-score").textContent = `${score} / ${quiz.length}`;
  document.getElementById("badge").textContent = score === quiz.length ? "🏆 Gold" : score >= quiz.length * 0.7 ? "🥈 Silver" : "🥉 Bronze";
}
