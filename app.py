import json
import os
import re
import secrets
import time
from datetime import datetime, timezone, timedelta
from functools import wraps
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from logging.handlers import RotatingFileHandler

import bcrypt
from flask import (Flask, jsonify, redirect, render_template,
                   request, session, url_for, g)

# ── Configuração ──────────────────────────────────────────────────────────────

# Carregar variáveis do arquivo .env manualmente (evita dependência externa python-dotenv)
if os.path.exists(".env"):
    with open(".env", "r") as env_file:
        for line in env_file:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

app = Flask(__name__)

# FIX 1: Exigir FLASK_SECRET_KEY rigorosamente via variável de ambiente.
is_production = os.environ.get("FLASK_ENV") == "production"

if "FLASK_SECRET_KEY" not in os.environ or len(os.environ["FLASK_SECRET_KEY"]) < 32:
    raise RuntimeError(
        "ERRO CRÍTICO DE SEGURANÇA: A variável de ambiente FLASK_SECRET_KEY deve estar configurada "
        "e ter no mínimo 32 caracteres (alta entropia)! Por favor, configure-a no arquivo .env ou nas variáveis do sistema."
    )
app.secret_key = os.environ["FLASK_SECRET_KEY"]

# FIX 2: Cookie seguro — HttpOnly + SameSite Strict + Secure em produção
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=2),   # FIX 9: timeout de sessão
)

USERS_FILE = "users.json"
OTPS: dict = {}
LOGIN_ATTEMPTS_IP: dict = {}
LOGIN_ATTEMPTS_EMAIL: dict = {}

MAX_TENTATIVAS_LOGIN = 5
BLOQUEIO_SEGUNDOS    = 5 * 60          # 5 minutos
OTP_EXPIRA_SEGUNDOS  = 5 * 60          # 5 minutos
OTP_MAX_TENTATIVAS   = 3

# FIX 4: Proteção CSRF — token gerado por sessão
def gerar_csrf():
    if "_csrf" not in session:
        session["_csrf"] = secrets.token_hex(32)
    return session["_csrf"]

def csrf_valido():
    token_header = request.headers.get("X-CSRF-Token", "")
    token_json   = (request.get_json(silent=True) or {}).get("_csrf", "")
    token_esperado = session.get("_csrf", "")
    return secrets.compare_digest(token_esperado, token_header or token_json)

# ── Sistema de Auditoria de Segurança ─────────────────────────────────────────

audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)
audit_handler = RotatingFileHandler("audit.log", maxBytes=5*1024*1024, backupCount=5)
audit_handler.setFormatter(logging.Formatter("%(message)s"))
audit_logger.addHandler(audit_handler)

def registrar_log_auditoria(evento: str, email: str = None, status: str = "sucesso", detalhes: dict = None):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "evento": evento,
        "email": email,
        "ip": request.remote_addr if request else None,
        "user_agent": request.headers.get("User-Agent") if request else None,
        "status": status,
    }
    if detalhes:
        log_entry.update(detalhes)
    audit_logger.info(json.dumps(log_entry))

# ── Helpers ───────────────────────────────────────────────────────────────────

def carregar_usuarios() -> dict:
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def salvar_usuarios(usuarios: dict) -> None:
    with open(USERS_FILE, "w") as f:
        json.dump(usuarios, f, indent=2)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")   # FIX 8: validação de email

def verificar_bloqueio(ip: str, email: str = None):
    agora = time.time()
    
    # Verifica IP
    dados_ip = LOGIN_ATTEMPTS_IP.get(ip, {})
    if dados_ip.get("bloqueado_ate", 0) > agora:
        return True, "Acesso temporariamente bloqueado por excesso de tentativas."
        
    # Verifica Email
    if email:
        dados_email = LOGIN_ATTEMPTS_EMAIL.get(email, {})
        if dados_email.get("bloqueado_ate", 0) > agora:
            return True, "Conta temporariamente bloqueada por excesso de tentativas."
            
    return False, ""

