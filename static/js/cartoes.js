// cartoes.js — Controle interativo de cartões e limite

let realCvv = "382";
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

  // Inicializar controles de Limite
  const slider = document.getElementById("limit-slider");
  if (slider) {
    slider.addEventListener("input", atualizarLimite);
    // Executar uma vez no carregamento
    atualizarLimite();
  }

  // Inicializar toggle de bloqueio
  const blockSwitch = document.getElementById("block-switch");
  if (blockSwitch) {
    blockSwitch.addEventListener("change", function(e) {
      const card = document.getElementById("physical-card");
      if (e.target.checked) {
        card.classList.add("blocked");
        toast("Cartão físico bloqueado temporariamente!", "🔒");
      } else {
        card.classList.remove("blocked");
        toast("Cartão físico desbloqueado e ativo!", "🔓");
      }
    });
  }
}

// Atualiza valores de limite disponível vs utilizado
function atualizarLimite() {
  const slider = document.getElementById("limit-slider");
  const limitUsedEl = document.getElementById("limit-used");
  const limitAvailableEl = document.getElementById("limit-available");
  
  if (!slider || !limitUsedEl || !limitAvailableEl) return;
  
  const totalLimit = parseFloat(slider.value);
  const usedLimit = 1847.50; // valor mockado fixo
  
  // Impedir reduzir o limite total abaixo do valor utilizado
  if (totalLimit < usedLimit) {
    slider.value = 2000; // força mínimo seguro
    toast("O limite total não pode ser menor que o saldo utilizado!", "⚠️");
    atualizarLimite();
    return;
  }
  
  const availableLimit = totalLimit - usedLimit;
  
  limitUsedEl.textContent = `R$ ${usedLimit.toFixed(2).replace(".", ",")}`;
  limitAvailableEl.textContent = `R$ ${availableLimit.toFixed(2).replace(".", ",")}`;
}

// Simular a criação de um cartão virtual
function gerarCartaoVirtual() {
  const numberPart1 = "4912";
  const numberPart2 = Math.floor(1000 + Math.random() * 9000);
  const numberPart3 = Math.floor(1000 + Math.random() * 9000);
  const numberPart4 = Math.floor(1000 + Math.random() * 9000);
  
  const numberFormatted = `${numberPart1} ${numberPart2} ${numberPart3} ${numberPart4}`;
  realCvv = String(Math.floor(100 + Math.random() * 900));
  
  const numEl = document.getElementById("vcard-number");
  if (numEl) {
    numEl.innerHTML = `${numberFormatted} <i class="bi bi-copy copy-icon" onclick="copiarTexto('vcard-number')" title="Copiar número"></i>`;
  }
  
  // Resetar CVV oculto
  const cvvEl = document.getElementById("vcard-cvv");
  if (cvvEl) {
    cvvEl.textContent = "•••";
  }
  const eyeIcon = document.getElementById("toggle-cvv-icon");
  if (eyeIcon) {
    eyeIcon.className = "bi bi-eye-fill copy-icon";
  }
  
  // Alternar telas
  document.getElementById("virtual-card-area").style.display = "none";
  document.getElementById("virtual-card-display").style.display = "block";
  
  toast("Cartão virtual gerado com sucesso!", "✨");
}

// Excluir o cartão virtual simulado
function excluirCartaoVirtual() {
  document.getElementById("virtual-card-display").style.display = "none";
  document.getElementById("virtual-card-area").style.display = "flex";
  toast("Cartão virtual excluído!", "🗑️");
}

// Revelar ou ocultar o CVV do cartão virtual
function toggleCVV() {
  const cvvEl = document.getElementById("vcard-cvv");
  const eyeIcon = document.getElementById("toggle-cvv-icon");
  if (!cvvEl || !eyeIcon) return;
  
  if (cvvEl.textContent === "•••") {
    cvvEl.textContent = realCvv;
    eyeIcon.className = "bi bi-eye-slash-fill copy-icon";
  } else {
    cvvEl.textContent = "•••";
    eyeIcon.className = "bi bi-eye-fill copy-icon";
  }
}

// Copiar número do cartão virtual para clipboard
function copiarTexto(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  // Extrair texto omitindo elementos internos como tags de ícone
  const text = el.childNodes[0].textContent.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    toast("Número do cartão copiado!", "📋");
  }).catch(err => {
    console.error("Erro ao copiar número:", err);
  });
}

// Inicializar na montagem do script
document.addEventListener("DOMContentLoaded", inicializarCartoes);
// Caso o DOMContentLoaded já tenha disparado
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
