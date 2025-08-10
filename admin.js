const ADMIN_BASE = "https://cybersecquiz-team1.onrender.com/api/admin";

async function fetchAdminData(key) {
  const urls = [`${ADMIN_BASE}/insights`, `${ADMIN_BASE}/analytics`]; // fallback
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "x-api-key": key } });
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${txt || "No body"}`);
      return JSON.parse(txt);
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function fetchEmployeeDetail(key, email) {
  const url = `${ADMIN_BASE}/employee?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { "x-api-key": key } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${txt || "No body"}`);
  return JSON.parse(txt);
}


document.getElementById("loadData").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) return alert("Enter Admin Key!");

  try {
    const data = await fetchAdminData(key);

    // cards
    const avgScore = Number(data.averageScore);
    const avgTime  = Number(data.averageTime);
    document.getElementById("totalResponsesCard").textContent =
      `Total Responses: ${Number(data.totalResponses) || 0}`;
    document.getElementById("avgScoreCard").textContent =
      `Average Score: ${Number.isFinite(avgScore) ? avgScore.toFixed(1) : 0}%`;
    document.getElementById("avgTimeCard").textContent =
      `Average Time: ${Number.isFinite(avgTime) ? Math.round(avgTime) : 0}s`;

    renderTopicChart(Array.isArray(data.topicStats) ? data.topicStats : []);
    renderScoreDistChart(Array.isArray(data.scoreDistribution) ? data.scoreDistribution : []);
    renderEmployeeTable(Array.isArray(data.employees) ? data.employees : []);
  } catch (err) {
    console.error("Admin load error:", err);
    alert(`Failed to load admin data: ${err.message}`);
  }
});

function renderTopicChart(topicStats) {
  const canvas = document.getElementById("topicChart");
  if (!topicStats.length) {
    canvas.parentElement.innerHTML = `<div class="empty">No topic data yet.</div>`;
    return;
  }
  new Chart(canvas.getContext("2d"), {
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
  new Chart(canvas.getContext("2d"), {
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
    table.insertAdjacentHTML("afterend", `<div class="empty">No employee results yet.</div>`);
    return;
  }
  const prevEmpty = table.nextElementSibling;
  if (prevEmpty && prevEmpty.classList.contains("empty")) prevEmpty.remove();

  employees.forEach(e => {
    const pct = Number(e.pct) || 0;
    const riskClass = pct < 50 ? "risk-high" : pct < 70 ? "risk-medium" : "risk-low";
    const tr = document.createElement("tr");
    tr.className = riskClass;
    tr.dataset.email = e.email || "";     // <-- store email
    tr.innerHTML = `
      <td class="clickable">${e.name}</td>
      <td class="clickable">${e.department}</td>
      <td class="clickable">${pct.toFixed(1)}%</td>
    `;
    tr.addEventListener("click", async () => {
      const key = document.getElementById("apiKey").value.trim();
      if (!key) return alert("Enter Admin Key first.");
      if (!tr.dataset.email) return alert("No email found for this record.");
      try {
        const data = await fetchEmployeeDetail(key, tr.dataset.email);
        showEmployeeModal(data);
      } catch (err) {
        console.error("Employee detail error:", err);
        alert(`Failed to load employee detail: ${err.message}`);
      }
    });
    tbody.appendChild(tr);
  });

  function showEmployeeModal(data) {
  const modal = document.getElementById("empModal");
  const title = document.getElementById("empTitle");
  const summary = document.getElementById("empSummary");
  const weak = document.getElementById("empWeak");
  const ansBody = document.getElementById("empAnswers");
  const attBody = document.getElementById("empAttempts");

  // Title
  title.textContent = `${data.profile.name} — ${data.profile.email}`;

  // Summary chips
  const avg = Number(data.summary.avgScore) || 0;
  const last = Number(data.summary.lastScore) || 0;
  const avgTime = Number(data.summary.avgTime) || 0;
  summary.innerHTML = `
    <span class="chip">Department: ${data.profile.department || "—"}</span>
    <span class="chip">Attempts: ${data.profile.attempts || 0}</span>
    <span class="chip">Avg Score: ${avg.toFixed(1)}%</span>
    <span class="chip">Last Score: ${last.toFixed(1)}%</span>
    <span class="chip">Avg Time: ${Math.round(avgTime)}s</span>
  `;

  // Weak topics
  weak.innerHTML = "";
  (data.summary.weakTopics || []).forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.topic} (${t.wrongCount})`;
    weak.appendChild(li);
  });
  if (!weak.children.length) {
    const li = document.createElement("li");
    li.textContent = "No weak topics detected.";
    weak.appendChild(li);
  }

  // Last attempt answers
  ansBody.innerHTML = "";
  (data.lastAttempt?.answers || []).forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.question}</td>
      <td>${a.topic || "General"}</td>
      <td>${a.selectedText || "(no answer)"}</td>
      <td>${a.correctText || ""}</td>
      <td class="${a.correct ? "ok" : "no"}">${a.correct ? "Correct" : "Wrong"}</td>
    `;
    ansBody.appendChild(tr);
  });
  if (!ansBody.children.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">No answers found for last attempt.</td>`;
    ansBody.appendChild(tr);
  }

  // Attempts list
  attBody.innerHTML = "";
  (data.attempts || []).forEach(a => {
    const d = new Date(a.date);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.toLocaleString()}</td>
      <td>${a.score}/${a.total} (${(Number(a.pct)||0).toFixed(1)}%)</td>
      <td>${a.totalTime != null ? (a.totalTime + "s") : "—"}</td>
    `;
    attBody.appendChild(tr);
  });

  // Show
  modal.style.display = "grid";

  // Close handlers
  const closeBtn = document.getElementById("empClose");
  const backdrop = modal.querySelector("[data-close]");
  const close = () => (modal.style.display = "none");
  closeBtn.onclick = close;
  backdrop.onclick = close;
  document.addEventListener("keydown", escClose);
  function escClose(e){ if (e.key === "Escape") { close(); document.removeEventListener("keydown", escClose); } }
}

}