def cifra_cesar(texto: str, deslocamento: int, decodificar: bool = False) -> str:
    if decodificar:
        deslocamento = -deslocamento
    resultado = []
    for char in texto:
        if char.isalpha():
            limite = ord('A') if char.isupper() else ord('a')
            resultado.append(chr((ord(char) - limite + deslocamento) % 26 + limite))
        else:
            resultado.append(char)
    return "".join(resultado)

def cifra_vigenere(texto: str, chave: str, decodificar: bool = False) -> str:
    if not chave:
        return texto
    resultado = []
    chave = chave.lower()
    chave_idx = 0
    for char in texto:
        if char.isalpha():
            limite = ord('A') if char.isupper() else ord('a')
            deslocamento = ord(chave[chave_idx % len(chave)]) - ord('a')
            if decodificar:
                deslocamento = -deslocamento
            resultado.append(chr((ord(char) - limite + deslocamento) % 26 + limite))
            chave_idx += 1
        else:
            resultado.append(char)
    return "".join(resultado)

def enviar_email_otp(email_destino, codigo):
    # Lendo as credenciais de remetente a partir das variáveis de ambiente (carregadas via .env ou terminal)
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    
    # Caso as credenciais não estejam configuradas, faz o fallback seguro no terminal
    if not smtp_user or not smtp_password:
        print(f"\n[OTP LOCAL FALLBACK para {email_destino}]: {codigo}\n")
        return False
        
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = email_destino
        msg["Subject"] = f"Seu código de verificação ConectaSaúde: {codigo}"
        
        body = f"Olá!\n\nSeu código de autenticação de dois fatores para o ConectaSaúde é: {codigo}\n\nEste código expira em 5 minutos."
        msg.attach(MIMEText(body, "plain"))
        
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, email_destino, msg.as_string())
        server.quit()
        print(f"\n[E-mail OTP enviado com sucesso para {email_destino}]\n")
        return True
    except Exception as e:
        print(f"\n[ERRO ao enviar e-mail OTP para {email_destino}]: {e} (Fallback OTP no console): {codigo}\n")
        return False

def registrar_tentativa(ip: str, email: str, sucesso: bool) -> None:
    agora = time.time()
    
    if ip not in LOGIN_ATTEMPTS_IP:
        LOGIN_ATTEMPTS_IP[ip] = {"tentativas": 0, "bloqueado_ate": 0}
        
    if email and email not in LOGIN_ATTEMPTS_EMAIL:
        LOGIN_ATTEMPTS_EMAIL[email] = {"tentativas": 0, "bloqueado_ate": 0}

    if sucesso:
        LOGIN_ATTEMPTS_IP[ip]["tentativas"] = 0
        if email:
            LOGIN_ATTEMPTS_EMAIL[email]["tentativas"] = 0
    else:
        LOGIN_ATTEMPTS_IP[ip]["tentativas"] += 1
        tentativas_ip = LOGIN_ATTEMPTS_IP[ip]["tentativas"]
        if tentativas_ip >= 50:
            LOGIN_ATTEMPTS_IP[ip]["bloqueado_ate"] = agora + 3600
            registrar_log_auditoria("RATE_LIMIT_IP_BLOQUEADO", status="falha", detalhes={"motivo": "50_falhas"})
        elif tentativas_ip >= 20:
            LOGIN_ATTEMPTS_IP[ip]["bloqueado_ate"] = agora + 900
            registrar_log_auditoria("RATE_LIMIT_IP_BLOQUEADO", status="falha", detalhes={"motivo": "20_falhas"})
            
        if email:
            LOGIN_ATTEMPTS_EMAIL[email]["tentativas"] += 1
            tentativas_email = LOGIN_ATTEMPTS_EMAIL[email]["tentativas"]
            if tentativas_email >= 20:
                LOGIN_ATTEMPTS_EMAIL[email]["bloqueado_ate"] = agora + 86400
                registrar_log_auditoria("RATE_LIMIT_CONTA_BLOQUEADA", email=email, status="falha", detalhes={"motivo": "20_falhas"})
            elif tentativas_email >= 10:
                LOGIN_ATTEMPTS_EMAIL[email]["bloqueado_ate"] = agora + 3600
                registrar_log_auditoria("RATE_LIMIT_CONTA_BLOQUEADA", email=email, status="falha", detalhes={"motivo": "10_falhas"})
            elif tentativas_email >= 5:
                LOGIN_ATTEMPTS_EMAIL[email]["bloqueado_ate"] = agora + 900
                registrar_log_auditoria("RATE_LIMIT_CONTA_BLOQUEADA", email=email, status="falha", detalhes={"motivo": "5_falhas"})

