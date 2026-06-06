// otp.js
// FIX: CSRF token injetado em todas as requisições POST
// FIX: classe CSS "msg erro" → "msg error"

const email = sessionStorage.getItem("otp_email");
const demo  = sessionStorage.getItem("otp_demo");

if (!email) {
  window.location.href = "/";
} else {
  const sub = document.getElementById("otp-sub");
  if (sub) {
    sub.textContent = `Digite o código de 6 dígitos enviado para: ${email}`;
  }
}

let _csrfToken = "";

async function init() {
  try {
    const res = await fetch("/api/csrf-token");
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrf_token || "";
    }
  } catch (e) {
    console.error("CSRF init error:", e);
  }
}

// Mostra badge de demo apenas se o servidor enviou o OTP (modo acadêmico)
if (demo) {
  const demoEl  = document.getElementById("otp-demo");
  const codigoEl = document.getElementById("otp-codigo");
  if (demoEl)   demoEl.style.display  = "block";
  if (codigoEl) codigoEl.textContent  = demo;
}

// Auto-avança entre inputs
const digits = document.querySelectorAll(".otp-digit");
digits.forEach((inp, i) => {
  inp.addEventListener("input", () => {
    inp.value = inp.value.replace(/\D/g, "").slice(-1);
    if (inp.value && i < digits.length - 1) digits[i + 1].focus();
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !inp.value && i > 0) digits[i - 1].focus();
    if (e.key === "Enter") verificarOTP();
  });
});

// Paste support: cola 6 dígitos de uma vez
document.querySelector(".otp-wrap")?.addEventListener("paste", (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
  [...text].forEach((ch, i) => {
    if (digits[i]) digits[i].value = ch;
  });
  if (digits[text.length - 1]) digits[text.length - 1].focus();
});

async function verificarOTP() {
  const codigo = [...digits].map((d) => d.value).join("");
  const msg    = document.getElementById("otp-msg");
  msg.textContent = "";
  msg.className   = "msg";

  if (codigo.length !== 6) {
    msg.textContent = "Digite todos os 6 dígitos.";
    msg.className   = "msg error";
    return;
  }

  try {
    const res = await fetch("/api/verificar-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": _csrfToken,
      },
      body: JSON.stringify({ email, codigo, _csrf: _csrfToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.erro || "Código inválido.";
      msg.className   = "msg error";
      return;
    }

    sessionStorage.clear();
    window.location.href = "/facial";
  } catch (e) {
    msg.textContent = "Erro de rede.";
    msg.className   = "msg error";
  }
}

init();


document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-verificar-otp");
    if(btn) btn.addEventListener("click", verificarOTP);
});
