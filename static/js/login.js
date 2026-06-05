// login.js
// FIX: busca CSRF token antes de enviar qualquer requisição
// FIX: classe CSS corrigida de "msg erro" → "msg error" (conforme style.css)

let _csrfToken = "";

async function init() {
  try {
    const res = await fetch("/api/csrf-token");
    if (res.ok) {
      const data = await res.json();
      _csrfToken = data.csrf_token || "";
      // Expõe o token no meta tag que o HTML renderiza (para consistência)
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) _csrfToken = metaTag.getAttribute("content") || _csrfToken;
    }
  } catch (e) {
    console.error("CSRF init error:", e);
  }
}

async function fazerLogin() {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;
  const msg   = document.getElementById("login-msg");
  const btn   = document.querySelector(".btn");

  msg.textContent = "";
  msg.className   = "msg";

  if (!email || !senha) {
    msg.textContent = "Preencha e-mail e senha.";
    msg.className   = "msg error";   // FIX: "error" conforme CSS
    return;
  }

  const originalText = btn.textContent;
  btn.textContent = "Verificando e enviando OTP... ✉️";
  btn.disabled = true;
  msg.textContent = "Conectando ao servidor e despachando código de segurança...";
  msg.className = "msg success";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": _csrfToken,
      },
      body: JSON.stringify({ email, senha, _csrf: _csrfToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.erro || "Erro ao fazer login.";
      msg.className   = "msg error";
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    msg.textContent = "Código enviado com sucesso!";
    msg.className = "msg success";

    // FIX: armazena apenas o e-mail no sessionStorage (sem expor OTP por padrão)
    sessionStorage.setItem("otp_email", data.email);
    // otp_demo só existe se o servidor estiver em modo demo (OTP_DEMO_MODE=1)
    if (data.otp_demo) sessionStorage.setItem("otp_demo", data.otp_demo);
    setTimeout(() => {
      window.location.href = "/otp";
    }, 800);
  } catch (e) {
    msg.textContent = "Erro de rede. Tente novamente.";
    msg.className   = "msg error";
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

document.getElementById("login-senha")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fazerLogin();
});

document.getElementById("login-email")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fazerLogin();
});

init();


document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-fazer-login");
    if(btn) btn.addEventListener("click", fazerLogin);
});
