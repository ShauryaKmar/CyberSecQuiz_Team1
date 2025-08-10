document.getElementById("loadData").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) return alert("Enter API key!");

  try {
    const res = await fetch("https://cybersecquiz-team1.onrender.com/api/admin/analytics", {
      headers: { "x-api-key": key }
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();

    // Update cards
    document.getElementById("totalResponsesCard").textContent = `Total Responses: ${data.totalResponses}`;
    document.getElementById("avgScoreCard").textContent = `Average Score: ${data.averageScore.toFixed(1)}%`;
    document.getElementById("avgTimeCard").textContent = `Average Time: ${Math.round(data.averageTime)}s`;

    renderTopicChart(data.topicStats);
    renderScoreDistChart(data.scoreDistribution);
    renderEmployeeTable(data.allResults);

  } catch (err) {
    console.error(err);
    alert("Failed to load admin data");
  }
});

function renderTopicChart(topicStats) {
  const ctx = document.getElementById("topicChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: topicStats.map(t => t.topic),
      datasets: [{
        label: "% Incorrect",
        data: topicStats.map(t => t.wrongPct.toFixed(1)),
        backgroundColor: "rgba(255, 99, 132, 0.6)"
      }]
    }
  });
}

function renderScoreDistChart(scoreDist) {
  const ctx = document.getElementById("scoreDistChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: scoreDist.map(s => s.range),
      datasets: [{
        label: "Employees",
        data: scoreDist.map(s => s.count),
        backgroundColor: ["#e74c3c", "#f1c40f", "#2ecc71"]
      }]
    }
  });
}

function renderEmployeeTable(results) {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";
  results.forEach(r => {
    const pct = (r.score / r.answers.length) * 100;
    let riskClass = pct < 50 ? "risk-high" : pct < 70 ? "risk-medium" : "risk-low";

    const tr = document.createElement("tr");
    tr.classList.add(riskClass);
    tr.innerHTML = `<td>${r.name}</td><td>${r.department}</td><td>${pct.toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
}
