// dashboard.js — dados mockados para o dashboard

const MOCK_STATS = [
  { label: "Saldo atual",    value: "R$ 12.847,50", icon: "💰", trend: "+8,2%",  up: true  },
  { label: "Receitas (mês)", value: "R$  4.320,00", icon: "📈", trend: "+12,5%", up: true  },
  { label: "Despesas (mês)", value: "R$  2.190,30", icon: "📉", trend: "-3,1%",  up: false },
  { label: "Transações",     value: "12",            icon: "🔄", trend: "+4",     up: true  },
];

const MOCK_CHART = {
  labels:   ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
  receitas: [3800, 4200, 3600, 5100, 4700, 4320],
  despesas: [2100, 1800, 2400, 1950, 2300, 2190],
};

const MOCK_RECENTES = [
  { id: 1, nome: "Salário",          valor: 3500.00, tipo: "credit", cat: "Renda",       data: "2025-06-02" },
  { id: 2, nome: "Supermercado",     valor:  320.50, tipo: "debit",  cat: "Alimentação", data: "2025-06-01" },
  { id: 3, nome: "Netflix",          valor:   45.90, tipo: "debit",  cat: "Lazer",       data: "2025-05-31" },
  { id: 4, nome: "Freelance Design", valor:  820.00, tipo: "credit", cat: "Renda",       data: "2025-05-30" },
  { id: 5, nome: "Conta de Luz",     valor:  198.40, tipo: "debit",  cat: "Moradia",     data: "2025-05-29" },
];

const CAT_ICONS = {
  Renda: "💼", Alimentação: "🛒", Lazer: "🎬", Moradia: "🏠", Transporte: "🚗",
  Saúde: "🏥", Educação: "📚", Serviços: "🔧", Transferência: "↔️", Outros: "📦",
};

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
    const sinal = tx.tipo === "credit" ? "+" : "-";
    const cor   = tx.tipo === "credit" ? "var(--green)" : "var(--red)";
    const icon  = CAT_ICONS[tx.cat] || "📦";
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
    amount.style.color = cor;
    amount.textContent = `${sinal} R$ ${tx.valor.toFixed(2).replace(".", ",")}`;

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
            label: "Receitas",
            data: MOCK_CHART.receitas,
            backgroundColor: "rgba(99,179,237,0.75)",
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Despesas",
            data: MOCK_CHART.despesas,
            backgroundColor: "rgba(252,129,129,0.65)",
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
            labels: { color: "#a0aec0", font: { family: "'Syne', sans-serif", size: 12 } },
          },
        },
        scales: {
          x: { ticks: { color: "#718096" }, grid: { color: "rgba(255,255,255,0.05)" } },
          y: {
            ticks: { color: "#718096", callback: (v) => "R$ " + v.toLocaleString("pt-BR") },
            grid: { color: "rgba(255,255,255,0.05)" },
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