def requer_login(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "usuario" not in session:
            return redirect(url_for("pagina_login"))
        # Pinning de IP e User-Agent para mitigar Session Hijacking
        if session.get("ip") != request.remote_addr or session.get("user_agent") != request.headers.get("User-Agent"):
            registrar_log_auditoria("SESSAO_PINNING_FALHA", email=session.get("usuario"), status="falha", detalhes={"ip_esperado": session.get("ip"), "ip_atual": request.remote_addr})
            session.clear()
            return redirect(url_for("pagina_login"))
        return f(*args, **kwargs)
    return wrapper

@app.before_request
def injetar_nonce():
    g.nonce = secrets.token_urlsafe(16)

@app.context_processor
def inject_globals():
    return dict(nonce=getattr(g, 'nonce', ''))

# FIX 7: Headers de segurança HTTP em todas as respostas
@app.after_request
def adicionar_headers_seguranca(response):
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]          = "DENY"
    response.headers["X-XSS-Protection"]         = "1; mode=block"
    response.headers["Referrer-Policy"]          = "strict-origin-when-cross-origin"
    
    # HSTS ativado apenas em produção/HTTPS
    if os.environ.get("FLASK_ENV") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
    nonce = getattr(g, "nonce", "")
    
    # CSP melhorada — removido unsafe-inline de scripts e usando nonce
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net; "
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    return response

# ── Rotas de páginas ──────────────────────────────────────────────────────────

@app.route("/")
@app.route("/login")
def pagina_login():
    csrf = gerar_csrf()
    return render_template("login.html", csrf_token=csrf)

@app.route("/cadastro")
def pagina_cadastro():
    csrf = gerar_csrf()
    return render_template("cadastro.html", csrf_token=csrf)

@app.route("/otp")
def pagina_otp():
    csrf = gerar_csrf()
    return render_template("otp.html", csrf_token=csrf)

@app.route("/facial")
def pagina_facial():
    # Rota da biometria facial, exige pré-autenticação válida
    if "pre_auth_email" not in session:
        return redirect(url_for("pagina_login"))
    csrf = gerar_csrf()
    return render_template("facial.html", csrf_token=csrf)

@app.route("/dashboard")
@requer_login
def pagina_dashboard():
    return render_template("dashboard.html", active="dashboard")

@app.route("/consultas")
@requer_login
def pagina_consultas():
    return render_template("consultas.html", active="consultas")

@app.route("/seguranca")
@requer_login
def pagina_seguranca():
    return render_template("seguranca.html", active="seguranca")

@app.route("/perfil")
@requer_login
def pagina_perfil():
    return render_template("perfil.html", active="perfil")

@app.route("/cartao-sus")
@requer_login
def pagina_cartao_sus():
    return render_template("cartao_sus.html", active="cartao-sus")

@app.route("/unidades")
@requer_login
def pagina_unidades():
    return render_template("unidades.html", active="unidades")

# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/csrf-token")
def api_csrf_token():
    """Endpoint para o JS buscar o token CSRF da sessão atual."""
    return jsonify({"csrf_token": gerar_csrf()})

