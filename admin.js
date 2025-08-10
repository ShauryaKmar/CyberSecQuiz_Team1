document.getElementById("loadData").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) {
    alert("Enter API key!");
    return;
  }

  try {
    const res = await fetch("https://cybersecquiz-team1.onrender.com/api/admin/analytics", {
      headers: { "x-api-key": key }
    });

    if (!res.ok) {
      let errMsg = `Server responded with ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errMsg += `: ${errData.error}`;
      } catch (_) {
        // ignore JSON parse errors
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    renderCharts(data.topicStats);
    renderRiskTable(data.highRisk);

  } catch (err) {
    console.error("Admin data fetch error:", err);
    alert(`Failed to load admin data: ${err.message}`);
  }
});

function renderCharts(topicStats) {
  const ctx = document.getElementById("topicChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: topicStats.map(t => t.topic),
      datasets: [{
        label: "% Incorrect",
        data: topicStats.map(t => parseFloat(t.wrongPct).toFixed(1)),
        backgroundColor: "rgba(255, 99, 132, 0.6)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function renderRiskTable(highRisk) {
  const tbody = document.querySelector("#riskTable tbody");
  tbody.innerHTML = "";
  highRisk.forEach(emp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${emp.name}</td><td>${emp.department}</td><td>${emp.pct.toFixed(1)}%</td>`;
    tbody.appendChild(tr);
  });
}
