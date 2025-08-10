// frontend/admin.js
const ANALYTICS_URL = "https://cybersecquiz-team1.onrender.com/api/admin/insights";

document.getElementById("loadData").addEventListener("click", loadAnalytics);

async function loadAnalytics() {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) return alert("Enter API key!");

  try {
    const res = await fetch(ANALYTICS_URL, { headers: { "x-api-key": key } });
    const raw = await res.text();
    console.log("Analytics status:", res.status, res.statusText);
    console.log("Analytics raw body:", raw);

    if (!res.ok) throw new Error(`HTTP ${res.status} – ${raw || "No body"}`);

    const data = JSON.parse(raw);

    // Cards
    const avgScore = Number(data.averageScore);
    const avgTime = Number(data.averageTime);
    document.getElementById("totalResponsesCard").textContent =
      `Total Responses: ${Number(data.totalResponses) || 0}`;
    document.getElementById("avgScoreCard").textContent =
      `Average Score: ${Number.isFinite(avgScore) ? avgScore.toFixed(1) : 0}%`;
    document.getElementById("avgTimeCard").textContent =
      `Average Time: ${Number.isFinite(avgTime) ? Math.round(avgTime) : 0}s`;

    // Charts
    const topics = Array.isArray(data.topicStats) ? data.topicStats : [];
    const scoreDist = Array.isArray(data.scoreDistribution) ? data.scoreDistribution : [];
    console.log("topicStats len:", topics.length, "scoreDistribution len:", scoreDist.length);

    renderTopicChart(topics);
    renderScoreDistChart(scoreDist);

    // Employees table
    const employees = Array.isArray(data.employees) ? data.employees : [];
    console.log("employees len:", employees.length);
    renderEmployeeTable(employees);

  } catch (err) {
    console.error("Admin data fetch error:", err);
    alert(`Failed to load admin data: ${err.message}`);
  }
}

function renderTopicChart(topicStats) {
  const canvas = document.getElementById("topicChart");
  if (!topicStats.length) {
    canvas.parentElement.innerHTML = `<div class="empty">No topic data yet.</div>`;
    return;
  }
  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: topicStats.map(t => t.topic),
      datasets: [{
        label: "% Incorrect",
        data: topicStats.map(t => Number(t.wrongPct).toFixed(1)),
        backgroundColor: "rgba(255, 99, 132, 0.6)"
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function renderScoreDistChart(scoreDist) {
  const canvas = document.getElementById("scoreDistChart");
  if (!scoreDist.length) {
    canvas.parentElement.innerHTML = `<div class="empty">No score distribution yet.</div>`;
    return;
  }
  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: scoreDist.map(s => s.range),
      datasets: [{
        data: scoreDist.map(s => s.count),
        backgroundColor: ["#e74c3c", "#f1c40f", "#2ecc71"]
      }]
    },
    options: { responsive: true }
  });
}

function renderEmployeeTable(employees) {
  const table = document.getElementById("resultsTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  if (!employees.length) {
    // Replace the table with a small empty-state message
    table.insertAdjacentHTML("afterend", `<div class="empty">No employee results yet.</div>`);
    return;
  }

  // Remove any prior empty-state
  const prevEmpty = table.nextElementSibling;
  if (prevEmpty && prevEmpty.classList.contains("empty")) prevEmpty.remove();

  employees.forEach(e => {
    const pct = Number(e.pct) || 0;
    const riskClass = pct < 50 ? "risk-high" : pct < 70 ? "risk-medium" : "risk-low";
    const tr = document.createElement("tr");
    tr.className = riskClass;
    tr.innerHTML = `
      <td>${e.name}</td>
      <td>${e.department}</td>
      <td>${pct.toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  });
}
