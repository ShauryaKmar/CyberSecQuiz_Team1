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
}
