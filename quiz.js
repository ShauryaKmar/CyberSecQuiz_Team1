let quiz = [];
let currentIndex = 0;
let score = 0;
let username = "";
let useremail = "";
let department = "";
let answersLog = [];

// Backend URL
const API_URL = "https://cybersecquiz-team1.onrender.com/api/questions"; 
const RESULT_URL = "https://cybersecquiz-team1.onrender.com/api/results";

// Load questions
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

// Start Quiz
document.getElementById("start-btn").addEventListener("click", async () => {
  username = document.getElementById("username").value.trim();
  useremail = document.getElementById("useremail").value.trim();
  department = document.getElementById("department").value.trim();

  if (!username || !useremail || !department) {
    alert("Please fill in all fields!");
    return;
  }

  await loadQuestions();

  if (quiz.length > 0) {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("quiz-screen").style.display = "block";
    showQuestion();
  }
});

// Next Button
document.getElementById("next-btn").addEventListener("click", () => {
  currentIndex++;
  if (currentIndex < quiz.length) {
    showQuestion();
  } else {
    endQuiz();
  }
});

// Show Question
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

// Check Answer
function checkAnswer(selected, q) {
  const correct = selected === q.answer;
  if (correct) {
    score++;
    document.getElementById("feedback").textContent = "✅ Correct!";
  } else {
    document.getElementById("feedback").textContent = `❌ Wrong! ${q.explanation || "Review company security policies."}`;
  }

  answersLog.push({
    questionId: q._id,
    selected,
    correct,
    topic: q.topic || "General"
  });

  document.getElementById("next-btn").style.display = "block";
}

// End Quiz
async function endQuiz() {
  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("end-screen").style.display = "block";
  document.getElementById("final-name").textContent = `Well done, ${username}!`;
  document.getElementById("final-score").textContent = `Your Score: ${score} / ${quiz.length}`;

  // Save results to backend
  try {
    await fetch(RESULT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username,
        email: useremail,
        department,
        answers: answersLog,
        totalTime: 0
      })
    });
  } catch (err) {
    console.error("Error saving results:", err);
  }
}
