// investimentos.js — Controle de investimentos e gráfico de alocação

let chartInstance = null;

// Lista de ativos mockada modificável em memória para simulação interativa
const ATIVOS = {
  cdb: { nome: "CDB Liquidez Diária", classe: "Renda Fixa", valor: 12000.00, rentabilidade: "+10,8% a.a.", yieldRate: 0.0085 },
  pflw3: { nome: "Ações PayFlow S.A. (PFLW3)", classe: "Renda Variável", valor: 6500.00, rentabilidade: "+22,4% a.a.", yieldRate: 0.012 },
  fii: { nome: "Fundo Imobiliário (PFLW11)", classe: "Imobiliário", valor: 4500.00, rentabilidade: "+8,9% a.a.", yieldRate: 0.007 },
  crypto: { nome: "Bitcoin Tracker", classe: "Criptoativos", valor: 1500.00, rentabilidade: "-2,4% a.a.", yieldRate: 0.005 }
};

function inicializarInvestimentos() {
  recalcularEAtualizar();
  carregarGrafico();
}

// Recalcula totais, rendimentos mensais, atualiza a tabela e o gráfico
function recalcularEAtualizar() {
  let totalInvestido = 0;
  let rendimentoEstimado = 0;

  for (const key in ATIVOS) {
    const a = ATIVOS[key];
    totalInvestido += a.valor;
    rendimentoEstimado += a.valor * a.yieldRate;
  }

  // Atualizar DOM
  const totalEl = document.getElementById("invested-total");
  const yieldEl = document.getElementById("monthly-yield");
  if (totalEl) totalEl.textContent = `R$ ${totalInvestido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (yieldEl) yieldEl.textContent = `R$ ${rendimentoEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /mês`;

  // Renderizar Tabela
  const tbody = document.getElementById("assets-table-body");
  if (tbody) {
    tbody.innerHTML = Object.keys(ATIVOS).map(key => {
      const a = ATIVOS[key];
      const formatado = a.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const corRent = a.rentabilidade.startsWith("+") ? "var(--green)" : "var(--error)";
      return `
        <tr style="border-bottom: 1px solid var(--border)">
          <td style="padding: 12px 16px; font-weight:600">${a.nome}</td>
          <td style="padding: 12px 16px; color:var(--muted)">${a.classe}</td>
          <td style="padding: 12px 16px; text-align: right; font-family: var(--mono)">R$ ${formatado}</td>
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
      ATIVOS.cdb.valor,
      ATIVOS.pflw3.valor,
      ATIVOS.fii.valor,
      ATIVOS.crypto.valor
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
    input.value = "1000";
  }
}

// Lógica de compra/resgate na simulação
function realizarInvestimento(tipo) {
  const select = document.getElementById("invest-asset-select");
  const input = document.getElementById("invest-amount");
  if (!select || !input) return;

  const key = select.value;
  const valor = parseFloat(input.value);

  if (isNaN(valor) || valor <= 0) {
    toast("Por favor, insira um valor válido acima de zero.", "⚠️");
    return;
  }

  const ativo = ATIVOS[key];
  if (!ativo) return;

  if (tipo === "buy") {
    ativo.valor += valor;
    toast(`Sucesso! R$ ${valor.toLocaleString("pt-BR")} aplicados em ${ativo.nome}.`, "📈");
  } else {
    // Resgate
    if (valor > ativo.valor) {
      toast(`Saldo insuficiente para resgate. Limite disponível: R$ ${ativo.valor.toLocaleString("pt-BR")}`, "⚠️");
      return;
    }
    ativo.valor -= valor;
    toast(`Sucesso! Resgate de R$ ${valor.toLocaleString("pt-BR")} efetuado de ${ativo.nome}.`, "📉");
  }

  input.value = "";
  recalcularEAtualizar();
}

// Carregar Chart.js de forma assíncrona
function carregarGrafico() {
  const canvas = document.getElementById("investments-chart");
  if (!canvas) return;

  function renderizarGrafico() {
    const ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Renda Fixa", "Renda Variável", "Imobiliários", "Criptoativos"],
        datasets: [{
          data: [ATIVOS.cdb.valor, ATIVOS.pflw3.valor, ATIVOS.fii.valor, ATIVOS.crypto.valor],
          backgroundColor: [
            "rgba(91, 168, 90, 0.75)",  // verde
            "rgba(77, 217, 240, 0.75)", // azul neon
            "rgba(245, 200, 66, 0.75)",  // amarelo/sol
            "rgba(212, 160, 23, 0.75)"   // dourado
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
              color: "#2c1f00",
              font: {
                family: "'Space Grotesk', monospace",
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

// Inicializar na montagem do script
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