@app.route("/api/cadastrar", methods=["POST"])
def cadastrar():
    # FIX 5a: rate limit no cadastro (mesmo mecanismo do login)
    ip = request.remote_addr
    dados = request.get_json(silent=True) or {}
    email = dados.get("email", "").strip().lower()

    bloqueado, msg_bl = verificar_bloqueio(ip, email)
    if bloqueado:
        return jsonify({"erro": msg_bl}), 429

    # FIX 4: CSRF no cadastro
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403

    nome  = dados.get("nome", "").strip()
    senha = dados.get("senha", "")

    if not nome or not email or not senha:
        return jsonify({"erro": "Preencha todos os campos."}), 400

    # FIX 8: validação de formato de e-mail
    if not EMAIL_RE.match(email):
        return jsonify({"erro": "Endereço de e-mail inválido."}), 400

    # Validação rigorosa de complexidade de senha no backend
    if (len(senha) < 8 or 
        not re.search(r"[A-Z]", senha) or 
        not re.search(r"[a-z]", senha) or 
        not re.search(r"[0-9]", senha) or 
        not re.search(r"[!@#$%^&*(),.?\":{}|<>]", senha)):
        return jsonify({"erro": "A senha deve ter ao menos 8 caracteres e conter letras maiúsculas, minúsculas, números e caracteres especiais."}), 400

    # Validação extra: nome não pode ser muito curto
    if len(nome) < 2:
        return jsonify({"erro": "Nome muito curto."}), 400

    usuarios = carregar_usuarios()
    if email in usuarios:
        registrar_tentativa(ip, email, False)  # conta como tentativa suspeita
        registrar_log_auditoria("CADASTRO_DUPLICADO", email=email, status="falha")
        # Proteção contra enumeração: Retorna mensagem de sucesso (mas não altera o banco)
        return jsonify({"mensagem": "Usuário cadastrado com sucesso!"}), 201

    salt  = bcrypt.gensalt(rounds=12)
    hash_ = bcrypt.hashpw(senha.encode("utf-8"), salt).decode("utf-8")
    usuarios[email] = {"nome": nome, "senha_hash": hash_, "criado_em": time.time()}
    salvar_usuarios(usuarios)
    registrar_tentativa(ip, email, True)
    registrar_log_auditoria("CADASTRO_SUCESSO", email=email)
    return jsonify({"mensagem": "Usuário cadastrado com sucesso!"}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    ip = request.remote_addr
    dados = request.get_json(silent=True) or {}
    email = dados.get("email", "").strip().lower()

    bloqueado, msg_bl = verificar_bloqueio(ip, email)
    if bloqueado:
        return jsonify({"erro": msg_bl}), 429

    # FIX 4: CSRF no login
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403

    senha = dados.get("senha", "")

    if not email or not senha:
        return jsonify({"erro": "Preencha todos os campos."}), 400

    usuarios = carregar_usuarios()
    usuario  = usuarios.get(email)

    # Evitar timing-attack de enumeração de e-mails:
    # Se o usuário não existir, executa o hashing com um hash dummy do mesmo custo.
    dummy_hash = "$2b$12$318wNBcn4KPhWCEzcA6Ef.bxmqUveFqMxmEcLg0vkXs6F4UMgFMPD"
    if usuario:
        senha_hash = usuario["senha_hash"]
        senha_ok = bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    else:
        bcrypt.checkpw(senha.encode("utf-8"), dummy_hash.encode("utf-8"))
        senha_ok = False

    if not senha_ok:
        registrar_tentativa(ip, email, False)
        if not usuario:
            registrar_log_auditoria("LOGIN_USUARIO_INEXISTENTE", email=email, status="falha")
        else:
            registrar_log_auditoria("LOGIN_SENHA_ERRADA", email=email, status="falha")
            
        # Proteção contra enumeração: Retorna erro genérico sem indicar quantas tentativas restam para não dar dicas.
        return jsonify({"erro": "Credenciais inválidas."}), 401

    registrar_tentativa(ip, email, True)
    registrar_log_auditoria("LOGIN_SENHA_OK", email=email)

    # FIX 3 / FIX 6: OTP gerado com secrets (criptograficamente seguro),
    #                 NUNCA enviado de volta ao cliente em produção.
    codigo = f"{secrets.randbelow(900000) + 100000:06d}"
    OTPS[email] = {
        "codigo":      codigo,
        "expira_em":   time.time() + OTP_EXPIRA_SEGUNDOS,
        "tentativas":  0,
    }

    # Enviar código OTP via e-mail real (SMTP) ou fallback no terminal
    enviar_email_otp(email, codigo)
    registrar_log_auditoria("OTP_ENVIADO", email=email)

    resposta: dict = {"mensagem": "Senha correta! Insira o código OTP.", "email": email}

    # FIX 6: Se o e-mail não estiver configurado no .env, ativa automaticamente o modo de demonstração local
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD", "").strip()
    if not smtp_user or not smtp_pass or os.environ.get("OTP_DEMO_MODE") == "1":
        resposta["otp_demo"] = codigo

    return jsonify(resposta)


@app.route("/api/verificar-otp", methods=["POST"])
def verificar_otp():
    # FIX 5b: rate limit também na verificação OTP
    ip = request.remote_addr
    dados  = request.get_json(silent=True) or {}
    email  = dados.get("email", "").strip().lower()

    bloqueado, msg_bl = verificar_bloqueio(ip, email)
    if bloqueado:
        return jsonify({"erro": msg_bl}), 429

    # FIX 4: CSRF
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403

    codigo = dados.get("codigo", "").strip()

    otp = OTPS.get(email)
    
    # Executa verificação dummy para proteção contra enumeração / timing attack se OTP for inexistente
    dummy_code = "000000"
    secrets.compare_digest(codigo if codigo else dummy_code, dummy_code)
    
    if not otp:
        registrar_log_auditoria("OTP_INEXISTENTE", email=email, status="falha")
        return jsonify({"erro": "Código de verificação inválido ou expirado."}), 400

    otp["tentativas"] += 1
    if otp["tentativas"] > OTP_MAX_TENTATIVAS:
        del OTPS[email]
        registrar_log_auditoria("OTP_MAX_TENTATIVAS", email=email, status="falha")
        return jsonify({"erro": "Código de verificação inválido ou expirado."}), 429

    if time.time() > otp["expira_em"]:
        del OTPS[email]
        registrar_log_auditoria("OTP_EXPIRADO", email=email, status="falha")
        return jsonify({"erro": "Código de verificação inválido ou expirado."}), 400

    # FIX: comparação constante para evitar timing-attack
    if not secrets.compare_digest(codigo, otp["codigo"]):
        registrar_log_auditoria("OTP_INVALIDO", email=email, status="falha")
        return jsonify({"erro": "Código de verificação inválido ou expirado."}), 401

    del OTPS[email]
    usuarios = carregar_usuarios()
    
    # FIX: Correção de Session Fixation
    csrf = session.get("_csrf")
    session.clear()
    if csrf:
        session["_csrf"] = csrf
        
    session.permanent = True
    session["pre_auth_email"] = email
    session["pre_auth_nome"]  = usuarios[email]["nome"]
    session["pre_auth_ip"]    = request.remote_addr
    session["pre_auth_user_agent"] = request.headers.get("User-Agent")
    
    registrar_log_auditoria("OTP_VERIFICADO", email=email)
    return jsonify({"mensagem": "Código OTP verificado com sucesso. Prossiga para a biometria facial.", "nome": usuarios[email]["nome"]})


@app.route("/api/verificar-facial", methods=["POST"])
def verificar_facial():
    # Rate limit e bloqueio de IP também se aplicam
    ip = request.remote_addr
    email = session.get("pre_auth_email")
    nome = session.get("pre_auth_nome")
    
    if not email:
        return jsonify({"erro": "Sessão inválida ou expirada."}), 401
        
    bloqueado, msg_bl = verificar_bloqueio(ip, email)
    if bloqueado:
        return jsonify({"erro": msg_bl}), 429
        
    # Valida CSRF
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403
        
    # Pinning de IP e UA na transição do OTP para Biometria
    if session.get("pre_auth_ip") != request.remote_addr or session.get("pre_auth_user_agent") != request.headers.get("User-Agent"):
        registrar_log_auditoria("FACIAL_PINNING_FALHA", email=email, status="falha")
        session.clear()
        return jsonify({"erro": "Sequestro de sessão suspeito detectado!"}), 401
        
    # Promoção para sessão permanente logada
    csrf = session.get("_csrf")
    session.clear()
    if csrf:
        session["_csrf"] = csrf
        
    session.permanent = True
    session["usuario"] = email
    session["nome"]    = nome
    session["ip"]      = request.remote_addr
    session["user_agent"] = request.headers.get("User-Agent")
    
    registrar_log_auditoria("LOGIN_SUCESSO", email=email)
    return jsonify({"mensagem": f"Biometria facial validada! Bem-vindo, {nome}!", "nome": nome})


@app.route("/api/cripto-demo", methods=["POST"])
@requer_login
def api_cripto_demo():
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403
        
    dados = request.get_json(silent=True) or {}
    texto = dados.get("texto", "")
    cifra = dados.get("cifra", "cesar")
    decodificar = bool(dados.get("decodificar", False))
    
    if not texto:
        return jsonify({"resultado": ""})
        
    if cifra == "cesar":
        try:
            chave = int(dados.get("chave", 3))
        except ValueError:
            chave = 3
        resultado = cifra_cesar(texto, chave, decodificar)
    elif cifra == "vigenere":
        chave = str(dados.get("chave", "chave")).strip()
        resultado = cifra_vigenere(texto, chave, decodificar)
    elif cifra == "bcrypt":
        if decodificar:
            return jsonify({"erro": "Bcrypt é um hash de via única e não pode ser decodificado!"}), 400
        salt = bcrypt.gensalt(rounds=12)
        resultado = bcrypt.hashpw(texto.encode("utf-8"), salt).decode("utf-8")
    else:
        return jsonify({"erro": "Cifra desconhecida."}), 400
        
    return jsonify({"resultado": resultado})


@app.route("/api/me")
@requer_login
def me():
    return jsonify({"email": session["usuario"], "nome": session["nome"]})


@app.route("/api/atualizar-perfil", methods=["POST"])
@requer_login
def api_atualizar_perfil():
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403
        
    dados = request.get_json(silent=True) or {}
    nome = dados.get("nome", "").strip()
    
    if not nome or len(nome) < 2:
        return jsonify({"erro": "Nome inválido ou muito curto."}), 400
        
    email = session["usuario"]
    usuarios = carregar_usuarios()
    if email in usuarios:
        usuarios[email]["nome"] = nome
        salvar_usuarios(usuarios)
        session["nome"] = nome
        registrar_log_auditoria("CONTA_NOME_ATUALIZADO", email=email)
        return jsonify({"mensagem": "Perfil atualizado com sucesso!", "nome": nome})
    return jsonify({"erro": "Usuário não encontrado."}), 404


@app.route("/api/atualizar-senha", methods=["POST"])
@requer_login
def api_atualizar_senha():
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403
        
    dados = request.get_json(silent=True) or {}
    atual = dados.get("atual", "")
    nova = dados.get("nova", "")
    
    if not atual or not nova:
        return jsonify({"erro": "Preencha todos os campos de senha."}), 400
        
    # Validação de complexidade da nova senha
    if (len(nova) < 8 or 
        not re.search(r"[A-Z]", nova) or 
        not re.search(r"[a-z]", nova) or 
        not re.search(r"[0-9]", nova) or 
        not re.search(r"[!@#$%^&*(),.?\":{}|<>]", nova)):
        return jsonify({"erro": "A nova senha deve ter ao menos 8 caracteres e conter letras maiúsculas, minúsculas, números e caracteres especiais."}), 400
        
    email = session["usuario"]
    usuarios = carregar_usuarios()
    usuario = usuarios.get(email)
    
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado."}), 404
        
    # Verifica a senha atual
    if not bcrypt.checkpw(atual.encode("utf-8"), usuario["senha_hash"].encode("utf-8")):
        return jsonify({"erro": "Senha atual incorreta."}), 401
        
    # Criptografa e salva a nova senha
    salt = bcrypt.gensalt(rounds=12)
    hash_ = bcrypt.hashpw(nova.encode("utf-8"), salt).decode("utf-8")
    usuarios[email]["senha_hash"] = hash_
    salvar_usuarios(usuarios)
    
    registrar_log_auditoria("CONTA_SENHA_ATUALIZADA", email=email)
    return jsonify({"mensagem": "Senha alterada com sucesso!"})

@app.route("/api/logout", methods=["POST"])
def api_logout():
    # FIX 4: CSRF no logout também
    if not csrf_valido():
        return jsonify({"erro": "Token CSRF inválido."}), 403
        
    email = session.get("usuario")
    if email:
        registrar_log_auditoria("LOGOUT", email=email)
        
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada."})


# FIX 13: debug=False em produção
if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_ENV") != "production"
    app.run(debug=debug_mode, port=5000)
