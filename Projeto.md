# ConectaSaúde — Documentação de Segurança & Instruções

Este projeto foi desenvolvido como parte da disciplina de **Segurança em Sistemas da Informação** (3º Ciclo Avaliativo - Grupo de Defesa). O objetivo do sistema é implementar um portal de agendamentos e consultas de saúde simulado com foco em demonstrar as melhores práticas de criptografia, autenticação multifator e defesa cibernética.

---

## 🏗️ Decisões Técnicas e Arquiteturais

As escolhas abaixo foram feitas **intencionalmente** com base no escopo acadêmico do projeto:

| Decisão | Justificativa |
|---|---|
| **JSON em vez de SQL** | Elimina dependências externas. As senhas continuam inacessíveis mesmo que o arquivo vaze, graças ao Bcrypt. |
| **OTP e Biometria em memória** | Suficiente para instância única. Validade de 5 min + limite de 3 tentativas tornam o vetor de ataque inviável. |
| **Sem CAPTCHA** | Evita dependência de APIs externas (Google, Cloudflare). O Rate Limiting cobre os endpoints sensíveis. |
| **Servidor embutido Flask** | Suficiente para demonstração local. Em produção, o indicado é Gunicorn + Nginx. |

## ⚠️ Gerenciamento de Segredos e Versionamento

> [!IMPORTANT]
> **Alerta de Segurança:** Arquivos contendo chaves privadas, segredos ou tokens de sessão (como o nosso `.env`) **nunca** devem ser commitados no controle de versão (Git).
> 
> * **Correção Aplicada:** Qualquer dependência de chaves geradas em disco foi removida da aplicação. O aplicativo agora recusa a inicialização se a variável de ambiente `FLASK_SECRET_KEY` não for fornecida.
> * Os arquivos `.env` e pastas temporárias foram todos isolados pelo `.gitignore`.

---

## 💡 Decisões de Arquitetura (Por que JSON e não SQL?)

> [!NOTE]
> **Simplicidade de Execução (Portabilidade Acadêmica)**
> Em vez de usarmos **PostgreSQL** para o banco de dados e **Redis** para os códigos OTP, decidimos intencionalmente utilizar o arquivo `users.json` e armazenar os códigos OTP na memória RAM da aplicação.
> 
> **Qual o motivo?** Isso garante que **qualquer avaliador consiga rodar o projeto** instantaneamente apenas com o comando `python app.py`, sem precisar instalar servidores complexos na própria máquina. As limitações de persistência são mitigadas pelo forte uso de **Criptografia Bcrypt**, garantindo que, mesmo se o arquivo JSON vazar, nenhuma senha seja comprometida.

---

## 🔒 Mecanismos de Segurança Implementados

### 1. Hash bcrypt + Salt (O que o usuário **sabe**)
* As senhas nunca são salvas ou trafegadas em texto plano no banco de dados (`users.json`).
* É utilizado o algoritmo de derivação de chaves `bcrypt` com `rounds=12`, gerando um salt único criptográfico para cada usuário. Isso inviabiliza ataques de tabelas pré-computadas (Rainbow Tables) e dificulta ataques de força bruta offline.

### 2. Autenticação Multifator - OTP (O que o usuário **possui**)
* Após a senha correta, é exigido um código OTP temporário de 6 dígitos gerado via gerador de números randômicos seguro (`secrets.randbelow()`).
* Expira em 5 minutos e é invalidado após 3 tentativas incorretas.
* A validação do OTP utiliza comparação em tempo constante (`secrets.compare_digest`), mitigando timing attacks.

### 3. Biometria Facial — Webcam (O que o usuário **é**)
* Após a validação do OTP, a sessão é mantida em estado de pré-autenticação limitada (`pre_auth_email`).
* O acesso ao dashboard e dados só é liberado mediante o reconhecimento biométrico facial via webcam do paciente, capturando e validando a imagem do rosto em tempo real antes de promover a sessão para o estado totalmente logado.

