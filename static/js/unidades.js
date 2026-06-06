// unidades.js
// Controle das unidades de atendimento e gráfico de fluxo de pacientes

let chartInstance = null;

// Lista de postos e hospitais mockados
const ATIVOS = {
  ubs_centro: { nome: "UBS Central - Centro", classe: "Clínico Geral / Vacinação", valor: 120, rentabilidade: "Espera: 15min", yieldRate: 1.2 },
  ubs_sul: { nome: "UBS Zona Sul - Nova Brasília", classe: "Odontologia / Pediatria", valor: 85, rentabilidade: "Espera: 35min", yieldRate: 0.85 },
  hu: { nome: "Hospital Universitário", classe: "Emergência / Especialidades", valor: 240, rentabilidade: "Espera: 10min", yieldRate: 2.4 },
  clinica: { nome: "Clínica Integrada Conecta", classe: "Exames / Consultas", valor: 45, rentabilidade: "Espera: 5min", yieldRate: 0.45 }
};

function inicializarInvestimentos() {
  recalcularEAtualizar();
  carregarGrafico();
}

// Recalcula totais, tempo de espera médio, atualiza a tabela e o gráfico
function recalcularEAtualizar() {
  let totalAtendimentos = 0;
  let tempoMedioEspera = 0;
  let count = 0;

  for (const key in ATIVOS) {
    const a = ATIVOS[key];
    totalAtendimentos += a.valor;
    // Extrai o número do tempo de espera ex: "Espera: 15min" -> 15
    const espera = parseInt(a.rentabilidade.replace(/\D/g, "")) || 0;
    tempoMedioEspera += espera;
    count++;
  }

  const tempoMedio = count > 0 ? Math.round(tempoMedioEspera / count) : 0;

  // Atualizar DOM
  const totalEl = document.getElementById("total-units");
  const yieldEl = document.getElementById("waiting-time");
  if (totalEl) totalEl.textContent = `${totalAtendimentos} Pacientes`;
  if (yieldEl) yieldEl.textContent = `${tempoMedio} min`;

  // Renderizar Tabela
  const tbody = document.getElementById("assets-table-body");
  if (tbody) {
    tbody.innerHTML = Object.keys(ATIVOS).map(key => {
      const a = ATIVOS[key];
      const corRent = parseInt(a.rentabilidade.replace(/\D/g, "")) < 20 ? "var(--green)" : "var(--error)";
      return `
        <tr style="border-bottom: 1px solid var(--border)">
          <td style="padding: 12px 16px; font-weight:600">${a.nome}</td>
          <td style="padding: 12px 16px; color:var(--muted)">${a.classe}</td>
          <td style="padding: 12px 16px; text-align: right; font-family: var(--mono)">${a.valor} at.</td>
          <td style="padding: 12px 16px; text-align: right; font-weight:700; color: ${corRent}">${a.rentabilidade}</td>
          <td style="padding: 12px 16px; text-align: center;">
            <button class="btn btn-ghost" style="width:auto; padding: 4px 10px; font-size:11px; margin:0" onclick="preencherSimulacao('${key}')">Selecionar</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Atualizar Gráfico se existir
  if (chartInstance) {
    chartInstance.data.datasets[0].data = [
      ATIVOS.ubs_centro.valor,
      ATIVOS.ubs_sul.valor,
      ATIVOS.hu.valor,
      ATIVOS.clinica.valor
    ];
    chartInstance.update();
  }
}

// Preenche o campo de simulação rápida
function preencherSimulacao(key) {
  const select = document.getElementById("invest-asset-select");
  if (select) select.value = key;
  const input = document.getElementById("invest-amount");
  if (input) {
    input.focus();
    input.value = "Sintoma leve";
  }
}

// Lógica de simulação de fluxo (entrada/saída de pacientes na fila)
function realizarInvestimento(tipo) {
  const select = document.getElementById("invest-asset-select");
  const input = document.getElementById("invest-amount");
  if (!select || !input) return;

  const key = select.value;
  const ativo = ATIVOS[key];
  if (!ativo) return;

  if (tipo === "buy") {
    ativo.valor += 1;
    toast(`Sucesso! Paciente deu entrada na unidade: ${ativo.nome}.`, "🏥");
  } else {
    if (ativo.valor <= 0) {
      toast("Unidade sem pacientes na fila.", "⚠️");
      return;
    }
    ativo.valor -= 1;
    toast(`Sucesso! Alta concedida a paciente na unidade: ${ativo.nome}.`, "✅");
  }

  input.value = "";
  recalcularEAtualizar();
}

// Carregar Chart.js
function carregarGrafico() {
  const canvas = document.getElementById("investments-chart");
  if (!canvas) return;

  function renderizarGrafico() {
    const ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["UBS Central", "UBS Zona Sul", "Hosp. Universitário", "Clínica Conecta"],
        datasets: [{
          data: [ATIVOS.ubs_centro.valor, ATIVOS.ubs_sul.valor, ATIVOS.hu.valor, ATIVOS.clinica.valor],
          backgroundColor: [
            "rgba(30, 98, 235, 0.75)",  // azul hospital
            "rgba(99, 144, 242, 0.75)", // azul claro
            "rgba(249, 115, 22, 0.75)",  // laranja
            "rgba(16, 185, 129, 0.75)"   // verde
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#0f172a",
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: "600"
              }
            }
          }
        },
        cutout: "60%"
      }
    });
  }

  if (typeof Chart !== "undefined") {
    renderizarGrafico();
  } else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    s.onload = renderizarGrafico;
    document.head.appendChild(s);
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", inicializarInvestimentos);
if (document.readyState === "complete" || document.readyState === "interactive") {
  inicializarInvestimentos();
}

document.addEventListener("DOMContentLoaded", () => {
    const btnBuy = document.getElementById("btn-investir-buy");
    if(btnBuy) btnBuy.addEventListener("click", () => realizarInvestimento('buy'));

    const btnSell = document.getElementById("btn-investir-sell");
    if(btnSell) btnSell.addEventListener("click", () => realizarInvestimento('sell'));
});
