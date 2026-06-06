// facial.js
// Lógica para controle da webcam, animação de escaneamento e envio da biometria simulada

let _csrfToken = "";
let localStream = null;

async function init() {
  // Inicializa o CSRF Token
  try {
    const res = await fetch("/api/csrf-token");
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrf_token || "";
    }
  } catch (e) {
    console.error("Erro ao carregar token CSRF:", e);
  }

  // Inicializa o acesso à webcam
  const video = document.getElementById("webcam-video");
  const placeholder = document.getElementById("webcam-placeholder");
  const btnScan = document.getElementById("btn-iniciar-scan");
  const statusTxt = document.getElementById("scan-status");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusTxt.textContent = "Seu navegador não suporta acesso à câmera.";
    statusTxt.className = "scan-status-text error";
    placeholder.innerHTML = `<i class="bi bi-camera-video-off-fill" style="color:var(--error)"></i><span>Navegador sem suporte</span>`;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 400, height: 400, facingMode: "user" }
    });
    localStream = stream;
    video.srcObject = stream;
    placeholder.style.display = "none";
    btnScan.disabled = false;
    statusTxt.textContent = "Pronto para iniciar";
    statusTxt.className = "scan-status-text";
  } catch (err) {
    console.error("Erro ao acessar câmera: ", err);
    statusTxt.textContent = "Acesso à câmera negado. Ative a câmera nas configurações do navegador.";
    statusTxt.className = "scan-status-text error";
    placeholder.innerHTML = `<i class="bi bi-camera-video-off-fill" style="color:var(--error)"></i><span>Câmera Bloqueada</span>`;
  }
}

async function iniciarEscaneamento() {
  const btnScan = document.getElementById("btn-iniciar-scan");
  const scanLine = document.getElementById("scan-line");
  const statusTxt = document.getElementById("scan-status");
  const frame = document.getElementById("webcam-frame");
  const msg = document.getElementById("facial-msg");

  btnScan.disabled = true;
  scanLine.style.display = "block";
  statusTxt.textContent = "Escaneando traços faciais...";
  statusTxt.className = "scan-status-text scanning";
  frame.className = "webcam-outer-frame";
  msg.textContent = "";
  msg.className = "msg";

  // Simula 3 segundos de processamento e reconhecimento facial
  setTimeout(async () => {
    try {
      const res = await fetch("/api/verificar-facial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": _csrfToken,
        },
        body: JSON.stringify({ _csrf: _csrfToken })
      });
      const data = await res.json();

      if (!res.ok) {
        // Falha na autenticação facial
        frame.classList.add("error-glow");
        scanLine.style.display = "none";
        statusTxt.textContent = "Falha no reconhecimento";
        statusTxt.className = "scan-status-text error";
        msg.textContent = data.erro || "Falha na validação facial.";
        msg.className = "msg error";
        btnScan.disabled = false;
        return;
      }

      // Sucesso total
      frame.classList.add("success-glow");
      statusTxt.textContent = "Biometria Validada! Acesso liberado.";
      statusTxt.className = "scan-status-text success";
      msg.textContent = data.mensagem + " Carregando painel principal...";
      msg.className = "msg success";
      
      // Para a webcam antes de ir embora
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);

    } catch (e) {
      scanLine.style.display = "none";
      statusTxt.textContent = "Erro de rede";
      statusTxt.className = "scan-status-text error";
      msg.textContent = "Ocorreu um erro ao conectar com o servidor.";
      msg.className = "msg error";
      btnScan.disabled = false;
    }
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  init();
  const btn = document.getElementById("btn-iniciar-scan");
  if (btn) btn.addEventListener("click", iniciarEscaneamento);
});
