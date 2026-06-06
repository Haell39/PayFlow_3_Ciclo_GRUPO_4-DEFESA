// dashboard.js — Dados mockados de saúde para o dashboard ConectaSaúde

const MOCK_STATS = [
  { label: "Consultas Agendadas", value: "3", icon: "🗓️", trend: "+1",  up: true  },
  { label: "Consultas Realizadas", value: "14", icon: "✅", trend: "+3", up: true  },
  { label: "Postos Próximos",     value: "5", icon: "🏥", trend: "Ativo", up: true },
  { label: "Campanhas de Vacina", value: "2", icon: "💉", trend: "Ativas", up: true  },
];

const MOCK_CHART = {
  labels:     ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
  agendadas:  [5, 8, 4, 9, 6, 3],
  realizadas: [4, 7, 4, 8, 5, 3],
};

const MOCK_RECENTES = [
  { id: 1, nome: "Clínico Geral · Dra. Cláudia Santos", tipo: "sus",        cat: "UBS Central - Centro",         data: "2026-06-08" },
  { id: 2, nome: "Cardiologia · Dr. Marco Aurélio",     tipo: "particular", cat: "Hospital Universitário",       data: "2026-06-12" },
  { id: 3, nome: "Odontologia · Dra. Amanda Reis",      tipo: "sus",        cat: "UBS Zona Sul - Nova Brasília", data: "2026-06-15" },
];

function renderStats() {
  const grid = document.getElementById("stats-grid");
  if (!grid) return;
  grid.innerHTML = MOCK_STATS.map(
    (s) => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
      </div>
      <div class="stat-trend ${s.up ? "up" : "down"}">${s.trend}</div>
    </div>`
  ).join("");
}

function renderRecentTx() {
  const list = document.getElementById("recent-tx");
  if (!list) return;
  list.innerHTML = "";

  MOCK_RECENTES.forEach((tx) => {
    const icon  = tx.tipo === "sus" ? "🩺" : "🏥";
    const data  = new Date(tx.data + "T00:00:00").toLocaleDateString("pt-BR");

    const item = document.createElement("div");
    item.className = "tx-item";

    const iconDiv = document.createElement("div");
    iconDiv.className = "tx-icon";
    iconDiv.textContent = icon;

    const body = document.createElement("div");
    body.className = "tx-body";

    const name = document.createElement("div");
    name.className = "tx-name";
    name.textContent = tx.nome;

    const meta = document.createElement("div");
    meta.className = "tx-meta";
    meta.textContent = `${tx.cat} · ${data}`;

    const amount = document.createElement("div");
    amount.className = "tx-amount";
    amount.style.color = tx.tipo === "sus" ? "var(--green)" : "var(--sun)";
    amount.textContent = tx.tipo === "sus" ? "SUS" : "Convênio";

    body.appendChild(name);
    body.appendChild(meta);
    item.appendChild(iconDiv);
    item.appendChild(body);
    item.appendChild(amount);
    list.appendChild(item);
  });
}

function renderChart() {
  const canvas = document.getElementById("balance-chart");
  if (!canvas) return;

  function drawChart() {
    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: MOCK_CHART.labels,
        datasets: [
          {
            label: "Agendadas",
            data: MOCK_CHART.agendadas,
            backgroundColor: "rgba(30,98,235,0.75)",
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Realizadas",
            data: MOCK_CHART.realizadas,
            backgroundColor: "rgba(16,185,129,0.75)",
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#64748b", font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } },
          },
        },
        scales: {
          x: { ticks: { color: "#64748b" }, grid: { color: "rgba(0,0,0,0.05)" } },
          y: {
            ticks: { color: "#64748b", stepSize: 2 },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
        },
      },
    });
  }

  if (typeof Chart !== "undefined") {
    drawChart();
  } else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    s.onload = drawChart;
    document.head.appendChild(s);
  }
}

renderStats();
renderRecentTx();
renderChart();