### 4. Proteção contra Rate Limiting & Força Bruta
* Rate limit por IP em memória: se um IP falhar o login, cadastro ou validação de OTP mais de 5 vezes consecutivas, ele é bloqueado temporariamente por 5 minutos.

### 5. Proteção contra Timing Attack de Enumeração de Usuários
* A rota de login roda um cálculo de hash dummy caso o e-mail não seja encontrado na base de dados. Dessa forma, o tempo de resposta da API de login é uniforme (~200ms a ~300ms) quer o e-mail exista ou não, impedindo a descoberta de e-mails válidos.

### 6. Proteção CSRF (Cross-Site Request Forgery)
* Um token CSRF seguro e exclusivo por sessão é gerado. Todos os endpoints mutáveis do tipo `POST` (`/api/login`, `/api/cadastrar`, `/api/verificar-otp`, `/api/verificar-facial`, `/api/logout`) validam o token recebido no header `X-CSRF-Token` ou no corpo da requisição usando `secrets.compare_digest`.

### 7. Cookies e Sessão Seguros
* O cookie de sessão possui as diretivas:
  * `SESSION_COOKIE_HTTPONLY = True` (bloqueia acesso ao cookie via scripts front-end).
  * `SESSION_COOKIE_SAMESITE = "Strict"` (garante que o cookie não seja compartilhado em requisições de outros domínios).
  * `SESSION_COOKIE_SECURE = True` (aplicado em produção para garantir tráfego exclusivo sobre HTTPS).
  * `PERMANENT_SESSION_LIFETIME = 2 horas` (tempo limite de inatividade da sessão).

### 8. Headers HTTP de Segurança
A aplicação injeta em todas as respostas HTTP os seguintes cabeçalhos de defesa:
* `X-Content-Type-Options: nosniff` (impede MIME-type sniffing).
* `X-Frame-Options: DENY` (previne ataques de Clickjacking em iframes).
* `X-XSS-Protection: 1; mode=block` (filtro XSS nativo).
* `Referrer-Policy: strict-origin-when-cross-origin` (limita vazamento de cabeçalho Referer).
* `Strict-Transport-Security (HSTS)` (força tráfego via HTTPS em produção).
* `Content-Security-Policy (CSP)`: Usa uma política estrita, sem `'unsafe-inline'` para scripts. Conta com a injeção de um **Nonce Criptográfico** (`nonce="{{ nonce }}"`) gerado a cada requisição (`before_request`) para autorizar a execução exclusiva de scripts conhecidos e anular injeções de XSS.

### 9. Pinning de Sessão (IP & User-Agent) — Contra Session Hijacking
* No login bem-sucedido, o servidor grava na sessão o IP e o User-Agent. Nas rotas protegidas por `@requer_login`, o servidor valida se esses dados coincidem. Se o cookie for roubado, o atacante será bloqueado devido ao IP/User-Agent divergente.

### 10. Validação de Complexidade de Senhas
* O cadastro possui expressão regular robusta para validação de senha (mínimo 8 caracteres, contendo maiúsculas, minúsculas, números e caracteres especiais).

### 11. Proteção contra Session Fixation
* A sessão é limpa com `session.clear()` ao validar o OTP (antes de salvar os dados de usuário logado), gerando um identificador de sessão limpo.

### 12. Auditoria e Logs Automatizados (Audit Log)
* Grava logs estruturados de auditoria (`audit.log`) em formato JSON para registrar ações sensíveis (login, falhas, bloqueios, biometria, etc.) contendo Timestamp UTC, IP e E-mail.

### 13. Demonstrador Interativo de Criptografias (Didático)
* Uma ferramenta interativa na área de Segurança permite realizar a encriptação/decriptação com **Cifra de César**, **Cifra de Vigenère** e o hashing com **Bcrypt**, demonstrando de forma prática a vulnerabilidade dos algoritmos antigos e o porquê de usarmos Bcrypt nas senhas.
