// cartao_sus.js
// Controle interativo do Cartão SUS digital e vínculo com plano de saúde.

let realCvv = "02"; // Via do convênio
let virtualCardActive = false;

// Sincronizar dados do titular e inicializar eventos
async function inicializarCartoes() {
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      const nomeFormatado = data.nome.toUpperCase();
      const cardHolder = document.getElementById("card-holder-name");
      const vcardHolder = document.getElementById("vcard-holder-name");
      if (cardHolder) cardHolder.textContent = nomeFormatado;
      if (vcardHolder) vcardHolder.textContent = nomeFormatado;
    }
  } catch (e) {
    console.error("Erro ao carregar titular do cartão:", e);
  }

  // Inicializar controles de Limite de Compartilhamento
  const slider = document.getElementById("limit-slider");
  if (slider) {
    slider.addEventListener("input", atualizarLimite);
    atualizarLimite();
  }

  // Inicializar toggle de bloqueio (Ocultar dados)
  const blockSwitch = document.getElementById("block-switch");
  if (blockSwitch) {
    blockSwitch.addEventListener("change", function(e) {
      const card = document.getElementById("physical-card");
      if (e.target.checked) {
        card.classList.add("blocked");
        toast("Número do cartão SUS ocultado na tela!", "🔒");
      } else {
        card.classList.remove("blocked");
        toast("Número do cartão SUS visível!", "🔓");
      }
    });
  }
}

// Atualiza valores de compartilhamento de dados
function atualizarLimite() {
  const slider = document.getElementById("limit-slider");
  const limitUsedEl = document.getElementById("limit-used");
  const limitAvailableEl = document.getElementById("limit-available");
  
  if (!slider || !limitUsedEl || !limitAvailableEl) return;
  
  const val = parseInt(slider.value);
  if (val === 1) {
    limitUsedEl.textContent = "Restrito";
    limitUsedEl.style.color = "var(--error)";
    limitAvailableEl.textContent = "Apenas Emergências";
  } else if (val === 2) {
    limitUsedEl.textContent = "Parcial";
    limitUsedEl.style.color = "var(--sun)";
    limitAvailableEl.textContent = "Conformidade LGPD";
  } else {
    limitUsedEl.textContent = "Completo";
    limitUsedEl.style.color = "var(--green)";
    limitAvailableEl.textContent = "Integração RNDS / SUS";
  }
}

// Simular o vínculo de um convênio de plano de saúde
function gerarCartaoVirtual() {
  const numberPart1 = "7492";
  const numberPart2 = Math.floor(1000 + Math.random() * 9000);
  const numberPart3 = Math.floor(1000 + Math.random() * 9000);
  const numberPart4 = Math.floor(1000 + Math.random() * 9000);
  
  const numberFormatted = `${numberPart1} ${numberPart2} ${numberPart3} ${numberPart4}`;
  realCvv = String(Math.floor(1 + Math.random() * 9));
  
  const numEl = document.getElementById("vcard-number");
  if (numEl) {
    numEl.innerHTML = `${numberFormatted} <i class="bi bi-copy copy-icon" onclick="copiarTexto('vcard-number')" title="Copiar número" style="color:rgba(255,255,255,0.7)"></i>`;
  }
  
  const cvvEl = document.getElementById("vcard-cvv");
  if (cvvEl) {
    cvvEl.textContent = "••";
  }
  
  document.getElementById("virtual-card-area").style.display = "none";
  document.getElementById("virtual-card-display").style.display = "block";
  
  toast("Convênio vinculado com sucesso!", "✨");
}

// Desvincular convênio
function excluirCartaoVirtual() {
  document.getElementById("virtual-card-display").style.display = "none";
  document.getElementById("virtual-card-area").style.display = "flex";
  toast("Plano de saúde desvinculado!", "🗑️");
}

// Revelar ou ocultar a via
function toggleCVV() {
  const cvvEl = document.getElementById("vcard-cvv");
  if (!cvvEl) return;
  
  if (cvvEl.textContent === "••") {
    cvvEl.textContent = "0" + realCvv;
  } else {
    cvvEl.textContent = "••";
  }
}

// Copiar número do convênio
function copiarTexto(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const text = el.childNodes[0].textContent.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    toast("Número da carteirinha copiado!", "📋");
  }).catch(err => {
    console.error("Erro ao copiar número:", err);
  });
}

// Inicializar
document.addEventListener("DOMContentLoaded", inicializarCartoes);
if (document.readyState === "complete" || document.readyState === "interactive") {
  inicializarCartoes();
}

document.addEventListener("DOMContentLoaded", () => {
    const iconGerar = document.getElementById("icon-gerar-cartao");
    if(iconGerar) iconGerar.addEventListener("click", gerarCartaoVirtual);
    
    const btnGerar = document.getElementById("btn-gerar-cartao");
    if(btnGerar) btnGerar.addEventListener("click", gerarCartaoVirtual);

    const btnCopiar = document.getElementById("btn-copiar-vcard");
    if(btnCopiar) btnCopiar.addEventListener("click", () => copiarTexto('vcard-number'));

    const btnToggle = document.getElementById("btn-toggle-cvv");
    if(btnToggle) btnToggle.addEventListener("click", toggleCVV);

    const btnExcluir = document.getElementById("btn-excluir-cartao");
    if(btnExcluir) btnExcluir.addEventListener("click", excluirCartaoVirtual);
});
