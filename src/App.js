import { useState, useEffect, useRef, useMemo, useCallback } from "react";

const B = {
  cafe:"#2c1810", marrom:"#4a3020", caramelo:"#8b6f4e", dourado:"#c4a478",
  creme:"#f5ebe0", offwhite:"#faf6f1", latte:"#d4a574", verde:"#6b8e5a",
  vermelho:"#b03020", laranja:"#d4783a", cinza:"#9b8e85", branco:"#ffffff"
};

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return m;
}

const store = {
  async get(k, def) {
    try { const r = await window.storage?.get(k); if (r?.value) return JSON.parse(r.value); } catch {}
    try { const v = localStorage.getItem(k); if (v) return JSON.parse(v); } catch {}
    return def;
  },
  async set(k, v) {
    try { await window.storage?.set(k, JSON.stringify(v)); } catch {}
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }
};

// ─── USERS & PERMISSIONS ──────────────────────────────────────────────────────
// Admins fixos do sistema: sempre existem, não podem ser removidos
const FIXED_ADMINS = [
  { email: "lucas@pontoacafe.com.br", nome: "Lucas", senha: "alpha2026" },
  { email: "israel.daywis@gmail.com", nome: "Israel", senha: "alpha2026" },
  { email: "admin@pontoacafe.com",    nome: "Admin Demo", senha: "alpha2026" }
];

// Estrutura de usuário:
// { nome, email, senha, role: "admin" | "user",
//   status: "pendente" | "aprovado" | "bloqueado",
//   permissoes: { todas: bool, obras: [obraIds], viewOnly: bool },
//   approvedBy, approvedAt, createdAt, isFixed: bool }

const userStore = {
  getAll() {
    try { const v = localStorage.getItem("ai-users-v2"); return v ? JSON.parse(v) : []; } catch { return []; }
  },
  save(users) {
    try { localStorage.setItem("ai-users-v2", JSON.stringify(users)); } catch {}
  },
  init() {
    const users = userStore.getAll();
    let changed = false;
    FIXED_ADMINS.forEach(a => {
      const existing = users.find(u => u.email === a.email.toLowerCase());
      if (!existing) {
        users.push({
          nome: a.nome, email: a.email.toLowerCase(), senha: a.senha,
          role: "admin", status: "aprovado",
          permissoes: { todas: true, obras: [], viewOnly: false },
          createdAt: new Date().toISOString(), isFixed: true
        });
        changed = true;
      } else if (!existing.isFixed) {
        existing.isFixed = true; existing.role = "admin"; existing.status = "aprovado";
        existing.permissoes = { todas: true, obras: [], viewOnly: false };
        changed = true;
      }
    });
    if (changed) userStore.save(users);
  },
  add(nome, email, senha) {
    const users = userStore.getAll();
    const emailNorm = email.trim().toLowerCase();
    if (users.find(u => u.email === emailNorm)) return { ok: false, erro: "Este email já está cadastrado." };
    users.push({
      nome: nome.trim(), email: emailNorm, senha: senha.trim(),
      role: "user", status: "pendente",
      permissoes: { todas: false, obras: [], viewOnly: true },
      createdAt: new Date().toISOString(), isFixed: false
    });
    userStore.save(users);
    return { ok: true };
  },
  authenticate(email, senha) {
    const emailNorm = email.trim().toLowerCase();
    const senhaNorm = senha.trim();
    const users = userStore.getAll();
    const user = users.find(u => u.email === emailNorm && u.senha === senhaNorm);
    if (!user) return { ok: false, erro: "Email ou senha incorretos." };
    if (user.status === "bloqueado") return { ok: false, erro: "Sua conta foi bloqueada. Contate um administrador." };
    return { ok: true, user };
  },
  update(email, updates) {
    const users = userStore.getAll();
    const u = users.find(x => x.email === email.toLowerCase());
    if (!u) return false;
    Object.assign(u, updates);
    userStore.save(users);
    return true;
  },
  remove(email) {
    const users = userStore.getAll();
    const u = users.find(x => x.email === email.toLowerCase());
    if (!u || u.isFixed) return false;
    userStore.save(users.filter(x => x.email !== email.toLowerCase()));
    return true;
  }
};

// Permission helpers
const isAdmin = (u) => u && u.role === "admin";
const canEdit = (u) => u && (isAdmin(u) || (u.permissoes && !u.permissoes.viewOnly));
const canAccessObra = (u, obraId) => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  if (!u.permissoes) return false;
  if (u.permissoes.todas) return true;
  return (u.permissoes.obras || []).includes(obraId);
};
const visibleObras = (u, obras) => {
  if (!u) return [];
  if (isAdmin(u) || (u.permissoes && u.permissoes.todas)) return obras;
  return obras.filter(o => (u.permissoes?.obras || []).includes(o.id));
};

const TT = [
  {id:1,p:1,t:"Buscar e selecionar ponto comercial",w:0.02,s:0,d:5,dep:null},
  {id:2,p:2,t:"Projeto da Loja / Layout",w:0.02,s:7,d:5,dep:1},
  {id:3,p:2,t:"Visita técnica (medidas e elétrica)",w:0.02,s:9,d:3,dep:2},
  {id:4,p:2,t:"Assinatura do contrato c/ franqueado",w:0.02,s:11,d:2,dep:3},
  {id:5,p:2,t:"Contrato de franquia / CNPJ",w:0.02,s:13,d:2,dep:4},
  {id:6,p:3,t:"Abertura da Empresa e CNPJ",w:0.02,s:20,d:7,dep:5},
  {id:7,p:3,t:"Cotação Quiosque / Loja",w:0.02,s:22,d:5,dep:5},
  {id:8,p:3,t:"Projeto arquitetônico",w:0.02,s:24,d:7,dep:3},
  {id:9,p:3,t:"Projeto elétrico",w:0.02,s:26,d:5,dep:8},
  {id:10,p:4,t:"Contratar comunicação visual",w:0.02,s:33,d:5,dep:8},
  {id:11,p:4,t:"Conta Bancária",w:0.02,s:35,d:3,dep:6},
  {id:12,p:4,t:"Aquisição Máquinas de Cartão",w:0.02,s:37,d:3,dep:11},
  {id:13,p:4,t:"Documentação ANVISA / Prefeitura",w:0.02,s:39,d:10,dep:6},
  {id:14,p:4,t:"Comprar uniformes para equipe",w:0.02,s:41,d:3,dep:null},
  {id:15,p:4,t:"Reforma civil / pré-montagem",w:0.04,s:45,d:14,dep:20},
  {id:16,p:4,t:"Aquisição móveis e equipamentos",w:0.03,s:45,d:7,dep:7},
  {id:17,p:4,t:"Comprar Logo e luminosos",w:0.02,s:47,d:5,dep:10},
  {id:18,p:4,t:"Instalação de bombona para água",w:0.02,s:59,d:2,dep:15},
  {id:19,p:4,t:"Aprovação dos projetos",w:0.03,s:31,d:7,dep:9},
  {id:20,p:4,t:"Aprovação APT / Autorização instalação",w:0.03,s:38,d:7,dep:19},
  {id:21,p:4,t:"Equipamentos sob medida",w:0.03,s:55,d:10,dep:7},
  {id:22,p:4,t:"Instalação elétrica",w:0.03,s:59,d:5,dep:15},
  {id:23,p:4,t:"Montagem Loja / Quiosque",w:0.04,s:64,d:7,dep:22},
  {id:24,p:4,t:"Solicitar equipamentos comodato CD",w:0.02,s:61,d:3,dep:null},
  {id:25,p:4,t:"Levantamento utensílios equipe",w:0.02,s:61,d:2,dep:null},
  {id:26,p:5,t:"Solicitar ligação do relógio elétrico",w:0.02,s:65,d:3,dep:15},
  {id:27,p:5,t:"Instalação da internet",w:0.02,s:71,d:2,dep:23},
  {id:28,p:5,t:"Instalar câmeras de segurança",w:0.02,s:73,d:2,dep:27},
  {id:29,p:5,t:"Comprar cofre, extintores, carrinho",w:0.02,s:69,d:2,dep:null},
  {id:30,p:5,t:"Configuração do sistema de vendas",w:0.02,s:73,d:3,dep:27},
  {id:31,p:5,t:"Cadastro fornecedores / estoque",w:0.02,s:73,d:3,dep:null},
  {id:32,p:5,t:"Contratação e seleção da equipe",w:0.04,s:70,d:7,dep:null},
  {id:33,p:5,t:"Treinamento operacional completo",w:0.04,s:77,d:5,dep:32},
  {id:34,p:5,t:"Primeiro pedido de produtos",w:0.02,s:79,d:3,dep:31},
  {id:35,p:6,t:"Ambientação e decoração final",w:0.02,s:82,d:3,dep:23},
  {id:36,p:6,t:"Vistoria final e checklist abertura",w:0.03,s:84,d:2,dep:35},
  {id:37,p:7,t:"Inauguração da unidade",w:0.05,s:87,d:1,dep:36},
];

const INAUG = [
  "Loja limpa e organizada","Equipamentos testados","Sistema de vendas ativo",
  "Estoque inicial completo","Uniformes prontos","Vigilância sanitária aprovada",
  "Internet e câmeras ok","Comunicação visual instalada","Fotos da loja registradas",
  "Post redes sociais agendado","Inauguração oficial realizada"
];

const CB = {1:5000,2:8000,3:3000,4:2000,5:2000,6:3000,7:12000,8:6000,9:4000,10:8000,11:500,12:1500,13:2000,14:3000,15:35000,16:40000,17:6000,18:1500,19:1000,20:500,21:15000,22:8000,23:5000,24:2000,25:500,26:1000,27:1200,28:3500,29:2000,30:1500,31:500,32:5000,33:4000,34:8000,35:3000,36:500,37:2000};

const TODAY = new Date("2026-04-13");

const statusColor = (s) => ({
  "Concluído": B.verde, "Concluída": B.verde, "No Prazo": B.verde,
  "Em Andamento": B.latte, "Em Risco": B.laranja,
  "Atrasado": B.vermelho, "Atrasada": B.vermelho,
  "Bloqueado": B.cinza, "Não Iniciado": B.caramelo
}[s] || B.caramelo);

const statusBg = (s) => ({
  "Concluído": "#e8f5e1", "Concluída": "#e8f5e1", "No Prazo": "#e8f5e1",
  "Em Andamento": "#fff8ee", "Em Risco": "#fff0e0",
  "Atrasado": "#fdecea", "Atrasada": "#fdecea",
  "Não Iniciado": B.creme, "Bloqueado": "#f0edf8"
}[s] || B.creme);

const prioColor = (p) => [B.vermelho, B.laranja, B.latte, B.caramelo, B.verde, B.cinza, B.marrom][p - 1] || B.caramelo;
const fBRL = (v) => "R$\u00A0" + Math.round(v || 0).toLocaleString("pt-BR");

function computeStatus(tk, prog, elap) {
  if (prog === 100) return "Concluído";
  const end = tk.s + tk.d;
  if (prog > 0 && elap > end) return "Atrasado";
  if (prog > 0) return "Em Andamento";
  if (elap > end) return "Atrasado";
  return "Não Iniciado";
}

function isBlocked(tk, tarefas) {
  if (!tk.dep) return false;
  const dep = tarefas.find(t => t.id === tk.dep);
  return dep && dep.status !== "Concluído" && tk.progresso === 0;
}

function daysLeft(tk, elap) { return (tk.s + tk.d) - elap; }

function recalc(obra) {
  const tw = obra.tarefas.reduce((a, t) => a + t.w, 0);
  const avanco = Math.round(obra.tarefas.reduce((a, t) => a + t.w * (t.progresso / 100), 0) / tw * 100);
  const conc = obra.tarefas.filter(t => t.status === "Concluído").length;
  const emAnd = obra.tarefas.filter(t => t.status === "Em Andamento").length;
  const atras = obra.tarefas.filter(t => t.status === "Atrasado").length;
  const naoIn = obra.tarefas.filter(t => t.status === "Não Iniciado").length;
  const base = new Date(obra.dataBase);
  const elap = Math.floor((TODAY - base) / 86400000);
  const expP = Math.min(100, elap / 88 * 100);
  const idp = expP > 0 ? Math.round(avanco / expP * 100) / 100 : 1.00;
  const ppc = Math.round(conc / obra.tarefas.length * 100);
  let oS = "No Prazo";
  if (atras > 3 || idp < 0.80) oS = "Atrasada";
  else if (atras > 0 || idp < 0.95) oS = "Em Risco";
  if (conc === obra.tarefas.length) oS = "Concluída";
  const cp = obra.tarefas.reduce((a, t) => a + (t.custo_previsto || 0), 0);
  const cr = obra.tarefas.reduce((a, t) => a + (t.custo_realizado || 0), 0);
  return { ...obra, avanco, conc, emAnd, atras, naoIn, elap, total: 88, idp, ppc, obraStatus: oS, cp, cr };
}

function genHistorico(baseDateStr, prog) {
  const base = new Date(baseDateStr);
  const tw = TT.reduce((a, t) => a + t.w, 0);
  const wks = Math.max(1, Math.floor((TODAY - base) / (7 * 86400000)));
  return Array.from({ length: wks }, (_, i) => {
    const frac = Math.min(1, (i + 1) / wks);
    const sp = prog.map(p => Math.round(p * frac));
    const av = Math.round(TT.reduce((a, t, j) => a + t.w * (sp[j] || 0) / 100, 0) / tw * 100);
    return { semana: "S" + (i + 1), avanco: av };
  });
}

function makeObra(id, nome, cidade, endereco, baseDateStr, resp, prog, ex = {}) {
  const base = new Date(baseDateStr);
  const elap = Math.floor((TODAY - base) / 86400000);
  const tarefas = TT.map((tk, i) => ({
    ...tk,
    progresso: prog[i] || 0,
    status: computeStatus(tk, prog[i] || 0, elap),
    responsavel: resp,
    comentario: "",
    custo_previsto: CB[tk.id] || 1000,
    custo_realizado: (prog[i] || 0) > 0 ? Math.round((CB[tk.id] || 1000) * (prog[i] || 0) / 100) : 0
  }));
  const o = {
    id, nome, cidade, endereco, resp, dataBase: baseDateStr,
    franqueado: ex.franqueado || { nome: "", cpf: "", telefone: "", email: "" },
    contato2: ex.contato2 || { nome: "", cargo: "Gerente de Obra", telefone: "", email: "" },
    contato3: ex.contato3 || { nome: "", cargo: "Arquiteto / Engenheiro", telefone: "", email: "" },
    tarefas,
    historico: ex.historico || genHistorico(baseDateStr, prog),
    inauguracao: INAUG.map((t, i) => ({ id: i + 1, t, done: false })),
    obs: ""
  };
  return recalc(o);
}

const OBRAS_DEFAULT = [
  makeObra(1, "Brasília — Rodoviária Plano Piloto", "Brasília-DF", "Rodoviária Plano Piloto, Loja B-07", "2026-02-03", "Baruque Oliveira",
    [100,100,100,100,100,100,100,100,100,100,100,100,40,100,60,70,50,0,100,60,30,0,0,80,100,0,0,0,0,0,0,0,0,0,0,0,0],
    { franqueado: { nome: "Ricardo Souza", cpf: "123.456.789-00", telefone: "(61) 99988-7766", email: "ricardo@email.com" },
      contato2: { nome: "Leandro Alves", cargo: "Engenheiro", telefone: "(61) 98877-6655", email: "" },
      contato3: { nome: "Ana Paula", cargo: "Arquiteta", telefone: "(61) 97766-5544", email: "" } }),
  makeObra(2, "Uberlândia — Shopping Iguatemi", "Uberlândia-MG", "Av. Rondon Pacheco 4600, Piso L2", "2026-02-22", "Licia Fernandes",
    [100,100,100,100,100,100,100,80,60,0,40,0,0,100,0,0,0,0,90,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  makeObra(3, "São Paulo — Tatuapé", "São Paulo-SP", "Rua Melo Freire 420, Piso Térreo", "2026-03-15", "Thiago Martins",
    [100,100,100,100,60,30,20,0,0,0,0,0,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
];

async function callAI(prompt) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 900, messages: [{ role: "user", content: prompt }] })
  });
  const d = await r.json();
  return d.content?.find(b => b.type === "text")?.text || "Sem resposta.";
}

function exportCSV() {
  const hdr = ["Prioridade","Tarefa","Peso","Dependência","Início(dias)","Duração(dias)","Responsável","Custo Previsto"];
  const rows = TT.map(t => [t.p, '"' + t.t + '"', t.w, t.dep || "", t.s, t.d, "", ""].join(","));
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + [hdr.join(","), ...rows].join("\n"));
  a.download = "modelo_implantacao.csv";
  a.click();
}

function printPDF(obra, aiText) {
  const w = window.open("", "_blank");
  if (!w) { alert("Permita pop-ups para exportar PDF."); return; }
  const c = statusColor(obra.obraStatus);
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório — ${obra.nome}</title>
  <style>body{font-family:'Montserrat',sans-serif;padding:36px;max-width:760px;margin:0 auto;color:#2c1810}
  h1{border-bottom:3px solid #c4a478;padding-bottom:10px}h2{color:#4a3020;margin-top:24px}
  .badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${statusBg(obra.obraStatus)};color:${c}}
  .g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
  .k{background:#faf6f1;border-radius:8px;padding:12px;text-align:center}
  .kv{font-size:24px;font-weight:bold}.kl{font-size:10px;color:#8b6f4e;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  th{background:#2c1810;color:#f5ebe0;padding:6px 10px;text-align:left}
  td{padding:6px 10px;border-bottom:1px solid #f5ebe0}tr:nth-child(even){background:#faf6f1}
  @media print{body{padding:20px}}</style></head><body>
  <h1>Relatório de Implantação</h1>
  <p><strong>${obra.nome}</strong> &nbsp; <span class="badge">${obra.obraStatus}</span></p>
  <p>${obra.cidade} · Responsável: ${obra.resp}</p>
  <div class="g">
    <div class="k"><div class="kv">${obra.avanco}%</div><div class="kl">Avanço</div></div>
    <div class="k"><div class="kv">${obra.ppc}%</div><div class="kl">PPC</div></div>
    <div class="k"><div class="kv">${obra.idp}</div><div class="kl">IDP</div></div>
    <div class="k"><div class="kv">${obra.conc}/${obra.tarefas.length}</div><div class="kl">Concluídas</div></div>
  </div>
  ${aiText ? "<h2>Análise da IA</h2><p style='white-space:pre-wrap;line-height:1.7'>" + aiText + "</p>" : ""}
  <h2>Tarefas</h2>
  <table><tr><th>P</th><th>Tarefa</th><th>Status</th><th>%</th></tr>
  ${obra.tarefas.map(t => "<tr><td>P" + t.p + "</td><td>" + t.t + "</td><td>" + t.status + "</td><td>" + t.progresso + "%</td></tr>").join("")}
  </table>
  <p style="margin-top:36px;font-size:10px;color:#9b8e85">Alpha Implantações · ${new Date().toLocaleDateString("pt-BR")}</p>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── BASE UI ─────────────────────────────────────────────────────────────────
function Badge({ s }) {
  return (
    <span style={{ background: statusBg(s), color: statusColor(s), padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "1px solid " + statusColor(s) + "44", whiteSpace: "nowrap", display: "inline-block" }}>
      {s}
    </span>
  );
}

function Bar({ pct, color, h = 6 }) {
  return (
    <div style={{ background: B.creme, borderRadius: 999, height: h, overflow: "hidden" }}>
      <div style={{ width: Math.min(100, Math.max(0, pct)) + "%", height: "100%", background: color || B.caramelo, borderRadius: 999, transition: "width .4s" }} />
    </div>
  );
}

function KpiCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: B.branco, borderRadius: 12, padding: "14px", flex: "1 1 120px", minWidth: 0, border: "1px solid " + B.creme, boxShadow: "0 1px 4px rgba(44,24,16,.04)" }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || B.cafe, fontFamily: "'Montserrat',sans-serif", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: B.cinza, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Btn({ onClick, color, children, full, small, disabled, outline }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "6px 12px" : "10px 18px", borderRadius: 8,
      border: outline ? "2px solid " + (color || B.cafe) : "none",
      background: disabled ? B.cinza : outline ? "white" : (color || B.cafe),
      color: outline ? (color || B.cafe) : B.creme,
      cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: small ? 11 : 13,
      width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "'Montserrat',sans-serif", minHeight: small ? 32 : 42, justifyContent: "center"
    }}>
      {children}
    </button>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + B.creme, fontSize: 13, background: B.offwhite, boxSizing: "border-box", fontFamily: "'Montserrat',sans-serif", minHeight: 42 }} />
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, msOverflowStyle: "none", scrollbarWidth: "none" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "8px 14px", borderRadius: 8, border: "2px solid " + (active === t.id ? B.cafe : B.creme),
          background: active === t.id ? B.cafe : "white", color: active === t.id ? B.creme : B.caramelo,
          cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", minHeight: 38, flexShrink: 0,
          fontFamily: "'Montserrat',sans-serif"
        }}>{t.l}</button>
      ))}
    </div>
  );
}

// ─── FILE HELPERS ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileTypeGroup = (mime) => {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "other";
};

const fileIcon = (mime) => ({ image: "🖼️", video: "🎥", pdf: "📄", other: "📎" }[fileTypeGroup(mime)]);
const fBytes = (b) => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// ─── FILE VIEWER MODAL ───────────────────────────────────────────────────────
function FileViewer({ file, onClose }) {
  if (!file) return null;
  const group = fileTypeGroup(file.tipo);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", zIndex: 500,
      display: "flex", flexDirection: "column", padding: 16
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "white" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileIcon(file.tipo)} {file.nome}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", fontFamily: "'Montserrat',sans-serif", marginTop: 2 }}>{fBytes(file.tamanho)} · {file.tipo}</div>
        </div>
        <a href={file.data} download={file.nome} onClick={e => e.stopPropagation()} style={{ padding: "7px 12px", borderRadius: 8, background: B.dourado, color: B.cafe, fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "'Montserrat',sans-serif" }}>⬇ Baixar</a>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "white", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", minHeight: 0 }}>
        {group === "image" && <img src={file.data} alt={file.nome} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />}
        {group === "video" && <video src={file.data} controls style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />}
        {group === "pdf" && <embed src={file.data} type="application/pdf" style={{ width: "100%", height: "100%", minHeight: 400, borderRadius: 8 }} />}
        {group === "other" && (
          <div style={{ textAlign: "center", color: "white", fontFamily: "'Montserrat',sans-serif", padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📎</div>
            <div style={{ fontSize: 14, marginBottom: 14 }}>Pré-visualização não disponível</div>
            <a href={file.data} download={file.nome} style={{ padding: "10px 18px", background: B.dourado, color: B.cafe, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>⬇ Baixar arquivo</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FILE MANAGER (upload + list + view + delete) ────────────────────────────
function FileManager({ arquivos = [], onChange, user, readOnly, compact }) {
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");

  const handleFiles = async (files) => {
    setError("");
    const list = Array.from(files);
    const newItems = [];
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`"${f.name}" excede o limite de 5 MB.`);
        continue;
      }
      try {
        const data = await readFileAsBase64(f);
        newItems.push({
          id: Date.now() + Math.random(),
          nome: f.name, tipo: f.type, tamanho: f.size,
          data, uploadedAt: new Date().toISOString(),
          uploadedBy: user?.email || "desconhecido"
        });
      } catch { setError("Erro ao ler arquivo."); }
    }
    if (newItems.length) {
      try { onChange([...arquivos, ...newItems]); }
      catch { setError("Armazenamento cheio. Remova arquivos antigos."); }
    }
  };

  const remove = (id) => {
    if (!confirm("Remover este arquivo?")) return;
    onChange(arquivos.filter(a => a.id !== id));
  };

  return (
    <div>
      {!readOnly && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", cursor: "pointer", border: "2px dashed " + B.creme, borderRadius: 10, padding: compact ? "12px" : "20px", textAlign: "center", background: B.offwhite }}>
            <div style={{ fontSize: compact ? 18 : 24, marginBottom: 4 }}>📤</div>
            <div style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>Adicionar arquivo</div>
            <div style={{ fontSize: 10, color: B.cinza, marginTop: 3, fontFamily: "'Montserrat',sans-serif" }}>PDF, imagem ou vídeo · máx 5 MB</div>
            <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={e => handleFiles(e.target.files)} style={{ display: "none" }} />
          </label>
          {error && <div style={{ background: "#fdecea", color: B.vermelho, padding: "8px 12px", borderRadius: 6, fontSize: 11, marginTop: 8, fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>⚠ {error}</div>}
        </div>
      )}

      {arquivos.length === 0
        ? <div style={{ textAlign: "center", padding: 18, color: B.cinza, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>Nenhum arquivo.</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {arquivos.map(a => (
              <div key={a.id} style={{ background: B.branco, border: "1px solid " + B.creme, borderRadius: 8, padding: "9px 11px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 20 }}>{fileIcon(a.tipo)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: B.cafe, fontFamily: "'Montserrat',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</div>
                  <div style={{ fontSize: 9, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{fBytes(a.tamanho)} · {new Date(a.uploadedAt).toLocaleDateString("pt-BR")}</div>
                </div>
                <button onClick={() => setViewing(a)} style={{ background: B.offwhite, border: "1px solid " + B.creme, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: B.caramelo, fontFamily: "'Montserrat',sans-serif", minHeight: 32 }}>👁</button>
                {!readOnly && <button onClick={() => remove(a.id)} style={{ background: "#fdecea", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: B.vermelho, minHeight: 32 }}>✕</button>}
              </div>
            ))}
          </div>
      }
      {viewing && <FileViewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ─── SVG CHARTS ──────────────────────────────────────────────────────────────
function LineChartSVG({ data, dataKey, color }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d[dataKey]);
  const max = Math.max(...vals, 1);
  const W = 300, H = 120, PL = 30, PB = 20, PW = W - PL - 10, PH = H - PB - 10;
  const pts = vals.map((v, i) => {
    const x = PL + (i / (vals.length - 1)) * PW;
    const y = 10 + (1 - v / max) * PH;
    return x + "," + y;
  }).join(" ");
  return (
    <svg width="100%" viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
      <line x1={PL} y1={10} x2={PL} y2={10 + PH} stroke={B.creme} strokeWidth={1} />
      <line x1={PL} y1={10 + PH} x2={PL + PW} y2={10 + PH} stroke={B.creme} strokeWidth={1} />
      {[0, 25, 50, 75, 100].map(v => {
        const y = 10 + (1 - v / 100) * PH;
        return <g key={v}><line x1={PL - 4} y1={y} x2={PL + PW} y2={y} stroke={B.creme} strokeWidth={0.5} /><text x={PL - 6} y={y + 4} textAnchor="end" fontSize={8} fill={B.cinza}>{v}</text></g>;
      })}
      {data.map((d, i) => {
        const x = PL + (i / (vals.length - 1)) * PW;
        return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize={8} fill={B.cinza}>{d.semana}</text>;
      })}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {vals.map((v, i) => {
        const x = PL + (i / (vals.length - 1)) * PW;
        const y = 10 + (1 - v / max) * PH;
        return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
      })}
    </svg>
  );
}

function BarChartSVG({ data }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.avanco), 1);
  const W = 300, H = 130, PL = 10, PB = 24, PW = W - PL - 10, PH = H - PB - 10;
  const bw = PW / data.length;
  return (
    <svg width="100%" viewBox={"0 0 " + W + " " + H} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const bh = (d.avanco / max) * PH;
        const x = PL + i * bw + bw * 0.1;
        const barW = bw * 0.8;
        const y = 10 + PH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={B.caramelo} rx={3} />
            <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill={B.cafe} fontWeight="bold">{d.avanco}%</text>
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8} fill={B.cinza}>{d.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── GANTT ────────────────────────────────────────────────────────────────────
function Gantt({ tarefas, elap, baseline, filterP, filterS, svgRef }) {
  const rows = tarefas.filter(tk => {
    if (filterP !== "Todos" && String(tk.p) !== filterP) return false;
    if (filterS !== "Todos" && tk.status !== filterS) return false;
    return true;
  });
  const ROW = 34, LW = 185, DW = 9, MAX = 95, HH = 38, CW = MAX * DW;
  const gc = (s) => ({ "Concluído": B.verde, "Em Andamento": B.latte, "Atrasado": B.vermelho, "Bloqueado": B.cinza }[s] || B.caramelo);
  const weeks = Array.from({ length: Math.ceil(MAX / 7) }, (_, i) => i);
  return (
    <div style={{ overflowX: "auto", border: "1px solid " + B.creme, borderRadius: 10, background: B.branco, WebkitOverflowScrolling: "touch" }}>
      <svg ref={svgRef} width={LW + CW + 16} height={HH + rows.length * ROW + 10} style={{ display: "block", fontFamily: "'Montserrat',sans-serif" }}>
        <rect x={0} y={0} width={LW} height={HH} fill={B.cafe} />
        <text x={10} y={25} fill={B.creme} fontSize={10} fontWeight="bold">TAREFA</text>
        {weeks.map(w => (
          <g key={w}>
            <rect x={LW + w * 7 * DW} y={0} width={7 * DW} height={HH} fill={w % 2 === 0 ? B.cafe : B.marrom} />
            <text x={LW + w * 7 * DW + 4} y={16} fill={B.dourado} fontSize={9} fontWeight="bold">S{w + 1}</text>
            <text x={LW + w * 7 * DW + 4} y={30} fill={B.creme + "88"} fontSize={8}>D{w * 7}</text>
          </g>
        ))}
        {rows.map((tk, i) => {
          const y = HH + i * ROW, bx = LW + tk.s * DW, bw = Math.max(4, tk.d * DW);
          const fw = bw * (tk.progresso / 100), c = gc(tk.status);
          const blocked = isBlocked(tk, tarefas), dl = daysLeft(tk, elap);
          return (
            <g key={tk.id}>
              <rect x={0} y={y} width={LW + CW + 16} height={ROW} fill={i % 2 === 0 ? B.offwhite : B.branco} />
              <rect x={2} y={y + 11} width={3} height={ROW - 22} rx={1} fill={prioColor(tk.p)} />
              <text x={13} y={y + ROW / 2 + 4} fontSize={10} fill={tk.status === "Atrasado" ? B.vermelho : B.cafe} fontWeight={tk.status === "Atrasado" ? "bold" : "normal"}>
                {tk.t.length > 22 ? tk.t.slice(0, 22) + "…" : tk.t}
              </text>
              {weeks.map(w => <line key={w} x1={LW + w * 7 * DW} y1={y} x2={LW + w * 7 * DW} y2={y + ROW} stroke={B.creme} strokeWidth={0.5} />)}
              {baseline && <rect x={bx} y={y + 10} width={bw} height={ROW - 20} rx={2} fill="none" stroke={B.cinza} strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />}
              <rect x={bx} y={y + 8} width={bw} height={ROW - 16} rx={3} fill={c + "28"} stroke={c} strokeWidth={0.5} />
              {fw > 0 && <rect x={bx} y={y + 8} width={fw} height={ROW - 16} rx={3} fill={c} opacity={0.85} />}
              {bw > 28 && <text x={bx + bw / 2} y={y + ROW / 2 + 4} textAnchor="middle" fontSize={9} fill={tk.progresso > 55 ? "white" : B.cafe} fontWeight="bold">{tk.progresso}%</text>}
              {tk.status === "Atrasado" && <text x={bx + bw + 4} y={y + ROW / 2 + 4} fontSize={12} fill={B.vermelho}>⚠</text>}
              {blocked && <text x={bx + bw + 4} y={y + ROW / 2 + 4} fontSize={12}>🔒</text>}
              {dl <= 3 && dl >= 0 && tk.status !== "Concluído" && <text x={bx + bw + 4} y={y + ROW / 2 + 4} fontSize={10} fill={B.laranja}>⏰</text>}
              <line x1={0} y1={y + ROW} x2={LW + CW + 16} y2={y + ROW} stroke={B.creme} strokeWidth={0.5} />
            </g>
          );
        })}
        {elap > 0 && elap < MAX && (
          <>
            <line x1={LW + elap * DW} y1={0} x2={LW + elap * DW} y2={HH + rows.length * ROW} stroke={B.vermelho} strokeWidth={2} strokeDasharray="4,3" />
            <rect x={LW + elap * DW - 16} y={HH - 2} width={32} height={13} rx={3} fill={B.vermelho} />
            <text x={LW + elap * DW} y={HH + 7} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">HOJE</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingScreen({ onAccess }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(145deg, #1a0e08 0%, #2c1810 40%, #3d2214 70%, #4a3020 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "32px 24px" : "48px 32px", position: "relative", overflow: "hidden"
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(196,164,120,.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(196,164,120,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", border: "1px solid rgba(196,164,120,.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 60, left: 60, width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(196,164,120,.04)", pointerEvents: "none" }} />

      {/* Content */}
      <div style={{ textAlign: "center", zIndex: 1, maxWidth: 480, width: "100%" }}>
        {/* Logo mark */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(196,164,120,.2) 0%, rgba(196,164,120,.08) 100%)",
            border: "1px solid rgba(196,164,120,.3)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="14" width="28" height="3" rx="1.5" fill="#c4a478" opacity="0.9"/>
              <rect x="4" y="20" width="20" height="3" rx="1.5" fill="#c4a478" opacity="0.6"/>
              <rect x="4" y="26" width="24" height="3" rx="1.5" fill="#c4a478" opacity="0.4"/>
              <circle cx="27" cy="10" r="5" stroke="#c4a478" strokeWidth="2" fill="none" opacity="0.8"/>
              <line x1="27" y1="4" x2="27" y2="6" stroke="#c4a478" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
            </svg>
          </div>
          <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(196,164,120,.5)", marginBottom: 8, fontWeight: 600 }}>
            Grupo Alpha
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Montserrat',sans-serif", fontWeight: 900,
          fontSize: isMobile ? 32 : 42, color: "#f5ebe0", margin: "0 0 10px",
          letterSpacing: "-0.5px", lineHeight: 1.15
        }}>
          Alpha<br />
          <span style={{ color: "#c4a478" }}>Implantações</span>
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: isMobile ? 13 : 15, color: "rgba(245,235,224,.5)",
          margin: "0 0 40px", lineHeight: 1.65, fontWeight: 400,
          fontFamily: "'Montserrat',sans-serif"
        }}>
          Gestão inteligente de implantações<br />
          <span style={{ color: "rgba(196,164,120,.7)", fontWeight: 600 }}>Ponto Alpha Café</span>
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 44 }}>
          {[["37", "Tarefas"], ["3", "Obras Ativas"], ["IA", "Integrada"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 20, color: "#c4a478" }}>{v}</div>
              <div style={{ fontSize: 9, color: "rgba(245,235,224,.35)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={onAccess}
          style={{
            width: "100%", maxWidth: 320, padding: "16px 32px",
            background: "linear-gradient(135deg, #c4a478 0%, #b8935e 100%)",
            border: "none", borderRadius: 12, cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 800,
            fontSize: 15, color: "#2c1810", letterSpacing: "0.3px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            margin: "0 auto", transition: "opacity .2s"
          }}
          onMouseOver={e => e.currentTarget.style.opacity = "0.92"}
          onMouseOut={e => e.currentTarget.style.opacity = "1"}
        >
          Acessar o Sistema
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#2c1810" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Footer */}
        <div style={{ marginTop: 48, fontSize: 10, color: "rgba(245,235,224,.2)", fontFamily: "'Montserrat',sans-serif", letterSpacing: "1px", textTransform: "uppercase" }}>
          v2.3 · Ponto Alpha Café
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignup, onForgot }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleLogin = () => {
    if (!email.trim() || !senha.trim()) { setErro("Preencha email e senha."); return; }
    setLoading(true);
    setErro("");
    setTimeout(() => {
      const res = userStore.authenticate(email, senha);
      if (res.ok) {
        onLogin(res.user);
      } else {
        setErro(res.erro);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(145deg, #1a0e08 0%, #2c1810 40%, #3d2214 70%, #4a3020 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(196,164,120,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(196,164,120,.05)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
            background: "rgba(196,164,120,.12)", border: "1px solid rgba(196,164,120,.25)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="14" width="28" height="3" rx="1.5" fill="#c4a478" opacity="0.9"/>
              <rect x="4" y="20" width="20" height="3" rx="1.5" fill="#c4a478" opacity="0.6"/>
              <circle cx="27" cy="10" r="5" stroke="#c4a478" strokeWidth="2" fill="none" opacity="0.8"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: "#f5ebe0", margin: "0 0 5px" }}>
            Bem-vindo
          </h2>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.4)", margin: 0 }}>
            Alpha Implantações
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(250,246,241,.05)", border: "1px solid rgba(196,164,120,.18)", borderRadius: 18, padding: isMobile ? "24px 20px" : "32px 28px", backdropFilter: "blur(8px)" }}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => { setEmail(e.target.value); setErro(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="admin@pontoacafe.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(196,164,120,.22)", background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none", transition: "border .2s" }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Senha</label>
            <input
              type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(196,164,120,.22)", background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div style={{ background: "rgba(176,48,32,.2)", border: "1px solid rgba(176,48,32,.4)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#ff9a8a", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
              ⚠ {erro}
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", padding: "14px", marginTop: 16,
              background: loading ? "rgba(196,164,120,.5)" : "linear-gradient(135deg, #c4a478 0%, #b8935e 100%)",
              border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 14,
              color: "#2c1810", letterSpacing: "0.3px", transition: "opacity .2s"
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {/* Esqueci minha senha */}
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button
              onClick={onForgot}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(196,164,120,.6)", padding: 0 }}
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Criar conta */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "rgba(245,235,224,.4)" }}>Não tem conta?{" "}</span>
            <button
              onClick={onSignup}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, color: "#c4a478", padding: 0 }}
            >
              Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIGNUP SCREEN ────────────────────────────────────────────────────────────
function SignupScreen({ onBack, onCadastrar }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [success, setSuccess] = useState(false);
  const isMobile = useIsMobile();

  const handleCadastro = () => {
    setErro("");
    if (!nome.trim() || !email.trim() || !senha.trim() || !confirma.trim()) {
      setErro("Preencha todos os campos."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro("Digite um email válido."); return;
    }
    if (senha.trim().length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres."); return;
    }
    if (senha.trim() !== confirma.trim()) {
      setErro("As senhas não coincidem."); return;
    }
    const result = userStore.add(nome, email, senha);
    if (!result.ok) { setErro(result.erro); return; }
    setSuccess(true);
    setTimeout(() => { onCadastrar && onCadastrar(); onBack(); }, 2000);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(145deg, #1a0e08 0%, #2c1810 40%, #3d2214 70%, #4a3020 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: -60, left: -60, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(196,164,120,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(196,164,120,.05)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
            background: "rgba(196,164,120,.12)", border: "1px solid rgba(196,164,120,.25)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#c4a478" strokeWidth="2"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#c4a478" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: "#f5ebe0", margin: "0 0 5px" }}>
            Criar conta
          </h2>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.4)", margin: 0 }}>
            Alpha Implantações
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(250,246,241,.05)", border: "1px solid rgba(196,164,120,.18)", borderRadius: 18, padding: isMobile ? "24px 20px" : "32px 28px" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 16, color: "#f5ebe0", marginBottom: 8 }}>Cadastro enviado!</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "rgba(245,235,224,.5)", lineHeight: 1.6, padding: "0 8px" }}>
                Seu acesso precisa ser aprovado por um administrador. Você será notificado quando for liberado.
              </div>
            </div>
          ) : (
            <>
              {/* Nome */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Nome Completo</label>
                <input
                  type="text" value={nome} onChange={e => { setNome(e.target.value); setErro(""); }}
                  placeholder="Seu nome completo"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(196,164,120,.22)", background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setErro(""); }}
                  placeholder="seu@email.com"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(196,164,120,.22)", background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Senha */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Senha <span style={{ fontWeight: 400, opacity: .6 }}>(mín. 6 caracteres)</span></label>
                <input
                  type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro(""); }}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(196,164,120,.22)", background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Confirmar Senha */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Confirmar Senha</label>
                <input
                  type="password" value={confirma} onChange={e => { setConfirma(e.target.value); setErro(""); }}
                  onKeyDown={e => e.key === "Enter" && handleCadastro()}
                  placeholder="Repita a senha"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (confirma && senha && confirma !== senha ? "rgba(176,48,32,.5)" : "rgba(196,164,120,.22)"), background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {/* Erro */}
              {erro && (
                <div style={{ background: "rgba(176,48,32,.2)", border: "1px solid rgba(176,48,32,.4)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#ff9a8a", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
                  ⚠ {erro}
                </div>
              )}

              <button
                onClick={handleCadastro}
                style={{
                  width: "100%", padding: "14px",
                  background: "linear-gradient(135deg, #c4a478 0%, #b8935e 100%)",
                  border: "none", borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 14,
                  color: "#2c1810", letterSpacing: "0.3px"
                }}
              >
                Criar Conta
              </button>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  onClick={onBack}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(196,164,120,.7)", padding: 0 }}
                >
                  ← Voltar ao login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FORGOT PASSWORD SCREEN ───────────────────────────────────────────────────
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("form"); // form | sent
  const [erro, setErro] = useState("");
  const isMobile = useIsMobile();

  const handleEnviar = () => {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) { setErro("Digite seu email para continuar."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) { setErro("Email inválido."); return; }
    setErro("");
    setStep("sent");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(145deg, #1a0e08 0%, #2c1810 40%, #3d2214 70%, #4a3020 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", border: "1px solid rgba(196,164,120,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(196,164,120,.05)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
            background: "rgba(196,164,120,.12)", border: "1px solid rgba(196,164,120,.25)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#c4a478" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c4a478" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="#c4a478"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: "#f5ebe0", margin: "0 0 5px" }}>
            Recuperar Senha
          </h2>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.4)", margin: 0 }}>
            Alpha Implantações
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(250,246,241,.05)", border: "1px solid rgba(196,164,120,.18)", borderRadius: 18, padding: isMobile ? "24px 20px" : "32px 28px" }}>
          {step === "form" ? (
            <>
              <div style={{ fontSize: 13, color: "rgba(245,235,224,.55)", fontFamily: "'Montserrat',sans-serif", lineHeight: 1.65, marginBottom: 22 }}>
                Digite o email cadastrado na sua conta. Se ele existir em nosso sistema, você receberá um link de recuperação em instantes.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontFamily: "'Montserrat',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Email cadastrado</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setErro(""); }}
                  onKeyDown={e => e.key === "Enter" && handleEnviar()}
                  placeholder="seu@email.com"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid " + (erro ? "rgba(176,48,32,.5)" : "rgba(196,164,120,.22)"), background: "rgba(250,246,241,.06)", fontSize: 13, color: "#f5ebe0", fontFamily: "'Montserrat',sans-serif", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              {erro && (
                <div style={{ background: "rgba(176,48,32,.2)", border: "1px solid rgba(176,48,32,.4)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: "#ff9a8a", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
                  ⚠ {erro}
                </div>
              )}

              <button
                onClick={handleEnviar}
                style={{
                  width: "100%", padding: "14px", marginTop: 8,
                  background: "linear-gradient(135deg, #c4a478 0%, #b8935e 100%)",
                  border: "none", borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 14,
                  color: "#2c1810", letterSpacing: "0.3px"
                }}
              >
                Enviar link de recuperação
              </button>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(196,164,120,.7)", padding: 0 }}>
                  ← Voltar ao login
                </button>
              </div>
            </>
          ) : (
            /* ── Sent state ── */
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 18px",
                background: "rgba(107,142,90,.15)", border: "1px solid rgba(107,142,90,.3)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" stroke="#6b8e5a" strokeWidth="1.8"/>
                  <path d="M22 6l-10 7L2 6" stroke="#6b8e5a" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>

              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 17, color: "#f5ebe0", marginBottom: 10 }}>
                Email enviado!
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.5)", lineHeight: 1.7, marginBottom: 6 }}>
                Se o endereço
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, color: "#c4a478", marginBottom: 10, wordBreak: "break-all" }}>
                {email.trim().toLowerCase()}
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.5)", lineHeight: 1.7, marginBottom: 24 }}>
                estiver cadastrado em nosso sistema, você receberá um email com as instruções para redefinir sua senha. Verifique também a caixa de spam.
              </div>

              <div style={{ background: "rgba(196,164,120,.08)", border: "1px solid rgba(196,164,120,.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 22, fontSize: 11, color: "rgba(196,164,120,.7)", fontFamily: "'Montserrat',sans-serif", lineHeight: 1.6, textAlign: "left" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>ℹ️ Não recebeu o email?</div>
                Aguarde até 5 minutos e confira a pasta de spam. Se o problema persistir, entre em contato com o administrador do sistema.
              </div>

              <button
                onClick={onBack}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg, #c4a478 0%, #b8935e 100%)",
                  border: "none", borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 14,
                  color: "#2c1810"
                }}
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PENDING APPROVAL SCREEN ─────────────────────────────────────────────────
function PendingApprovalScreen({ user, onLogout }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(145deg, #1a0e08 0%, #2c1810 40%, #3d2214 70%, #4a3020 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
    }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, margin: "0 auto 18px",
          background: "rgba(212,120,58,.15)", border: "1px solid rgba(212,120,58,.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30
        }}>⏳</div>
        <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 22, color: "#f5ebe0", margin: "0 0 10px" }}>
          Aguardando Aprovação
        </h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "rgba(245,235,224,.55)", lineHeight: 1.7, margin: "0 0 28px", padding: "0 12px" }}>
          Olá, <strong style={{ color: "#c4a478" }}>{user.nome}</strong>! Sua conta foi criada com sucesso, mas ainda precisa ser aprovada por um administrador antes de acessar o sistema.
        </p>
        <div style={{ background: "rgba(250,246,241,.05)", border: "1px solid rgba(196,164,120,.18)", borderRadius: 12, padding: isMobile ? "18px" : "22px", marginBottom: 24, textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(196,164,120,.8)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>Administradores do sistema</div>
          {FIXED_ADMINS.filter(a => !a.email.startsWith("admin@")).map(a => (
            <div key={a.email} style={{ fontSize: 12, color: "rgba(245,235,224,.7)", fontFamily: "'Montserrat',sans-serif", marginBottom: 6 }}>
              👤 <strong style={{ color: "#c4a478" }}>{a.nome}</strong> · {a.email}
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(245,235,224,.4)", fontFamily: "'Montserrat',sans-serif", lineHeight: 1.6 }}>
            Entre em contato por email ou WhatsApp para solicitar liberação do acesso.
          </div>
        </div>
        <button onClick={onLogout} style={{
          padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(196,164,120,.3)",
          background: "rgba(196,164,120,.08)", color: "#c4a478", cursor: "pointer",
          fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13
        }}>← Voltar ao login</button>
      </div>
    </div>
  );
}

// ─── USUÁRIOS (ADMIN) ─────────────────────────────────────────────────────────
function UsuariosView({ currentUser, obras, isMobile, refreshKey, onRefresh }) {
  const [tab, setTab] = useState("pendentes");
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [novoAdm, setNovoAdm] = useState({ nome: "", email: "", senha: "" });
  const [admMsg, setAdmMsg] = useState("");

  useEffect(() => { setUsers(userStore.getAll()); }, [refreshKey]);

  const reload = () => { setUsers(userStore.getAll()); onRefresh && onRefresh(); };

  const approve = (email) => {
    userStore.update(email, {
      status: "aprovado",
      approvedBy: currentUser.email, approvedAt: new Date().toISOString(),
      permissoes: { todas: true, obras: [], viewOnly: false }
    });
    reload();
  };
  const reject = (email) => { if (confirm("Rejeitar este cadastro?")) { userStore.remove(email); reload(); } };
  const block = (email) => { userStore.update(email, { status: "bloqueado" }); reload(); };
  const unblock = (email) => { userStore.update(email, { status: "aprovado" }); reload(); };
  const del = (email) => { if (confirm("Excluir permanentemente?")) { userStore.remove(email); reload(); } };
  const promoteAdmin = (email) => { userStore.update(email, { role: "admin", permissoes: { todas: true, obras: [], viewOnly: false } }); reload(); };
  const demoteAdmin = (email) => { userStore.update(email, { role: "user" }); reload(); };

  const savePermissoes = (email, permissoes) => { userStore.update(email, { permissoes }); reload(); setEditing(null); };

  const createAdmin = () => {
    setAdmMsg("");
    if (!novoAdm.nome || !novoAdm.email || !novoAdm.senha) { setAdmMsg("⚠ Preencha todos os campos."); return; }
    if (novoAdm.senha.length < 6) { setAdmMsg("⚠ Senha mínima de 6 caracteres."); return; }
    const r = userStore.add(novoAdm.nome, novoAdm.email, novoAdm.senha);
    if (!r.ok) { setAdmMsg("⚠ " + r.erro); return; }
    userStore.update(novoAdm.email, {
      role: "admin", status: "aprovado",
      permissoes: { todas: true, obras: [], viewOnly: false },
      approvedBy: currentUser.email, approvedAt: new Date().toISOString()
    });
    setAdmMsg("✅ Administrador criado!");
    setNovoAdm({ nome: "", email: "", senha: "" });
    reload();
  };

  const pendentes = users.filter(u => u.status === "pendente");
  const aprovados = users.filter(u => u.status === "aprovado");
  const bloqueados = users.filter(u => u.status === "bloqueado");

  const TABS = [
    { id: "pendentes", l: "⏳ Pendentes (" + pendentes.length + ")" },
    { id: "aprovados", l: "✅ Aprovados (" + aprovados.length + ")" },
    { id: "bloqueados", l: "🚫 Bloqueados (" + bloqueados.length + ")" },
    { id: "novo-admin", l: "➕ Novo Admin" }
  ];

  const UserCard = ({ u }) => (
    <div style={{ background: B.branco, borderRadius: 10, padding: "12px 14px", border: "1px solid " + B.creme, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>
            {u.nome}
            {u.role === "admin" && <span style={{ marginLeft: 6, background: B.dourado, color: B.cafe, padding: "1px 7px", borderRadius: 10, fontSize: 9, fontWeight: 700 }}>ADMIN</span>}
            {u.isFixed && <span style={{ marginLeft: 4, background: B.cafe, color: B.creme, padding: "1px 7px", borderRadius: 10, fontSize: 9, fontWeight: 700 }}>FIXO</span>}
          </div>
          <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
          {u.role !== "admin" && u.status === "aprovado" && u.permissoes && (
            <div style={{ fontSize: 10, color: B.caramelo, fontFamily: "'Montserrat',sans-serif", marginTop: 3 }}>
              {u.permissoes.todas ? "🔓 Acesso total" : `🔒 ${u.permissoes.obras?.length || 0} obra(s)`}
              {u.permissoes.viewOnly && " · 👁 Somente visualizar"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {u.status === "pendente" && (
            <>
              <button onClick={() => approve(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: B.verde, color: "white", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>✓ Aprovar</button>
              <button onClick={() => reject(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: "#fdecea", color: B.vermelho, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>✕ Rejeitar</button>
            </>
          )}
          {u.status === "aprovado" && !u.isFixed && (
            <>
              {u.role !== "admin"
                ? <button onClick={() => setEditing(u)} style={{ padding: "6px 10px", borderRadius: 6, background: B.offwhite, color: B.caramelo, border: "1px solid " + B.creme, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>✏️ Permissões</button>
                : null}
              {u.role === "user"
                ? <button onClick={() => promoteAdmin(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: B.dourado, color: B.cafe, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>⬆ Admin</button>
                : <button onClick={() => demoteAdmin(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: B.offwhite, color: B.caramelo, border: "1px solid " + B.creme, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>⬇ User</button>}
              <button onClick={() => block(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: "#fff0e0", color: B.laranja, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>🚫 Bloquear</button>
            </>
          )}
          {u.status === "bloqueado" && !u.isFixed && (
            <>
              <button onClick={() => unblock(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: B.verde, color: "white", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>✓ Desbloquear</button>
              <button onClick={() => del(u.email)} style={{ padding: "6px 10px", borderRadius: 6, background: B.vermelho, color: "white", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>🗑 Excluir</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>🔐 Usuários e Permissões</h2>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ height: 14 }} />

      {tab === "pendentes" && (pendentes.length === 0
        ? <div style={{ textAlign: "center", padding: 30, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}><div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>Nenhuma solicitação pendente</div>
        : pendentes.map(u => <UserCard key={u.email} u={u} />))}
      {tab === "aprovados" && aprovados.map(u => <UserCard key={u.email} u={u} />)}
      {tab === "bloqueados" && (bloqueados.length === 0
        ? <div style={{ textAlign: "center", padding: 30, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>Nenhum usuário bloqueado</div>
        : bloqueados.map(u => <UserCard key={u.email} u={u} />))}

      {tab === "novo-admin" && (
        <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.cafe, marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>Criar novo administrador</div>
          <div style={{ fontSize: 11, color: B.cinza, marginBottom: 14, fontFamily: "'Montserrat',sans-serif", lineHeight: 1.6 }}>Administradores têm acesso total a todas as obras e podem gerenciar usuários.</div>
          <Inp label="Nome" value={novoAdm.nome} onChange={v => setNovoAdm({ ...novoAdm, nome: v })} />
          <Inp label="Email" value={novoAdm.email} onChange={v => setNovoAdm({ ...novoAdm, email: v })} type="email" />
          <Inp label="Senha inicial" value={novoAdm.senha} onChange={v => setNovoAdm({ ...novoAdm, senha: v })} type="password" placeholder="Mínimo 6 caracteres" />
          {admMsg && <div style={{ padding: "9px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: admMsg.startsWith("✅") ? "#e8f5e1" : "#fdecea", color: admMsg.startsWith("✅") ? B.verde : B.vermelho, marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>{admMsg}</div>}
          <Btn full color={B.dourado} onClick={createAdmin}>👑 Criar Administrador</Btn>
        </div>
      )}

      {editing && <PermissoesModal user={editing} obras={obras} onSave={(perms) => savePermissoes(editing.email, perms)} onClose={() => setEditing(null)} isMobile={isMobile} />}
    </div>
  );
}

function PermissoesModal({ user, obras, onSave, onClose, isMobile }) {
  const [modo, setModo] = useState(user.permissoes?.todas ? "todas" : "especificas");
  const [obraIds, setObraIds] = useState(user.permissoes?.obras || []);
  const [viewOnly, setViewOnly] = useState(user.permissoes?.viewOnly || false);

  const toggleObra = (id) => setObraIds(obraIds.includes(id) ? obraIds.filter(x => x !== id) : [...obraIds, id]);

  const handleSave = () => onSave({
    todas: modo === "todas",
    obras: modo === "especificas" ? obraIds : [],
    viewOnly
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: B.branco, borderRadius: 14, padding: 20, maxWidth: 440, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, fontWeight: 800, color: B.cafe, marginBottom: 4 }}>Editar Permissões</div>
        <div style={{ fontSize: 11, color: B.cinza, marginBottom: 16, fontFamily: "'Montserrat',sans-serif" }}>{user.nome} · {user.email}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>Escopo de acesso</div>
          <div style={{ display: "flex", gap: 7 }}>
            {[["todas", "🔓 Todas as obras"], ["especificas", "🔒 Obras específicas"]].map(([v, l]) => (
              <button key={v} onClick={() => setModo(v)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "2px solid " + (modo === v ? B.cafe : B.creme), background: modo === v ? B.cafe : "white", color: modo === v ? B.creme : B.caramelo, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>{l}</button>
            ))}
          </div>
        </div>

        {modo === "especificas" && (
          <div style={{ marginBottom: 14, maxHeight: 200, overflowY: "auto", border: "1px solid " + B.creme, borderRadius: 8, padding: 6 }}>
            {obras.map(o => (
              <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: obraIds.includes(o.id) ? B.offwhite : "transparent" }}>
                <input type="checkbox" checked={obraIds.includes(o.id)} onChange={() => toggleObra(o.id)} />
                <span style={{ fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif", flex: 1 }}>{o.nome}</span>
              </label>
            ))}
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: viewOnly ? "#fff8ee" : B.offwhite, cursor: "pointer", marginBottom: 16, border: "1px solid " + (viewOnly ? B.latte : B.creme) }}>
          <input type="checkbox" checked={viewOnly} onChange={e => setViewOnly(e.target.checked)} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>👁 Somente visualização</div>
            <div style={{ fontSize: 10, color: B.cinza, fontFamily: "'Montserrat',sans-serif", marginTop: 1 }}>Usuário pode ver mas não editar nada</div>
          </div>
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn outline color={B.cinza} onClick={onClose}>Cancelar</Btn>
          <Btn full color={B.verde} onClick={handleSave}>💾 Salvar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ACCESS DENIED ────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: B.cafe, marginBottom: 6 }}>Acesso restrito</div>
      <div style={{ fontSize: 12 }}>Você não tem permissão para acessar esta área.</div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, isMobile, open, onClose, alertCount, user, onLogout }) {
  const admin = isAdmin(user);
  const canEditFull = admin || (user?.permissoes?.todas && !user?.permissoes?.viewOnly);
  const NAV = [
    { id: "home", l: "Dashboard", i: "🏠" },
    ...(canEditFull ? [{ id: "nova", l: "Nova Obra", i: "➕" }] : []),
    { id: "equipe", l: "Equipe", i: "👥" },
    { id: "relatorios", l: "Relatórios", i: "📄" },
    { id: "whatsapp", l: "WhatsApp", i: "💬" },
    ...(admin ? [{ id: "usuarios", l: "Usuários", i: "🔐" }] : []),
    ...(admin ? [{ id: "config", l: "Configurações", i: "⚙️" }] : [])
  ];
  const go = (id) => { setView(id); if (isMobile) onClose(); };

  const inner = (
    <div style={{ width: 220, height: "100%", background: B.cafe, display: "flex", flexDirection: "column" }}>
      {isMobile && (
        <div style={{ padding: "14px 16px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: B.dourado, fontSize: 24, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
      )}
      <div style={{ padding: isMobile ? "10px 20px 20px" : "22px 20px", borderBottom: "1px solid rgba(196,164,120,.2)" }}>
        <div style={{ fontSize: 8, color: B.dourado, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 3, fontFamily: "'Montserrat',sans-serif" }}>Grupo Alpha</div>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, color: B.creme, fontWeight: 800, lineHeight: 1.3 }}>Alpha<br />Implantações</div>
        <div style={{ fontSize: 8, color: B.dourado + "77", marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>v2.3</div>
      </div>
      <nav style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => go(item.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 8, border: "none",
            background: view === item.id ? "rgba(196,164,120,.2)" : "transparent",
            color: view === item.id ? B.dourado : "rgba(245,235,224,.65)",
            cursor: "pointer", fontSize: 13, fontWeight: view === item.id ? 700 : 400,
            fontFamily: "'Montserrat',sans-serif",
            borderLeft: view === item.id ? "3px solid " + B.dourado : "3px solid transparent",
            marginBottom: 3, minHeight: 46, textAlign: "left"
          }}>
            <span style={{ fontSize: 16 }}>{item.i}</span>
            {item.l}
            {item.id === "home" && alertCount > 0 && (
              <span style={{ marginLeft: "auto", background: B.vermelho, color: "white", borderRadius: 10, padding: "2px 7px", fontSize: 10, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>{alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* User info + Logout */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(196,164,120,.2)" }}>
        {user && (
          <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(196,164,120,.1)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.dourado, fontFamily: "'Montserrat',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
              👤 {user.nome}
              {admin && <span style={{ background: B.dourado, color: B.cafe, padding: "1px 5px", borderRadius: 8, fontSize: 8, fontWeight: 800 }}>ADM</span>}
            </div>
            <div style={{ fontSize: 9, color: "rgba(245,235,224,.35)", fontFamily: "'Montserrat',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
              {user.email}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(176,48,32,.35)",
            background: "rgba(176,48,32,.1)", color: "rgba(255,150,130,.8)", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat',sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6
          }}
        >
          <span>⎋</span> Sair
        </button>
        <div style={{ fontSize: 9, color: "rgba(245,235,224,.15)", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", marginTop: 10, fontFamily: "'Montserrat',sans-serif" }}>Ponto Alpha Café</div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200 }} />}
        <div style={{ position: "fixed", top: 0, left: open ? 0 : -240, bottom: 0, width: 220, zIndex: 201, transition: "left .28s cubic-bezier(.4,0,.2,1)", boxShadow: open ? "4px 0 24px rgba(0,0,0,.3)" : "none" }}>
          {inner}
        </div>
      </>
    );
  }
  return <div style={{ width: 220, minHeight: "100vh", flexShrink: 0 }}>{inner}</div>;
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function TopBar({ isMobile, onMenu, alertCount, view, selObra, user, onLogout }) {
  const titles = { home: "Dashboard", nova: "Nova Obra", equipe: "Equipe", relatorios: "Relatórios", whatsapp: "WhatsApp", usuarios: "Usuários", config: "Configurações", "obra-detail": selObra ? selObra.nome.split("—")[1]?.trim() || selObra.nome : "Implantação" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "13px 16px 11px" : "0 0 18px", borderBottom: isMobile ? "1px solid " + B.creme : "none", marginBottom: isMobile ? 16 : 0, background: isMobile ? B.branco : "transparent", position: isMobile ? "sticky" : "static", top: 0, zIndex: 10 }}>
      {isMobile && (
        <button onClick={onMenu} style={{ background: "none", border: "1px solid " + B.creme, borderRadius: 8, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>☰</button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isMobile
          ? <div style={{ fontWeight: 700, fontSize: 15, color: B.cafe, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Montserrat',sans-serif" }}>{titles[view] || ""}</div>
          : <div style={{ fontSize: 10, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        }
      </div>
      {alertCount > 0 && <div style={{ background: "#fdecea", border: "1px solid " + B.vermelho + "33", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: B.vermelho, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "'Montserrat',sans-serif" }}>⚠️ {alertCount}</div>}
      {!isMobile && (
        <button
          onClick={onLogout}
          style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(176,48,32,.3)", background: "rgba(176,48,32,.06)", color: B.vermelho, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", display: "flex", alignItems: "center", gap: 5 }}
        >
          ⎋ Sair
        </button>
      )}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeView({ obras, onSelect, logs, isMobile }) {
  const [tab, setTab] = useState("dash");
  const tot = obras.length;
  const atrs = obras.filter(o => o.obraStatus === "Atrasada").length;
  const risco = obras.filter(o => o.obraStatus === "Em Risco").length;
  const avg = Math.round(obras.reduce((a, o) => a + o.avanco, 0) / obras.length);
  const allUrgent = obras.flatMap(o => o.tarefas.filter(t => t.status === "Atrasado" || (daysLeft(t, o.elap) <= 3 && t.status !== "Concluído")).map(t => ({ ...t, obraRef: o, obra: o.nome })));
  const compData = obras.map(o => ({ name: o.nome.split("—")[0].trim().slice(0, 8), avanco: o.avanco }));
  const TABS = [{ id: "dash", l: "📊 Dashboard" }, { id: "urgencias", l: "⚠️ Urgências (" + allUrgent.length + ")" }, { id: "comparativo", l: "📈 Comparativo" }, { id: "logs", l: "📋 Logs" }];

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg," + B.cafe + "," + B.marrom + " 60%," + B.caramelo + ")", borderRadius: 14, padding: isMobile ? "18px" : "24px 26px", marginBottom: 16, color: B.creme, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(196,164,120,.07)" }} />
        <div style={{ fontSize: 8, color: B.dourado, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2, fontFamily: "'Montserrat',sans-serif" }}>Grupo Alpha · Alpha Implantações</div>
        <h1 style={{ margin: "0 0 3px", fontSize: isMobile ? 18 : 22, fontFamily: "'Montserrat',sans-serif", fontWeight: 800 }}>Gestão de Implantações</h1>
        <div style={{ fontSize: 10, color: B.creme + "77", fontFamily: "'Montserrat',sans-serif" }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        <div style={{ display: "flex", gap: isMobile ? 16 : 24, marginTop: 14, flexWrap: "wrap" }}>
          {[[tot, "Obras"], [avg + "%", "Avanço Médio"], [atrs, "Atrasadas", atrs > 0 ? "#ff9a8a" : B.creme], [risco, "Em Risco", risco > 0 ? "#ffcc88" : B.creme]].map(([v, l, c]) => (
            <div key={l}><div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, fontFamily: "'Montserrat',sans-serif", color: c || B.creme }}>{v}</div><div style={{ fontSize: 9, color: B.dourado, textTransform: "uppercase", fontFamily: "'Montserrat',sans-serif" }}>{l}</div></div>
          ))}
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ height: 14 }} />

      {tab === "dash" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 9, marginBottom: 16 }}>
            <KpiCard label="Total Obras" value={tot} icon="🏗️" color={B.cafe} />
            <KpiCard label="Em Risco" value={risco} icon="⚠️" color={B.laranja} />
            <KpiCard label="Atrasadas" value={atrs} icon="🔴" color={B.vermelho} />
            <KpiCard label="Urgências" value={allUrgent.length} icon="⏰" color={B.laranja} />
            <KpiCard label="Avanço Médio" value={avg + "%"} icon="📈" color={B.caramelo} />
            <KpiCard label="Logs" value={logs.length} icon="📋" color={B.cinza} />
          </div>
          <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, color: B.cafe, margin: "0 0 10px", fontWeight: 700 }}>Implantações Ativas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {obras.map(o => (
              <div key={o.id} onClick={() => onSelect(o)} style={{ background: B.branco, borderRadius: 12, padding: isMobile ? "14px" : "16px 18px", border: "1px solid " + B.creme, cursor: "pointer", borderLeft: "4px solid " + statusColor(o.obraStatus) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Montserrat',sans-serif" }}>{o.nome}</div>
                    <div style={{ fontSize: 11, color: B.cinza, marginTop: 1, fontFamily: "'Montserrat',sans-serif" }}>{o.resp}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>{o.avanco}%</span>
                    <Badge s={o.obraStatus} />
                  </div>
                </div>
                <Bar pct={o.avanco} color={statusColor(o.obraStatus)} h={5} />
                <div style={{ display: "flex", gap: 10, marginTop: 7, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: B.verde, fontFamily: "'Montserrat',sans-serif" }}>✅ {o.conc} conc.</span>
                  {o.atras > 0 && <span style={{ fontSize: 10, color: B.vermelho, fontFamily: "'Montserrat',sans-serif" }}>⚠️ {o.atras} atras.</span>}
                  <span style={{ fontSize: 10, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>IDP: {o.idp}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "urgencias" && (
        <div>
          {allUrgent.length === 0
            ? <div style={{ textAlign: "center", padding: 32, color: B.cinza }}><div style={{ fontSize: 28 }}>✅</div><div style={{ fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>Nenhuma urgência!</div></div>
            : allUrgent.map((u, i) => (
              <div key={i} onClick={() => onSelect(u.obraRef)} style={{ background: B.branco, borderRadius: 8, padding: "11px 13px", border: "1px solid " + B.vermelho + "33", marginBottom: 7, cursor: "pointer", borderLeft: "3px solid " + B.vermelho }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{u.t}</div>
                <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{u.obra} · P{u.p} · {u.progresso}%</div>
              </div>
            ))
          }
        </div>
      )}

      {tab === "comparativo" && (
        <>
          <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.cafe, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>Avanço por Obra (%)</div>
            <BarChartSVG data={compData} />
          </div>
          {obras.map((o) => (
            <div key={o.id} onClick={() => onSelect(o)} style={{ background: B.branco, borderRadius: 10, padding: "12px 14px", border: "1px solid " + B.creme, marginBottom: 7, cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.cafe, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Montserrat',sans-serif" }}>{o.nome}</div>
                <div style={{ fontSize: 10, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{o.resp}</div>
              </div>
              <Badge s={o.obraStatus} />
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: statusColor(o.obraStatus), fontFamily: "'Montserrat',sans-serif" }}>{o.avanco}%</div>
                <div style={{ fontSize: 9, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>IDP: {o.idp}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {logs.length === 0
            ? <div style={{ textAlign: "center", padding: 28, color: B.cinza, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>Nenhuma ação registrada.</div>
            : [...logs].reverse().slice(0, 30).map((l, i) => (
              <div key={i} style={{ background: B.branco, borderRadius: 8, padding: "10px 13px", border: "1px solid " + B.creme }}>
                <div style={{ fontSize: 11, color: B.cafe, fontWeight: 600, fontFamily: "'Montserrat',sans-serif" }}>{l.obra} · {l.tarefa}</div>
                <div style={{ fontSize: 10, color: B.cinza, marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>{l.campo}: {String(l.de)} → <strong style={{ color: B.caramelo }}>{String(l.para)}</strong></div>
                <div style={{ fontSize: 9, color: B.cinza, marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>{new Date(l.ts).toLocaleString("pt-BR").slice(0, 16)}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── OBRA DETAIL ─────────────────────────────────────────────────────────────
function ObraDetail({ obra, onBack, onUpdate, addLog, isMobile, user }) {
  const [tab, setTab] = useState("overview");
  const [aiOut, setAiOut] = useState({});
  const [aiLoad, setAiLoad] = useState({});
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filterP, setFilterP] = useState("Todos");
  const [filterS, setFilterS] = useState("Todos");
  const [baseline, setBaseline] = useState(false);
  const svgRef = useRef(null);
  const readOnly = !canEdit(user);

  const TABS = [{ id: "overview", l: "📊 Dashboard" }, { id: "tarefas", l: "☑️ Tarefas" }, { id: "gantt", l: "📅 Gantt" }, { id: "arquivos", l: "📁 Arquivos" }, { id: "inaug", l: "🎯 Inauguração" }, { id: "franqueado", l: "👤 Contatos" }, { id: "custos", l: "💰 Custos" }, { id: "ai", l: "🧠 IA" }];

  const runAI = async (k, prompt) => {
    setAiLoad(p => ({ ...p, [k]: true }));
    try { const r = await callAI(prompt); setAiOut(p => ({ ...p, [k]: r })); }
    catch { setAiOut(p => ({ ...p, [k]: "Erro ao conectar." })); }
    setAiLoad(p => ({ ...p, [k]: false }));
  };

  const saveTask = (tid, changes) => {
    const tk = obra.tarefas.find(t => t.id === tid);
    if (tk) Object.entries(changes).forEach(([k, v]) => addLog(obra.nome, tk.t, k, String(tk[k]), String(v)));
    onUpdate({ ...obra, tarefas: obra.tarefas.map(t => t.id === tid ? { ...t, ...changes } : t) });
  };

  const dlSVG = () => {
    if (!svgRef.current) return;
    const d = new XMLSerializer().serializeToString(svgRef.current);
    const a = document.createElement("a");
    a.href = "data:image/svg+xml," + encodeURIComponent(d);
    a.download = "gantt.svg";
    a.click();
  };

  const atrs = obra.tarefas.filter(t => t.status === "Atrasado").map(t => t.t).join(", ");
  const ea = obra.tarefas.filter(t => t.status === "Em Andamento").map(t => t.t).slice(0, 3).join(", ");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: B.caramelo, fontSize: 13, fontWeight: 700, padding: "4px 0", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Montserrat',sans-serif" }}>← Voltar</button>
        <Btn small outline color={B.caramelo} onClick={() => printPDF(obra, aiOut.analysis || "")}>📄 PDF</Btn>
      </div>
      <div style={{ background: "linear-gradient(135deg," + B.cafe + "," + B.marrom + ")", borderRadius: 12, padding: isMobile ? "16px" : "18px 22px", color: B.creme, marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 2px", fontFamily: "'Montserrat',sans-serif", fontSize: isMobile ? 16 : 18, fontWeight: 800 }}>{obra.nome}</h2>
        <div style={{ fontSize: 10, color: B.creme + "77", fontFamily: "'Montserrat',sans-serif" }}>{obra.resp}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge s={obra.obraStatus} />
          <span style={{ fontSize: 10, color: B.dourado, fontFamily: "'Montserrat',sans-serif" }}>Dia {obra.elap}/{obra.total}</span>
          <span style={{ fontSize: 10, color: B.dourado, fontFamily: "'Montserrat',sans-serif" }}>Avanço: {obra.avanco}%</span>
          <span style={{ fontSize: 10, color: B.dourado, fontFamily: "'Montserrat',sans-serif" }}>IDP: {obra.idp}</span>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ height: 14 }} />
      {readOnly && (
        <div style={{ background: "#fff8ee", border: "1px solid " + B.latte, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: B.caramelo, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 12 }}>
          👁 Modo somente visualização — você não pode editar esta implantação
        </div>
      )}

      {tab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 9, marginBottom: 16 }}>
            <KpiCard label="Avanço" value={obra.avanco + "%"} icon="📈" color={statusColor(obra.obraStatus)} />
            <KpiCard label="PPC" value={obra.ppc + "%"} icon="✅" color={B.caramelo} />
            <KpiCard label="IDP" value={obra.idp} icon="📊" color={obra.idp >= 1 ? B.verde : B.vermelho} />
            <KpiCard label="Dias" value={obra.elap} icon="📅" color={B.cafe} sub={"de " + obra.total} />
          </div>
          {obra.historico && obra.historico.length > 1 && (
            <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.cafe, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>Histórico Semanal</div>
              <LineChartSVG data={obra.historico} dataKey="avanco" color={B.caramelo} />
            </div>
          )}
          <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.cafe, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>🔮 Previsão de Conclusão com IA</div>
            <Btn full onClick={() => runAI("previsao", "Obra: " + obra.nome + " | Avanço: " + obra.avanco + "% | IDP: " + obra.idp + " | Dias: " + obra.elap + "/" + obra.total + " | Atrasadas: " + obra.atras + ". Calcule: 1) Previsão de conclusão 2) Dias de atraso estimados 3) Como recuperar. Máx 150 palavras.")} disabled={aiLoad.previsao}>
              {aiLoad.previsao ? "⏳ Calculando..." : "🤖 Gerar Previsão com IA"}
            </Btn>
            {aiOut.previsao && <div style={{ marginTop: 12, fontSize: 12, color: B.cafe, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'Montserrat',sans-serif" }}>{aiOut.previsao}</div>}
          </div>
          <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.cafe, textTransform: "uppercase", marginBottom: 10, fontFamily: "'Montserrat',sans-serif" }}>Status das Tarefas</div>
            {[["Concluídas", obra.conc, B.verde], ["Em Andamento", obra.emAnd, B.latte], ["Atrasadas", obra.atras, B.vermelho], ["Não Iniciadas", obra.naoIn, B.caramelo]].map(([l, v, c]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: "'Montserrat',sans-serif" }}>{v}</span>
                </div>
                <Bar pct={v / obra.tarefas.length * 100} color={c} h={5} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "tarefas" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            {["Todos", "Concluído", "Em Andamento", "Atrasado", "Não Iniciado"].map(s => (
              <button key={s} onClick={() => setFilterS(s)} style={{ padding: "6px 12px", borderRadius: 16, border: "1px solid " + (filterS === s ? statusColor(s) : B.creme), background: filterS === s ? statusColor(s) : "white", color: filterS === s ? "white" : B.caramelo, cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", minHeight: 34, fontFamily: "'Montserrat',sans-serif" }}>{s}</button>
            ))}
          </div>
          <div style={{ background: B.branco, borderRadius: 12, border: "1px solid " + B.creme, overflow: "hidden" }}>
            {obra.tarefas.filter(tk => filterS === "Todos" || tk.status === filterS).map((tk, i) => {
              const blocked = isBlocked(tk, obra.tarefas);
              const dl = daysLeft(tk, obra.elap);
              const editing = editId === tk.id;
              return (
                <div key={tk.id} style={{ borderBottom: "1px solid " + B.creme }}>
                  <div style={{ padding: "11px 13px", background: i % 2 === 0 ? B.offwhite : B.branco, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: prioColor(tk.p), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "white", flexShrink: 0, marginTop: 1 }}>{tk.p}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: tk.status === "Atrasado" ? B.vermelho : B.cafe, fontWeight: tk.status === "Atrasado" ? 700 : 500, lineHeight: 1.35, fontFamily: "'Montserrat',sans-serif" }}>
                            {tk.t}
                            {blocked && <span style={{ marginLeft: 4, fontSize: 10 }}>🔒</span>}
                            {dl <= 3 && dl >= 0 && tk.status !== "Concluído" && <span style={{ marginLeft: 4, fontSize: 10, color: B.laranja }}>⏰{dl}d</span>}
                          </div>
                          {tk.comentario && <div style={{ fontSize: 10, color: B.cinza, marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>💬 {tk.comentario}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: statusColor(tk.status), fontFamily: "'Montserrat',sans-serif" }}>{tk.progresso}%</div>
                          {(tk.arquivos?.length > 0) && <span style={{ fontSize: 10, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>📎{tk.arquivos.length}</span>}
                          {!readOnly && <button onClick={() => { if (editing) { setEditId(null); } else { setEditId(tk.id); setEditData({ status: tk.status, progresso: tk.progresso, comentario: tk.comentario || "", responsavel: tk.responsavel || "" }); } }} style={{ background: editing ? B.caramelo : B.offwhite, border: "1px solid " + B.creme, borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 11, color: editing ? "white" : B.caramelo, fontWeight: 700, minHeight: 32, fontFamily: "'Montserrat',sans-serif" }}>✏️</button>}
                          {readOnly && (tk.arquivos?.length > 0) && <button onClick={() => setEditId(editing ? null : tk.id)} style={{ background: editing ? B.caramelo : B.offwhite, border: "1px solid " + B.creme, borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 11, color: editing ? "white" : B.caramelo, fontWeight: 700, minHeight: 32, fontFamily: "'Montserrat',sans-serif" }}>📁</button>}
                        </div>
                      </div>
                      <div style={{ marginTop: 5, display: "flex", gap: 7, alignItems: "center" }}>
                        <Badge s={tk.status} />
                        <div style={{ flex: 1 }}><Bar pct={tk.progresso} color={statusColor(tk.status)} h={4} /></div>
                      </div>
                    </div>
                  </div>
                  {editing && (
                    <div style={{ padding: "14px 13px", background: "#fffdf5", borderTop: "1px solid " + B.dourado + "33" }}>
                      {!readOnly && (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, display: "block", marginBottom: 4, textTransform: "uppercase", fontFamily: "'Montserrat',sans-serif" }}>Status</label>
                              <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} style={{ width: "100%", padding: "9px", borderRadius: 7, border: "1px solid " + B.creme, fontSize: 12, background: B.offwhite, minHeight: 42, fontFamily: "'Montserrat',sans-serif" }}>
                                {["Não Iniciado", "Em Andamento", "Concluído", "Atrasado"].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, display: "block", marginBottom: 4, textTransform: "uppercase", fontFamily: "'Montserrat',sans-serif" }}>Progresso: {editData.progresso}%</label>
                              <input type="range" min={0} max={100} step={5} value={editData.progresso} onChange={e => setEditData({ ...editData, progresso: Number(e.target.value) })} style={{ width: "100%", marginTop: 10 }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, display: "block", marginBottom: 4, textTransform: "uppercase", fontFamily: "'Montserrat',sans-serif" }}>💬 Comentário</label>
                            <textarea value={editData.comentario} onChange={e => setEditData({ ...editData, comentario: e.target.value })} placeholder="Observação ou atualização..." rows={2} style={{ width: "100%", padding: "9px", borderRadius: 7, border: "1px solid " + B.creme, fontSize: 12, fontFamily: "'Montserrat',sans-serif", resize: "vertical", boxSizing: "border-box" }} />
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                            <Btn onClick={() => { saveTask(tk.id, editData); setEditId(null); }} color={B.verde}>💾 Salvar</Btn>
                            <Btn outline color={B.cinza} onClick={() => setEditId(null)}>Cancelar</Btn>
                          </div>
                        </>
                      )}
                      <div style={{ borderTop: readOnly ? "none" : "1px solid " + B.creme, paddingTop: readOnly ? 0 : 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>📎 Arquivos da Tarefa</div>
                        <FileManager
                          arquivos={tk.arquivos || []}
                          onChange={(arquivos) => saveTask(tk.id, { arquivos })}
                          user={user}
                          readOnly={readOnly}
                          compact
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "gantt" && (
        <div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
            <select value={filterP} onChange={e => setFilterP(e.target.value)} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid " + B.creme, fontSize: 11, background: B.offwhite, flex: 1, minWidth: 100, fontFamily: "'Montserrat',sans-serif" }}>
              <option value="Todos">Todas Prioridades</option>
              {[1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={String(p)}>P{p}</option>)}
            </select>
            <select value={filterS} onChange={e => setFilterS(e.target.value)} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid " + B.creme, fontSize: 11, background: B.offwhite, flex: 1, minWidth: 100, fontFamily: "'Montserrat',sans-serif" }}>
              <option value="Todos">Todos Status</option>
              {["Concluído", "Em Andamento", "Atrasado", "Não Iniciado"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: B.caramelo, cursor: "pointer", minHeight: 36, fontFamily: "'Montserrat',sans-serif" }}>
              <input type="checkbox" checked={baseline} onChange={e => setBaseline(e.target.checked)} />Baseline
            </label>
            <button onClick={dlSVG} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid " + B.creme, background: B.branco, cursor: "pointer", fontSize: 11, fontWeight: 700, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>⬇ SVG</button>
          </div>
          <Gantt tarefas={obra.tarefas} elap={obra.elap} baseline={baseline} filterP={filterP} filterS={filterS} svgRef={svgRef} />
        </div>
      )}

      {tab === "arquivos" && (
        <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, color: B.cafe, fontWeight: 700 }}>📁 Arquivos da Obra</div>
              <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif", marginTop: 2 }}>PDFs, imagens e vídeos com visualização online</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>{(obra.arquivos || []).length} arquivo(s)</div>
          </div>
          <FileManager
            arquivos={obra.arquivos || []}
            onChange={(arquivos) => onUpdate({ ...obra, arquivos })}
            user={user}
            readOnly={readOnly}
          />
        </div>
      )}

      {tab === "inaug" && (
        <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, color: B.cafe, fontWeight: 700 }}>Checklist de Inauguração</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: obra.inauguracao.filter(i => i.done).length === obra.inauguracao.length ? B.verde : B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>{obra.inauguracao.filter(i => i.done).length}/{obra.inauguracao.length}</div>
          </div>
          <Bar pct={obra.inauguracao.filter(i => i.done).length / obra.inauguracao.length * 100} color={B.latte} h={6} />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {obra.inauguracao.map(item => (
              <div key={item.id} onClick={() => { if (readOnly) return; onUpdate({ ...obra, inauguracao: obra.inauguracao.map(i => i.id === item.id ? { ...i, done: !i.done } : i) }); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: "1px solid " + (item.done ? B.verde + "44" : B.creme), background: item.done ? "#e8f5e1" : B.offwhite, cursor: readOnly ? "default" : "pointer", minHeight: 46, opacity: readOnly && !item.done ? 0.8 : 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid " + (item.done ? B.verde : B.creme), background: item.done ? B.verde : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.done && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: item.done ? B.verde : B.cafe, textDecoration: item.done ? "line-through" : "none", fontFamily: "'Montserrat',sans-serif" }}>{item.t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "franqueado" && (
        <FranqueadoTab obra={obra} onUpdate={onUpdate} isMobile={isMobile} />
      )}

      {tab === "custos" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 16 }}>
            <KpiCard label="Previsto" value={fBRL(obra.cp)} icon="📋" color={B.cafe} />
            <KpiCard label="Realizado" value={fBRL(obra.cr)} icon="💰" color={obra.cr > obra.cp ? B.vermelho : B.verde} />
            <KpiCard label="Desvio" value={fBRL(Math.abs(obra.cr - obra.cp))} icon={obra.cr > obra.cp ? "📉" : "📈"} color={obra.cr > obra.cp ? B.vermelho : B.verde} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {obra.tarefas.map((tk, i) => {
              const over = (tk.custo_realizado || 0) > (tk.custo_previsto || 0);
              return (
                <div key={tk.id} style={{ background: i % 2 === 0 ? B.offwhite : B.branco, borderRadius: 8, padding: "10px 13px", border: "1px solid " + B.creme }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                    <span style={{ fontSize: 12, color: B.cafe, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Montserrat',sans-serif" }}>P{tk.p} — {tk.t}</span>
                    <span style={{ fontSize: 10, color: B.cinza, flexShrink: 0, fontFamily: "'Montserrat',sans-serif" }}>{fBRL(tk.custo_previsto)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" value={tk.custo_realizado || 0} onChange={e => saveTask(tk.id, { custo_realizado: Number(e.target.value) })} style={{ flex: 1, padding: "7px 9px", borderRadius: 6, border: "1px solid " + (over ? B.vermelho : B.creme), fontSize: 12, background: over ? "#fdecea" : B.branco, fontFamily: "'Montserrat',sans-serif", color: over ? B.vermelho : B.cafe, minHeight: 38 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: over ? B.vermelho : B.verde, flexShrink: 0 }}>{over ? "▲" : "✓"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "ai" && (
        <AITab obra={obra} atrs={atrs} ea={ea} aiOut={aiOut} aiLoad={aiLoad} runAI={runAI} />
      )}
    </div>
  );
}

function FranqueadoTab({ obra, onUpdate, isMobile }) {
  const [f, setF] = useState({ franqueado: { ...obra.franqueado }, contato2: { ...obra.contato2 }, contato3: { ...obra.contato3 } });
  const Section = ({ label, k, icon }) => (
    <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>{icon} {label}</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        {["nome", "telefone", "email", k === "franqueado" ? "cpf" : "cargo"].map(field => (
          <Inp key={field} label={field === "cpf" ? "CPF/CNPJ" : field === "cargo" ? "Cargo" : field.charAt(0).toUpperCase() + field.slice(1)} value={f[k][field] || ""} onChange={v => setF({ ...f, [k]: { ...f[k], [field]: v } })} placeholder={field === "email" ? "email@email.com" : field === "telefone" ? "(00) 00000-0000" : ""} />
        ))}
      </div>
      {f[k].telefone && (
        <a href={"https://wa.me/55" + f[k].telefone.replace(/\D/g, "")} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#25d366", color: "white", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none", marginTop: 6, fontFamily: "'Montserrat',sans-serif" }}>📲 WhatsApp {label}</a>
      )}
    </div>
  );
  return (
    <div>
      <Section label="Franqueado" k="franqueado" icon="👤" />
      <Section label="Contato 2" k="contato2" icon="👥" />
      <Section label="Contato 3" k="contato3" icon="👥" />
      <Btn full color={B.verde} onClick={() => onUpdate({ ...obra, ...f })}>💾 Salvar Contatos</Btn>
    </div>
  );
}

function AITab({ obra, atrs, ea, aiOut, aiLoad, runAI }) {
  const [modo, setModo] = useState("analysis");
  const MODOS = [
    { k: "analysis", l: "🧠 Análise", p: "Especialista em gestão de implantações de franquias.\nObra: " + obra.nome + " | Resp: " + obra.resp + " | Dias: " + obra.elap + "/" + obra.total + " | Avanço: " + obra.avanco + "% | IDP: " + obra.idp + "\nStatus: " + obra.obraStatus + " | Atrasadas: " + obra.atras + " | " + atrs + "\nAndamento: " + ea + "\n1) Situação atual 2) Riscos 3) Prioridades imediatas 4) Próximos passos. Máx 280 palavras." },
    { k: "whatsapp", l: "💬 WhatsApp", p: "Mensagem WhatsApp Business Ponto Alpha Café:\nObra: " + obra.nome + " | Status: " + obra.obraStatus + " | Avanço: " + obra.avanco + "%\nAtrasadas: " + atrs + " | Andamento: " + ea + "\nBreve, emojis, max 200 palavras." },
    { k: "report", l: "📄 Relatório", p: "Relatório executivo Ponto Alpha Café:\nObra: " + obra.nome + " | Cidade: " + obra.cidade + " | Resp: " + obra.resp + "\nDias: " + obra.elap + "/" + obra.total + " | Avanço: " + obra.avanco + "% | IDP: " + obra.idp + " | Status: " + obra.obraStatus + "\nConc: " + obra.conc + "/" + obra.tarefas.length + " | Atrasadas: " + atrs + "\nRelatório profissional com análise, KPIs, riscos, recomendações. Máx 400 palavras." },
  ];
  const M = MODOS.find(m => m.k === modo);
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg," + B.cafe + "," + B.marrom + ")", borderRadius: 12, padding: "15px 18px", color: B.creme, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, fontWeight: 800 }}>🧠 Alpha Intelligence</div>
        <div style={{ fontSize: 11, color: B.creme + "77", marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>IA integrada para análise e comunicação.</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {MODOS.map(m => (
          <button key={m.k} onClick={() => setModo(m.k)} style={{ padding: "7px 14px", borderRadius: 20, border: "2px solid " + (modo === m.k ? B.cafe : B.creme), background: modo === m.k ? B.cafe : "white", color: modo === m.k ? B.creme : B.caramelo, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", minHeight: 38, fontFamily: "'Montserrat',sans-serif" }}>{m.l}</button>
        ))}
      </div>
      <Btn full onClick={() => runAI(modo, M.p)} disabled={aiLoad[modo]}>{aiLoad[modo] ? "⏳ Gerando…" : "✨ Gerar com IA"}</Btn>
      {aiOut[modo] && (
        <div style={{ background: B.offwhite, border: "1px solid " + B.creme, borderRadius: 12, padding: 16, marginTop: 14 }}>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{aiOut[modo]}</div>
          <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            <Btn small outline color={B.caramelo} onClick={() => navigator.clipboard?.writeText(aiOut[modo])}>📋 Copiar</Btn>
            {modo === "whatsapp" && <a href={"https://wa.me/?text=" + encodeURIComponent(aiOut[modo])} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#25d366", color: "white", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'Montserrat',sans-serif" }}>📲 WhatsApp</a>}
          </div>
        </div>
      )}
    </div>
  );
}

function EquipeView({ obras, logs }) {
  const byResp = useMemo(() => {
    const m = {};
    obras.forEach(o => o.tarefas.forEach(t => {
      const r = t.responsavel || "Sem responsável";
      if (!m[r]) m[r] = { nome: r, tarefas: [], obras: new Set() };
      m[r].tarefas.push({ ...t, obraNome: o.nome });
      m[r].obras.add(o.nome);
    }));
    return Object.values(m).map(r => ({ ...r, obras: Array.from(r.obras), conc: r.tarefas.filter(t => t.status === "Concluído").length, atras: r.tarefas.filter(t => t.status === "Atrasado").length }));
  }, [obras]);

  return (
    <div>
      <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>👥 Equipe</h2>
      {byResp.map(r => (
        <div key={r.nome} style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{r.nome}</div>
              <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{r.obras.join(", ")}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ fontSize: 11, color: B.verde, fontFamily: "'Montserrat',sans-serif" }}>✅ {r.conc}</span>
              {r.atras > 0 && <span style={{ fontSize: 11, color: B.vermelho, fontFamily: "'Montserrat',sans-serif" }}>⚠️ {r.atras}</span>}
              <span style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{r.tarefas.length} total</span>
            </div>
          </div>
          <Bar pct={r.conc / r.tarefas.length * 100} color={r.atras > 0 ? B.laranja : B.verde} h={4} />
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
            {r.tarefas.filter(t => t.status !== "Concluído").slice(0, 3).map(t => (
              <span key={t.id} style={{ background: statusBg(t.status), color: statusColor(t.status), padding: "2px 8px", borderRadius: 12, fontSize: 10, fontFamily: "'Montserrat',sans-serif" }}>{t.t.slice(0, 25)}</span>
            ))}
          </div>
        </div>
      ))}
      <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, color: B.cafe, margin: "16px 0 10px", fontWeight: 700 }}>Log de Ações</h3>
      {logs.length === 0
        ? <div style={{ textAlign: "center", padding: 24, color: B.cinza, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>Nenhuma ação registrada.</div>
        : [...logs].reverse().slice(0, 20).map((l, i) => (
          <div key={i} style={{ background: B.branco, borderRadius: 8, padding: "10px 13px", border: "1px solid " + B.creme, marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: B.cafe, fontWeight: 600, fontFamily: "'Montserrat',sans-serif" }}>{l.obra} · {l.tarefa}</div>
            <div style={{ fontSize: 10, color: B.cinza, marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>{l.campo}: {l.de} → <strong style={{ color: B.caramelo }}>{l.para}</strong></div>
            <div style={{ fontSize: 9, color: B.cinza, marginTop: 2, fontFamily: "'Montserrat',sans-serif" }}>{new Date(l.ts).toLocaleString("pt-BR").slice(0, 16)}</div>
          </div>
        ))
      }
    </div>
  );
}

function RelatoriosView({ obras }) {
  const [tipo, setTipo] = useState("mensal");
  const [out, setOut] = useState("");
  const [load, setLoad] = useState(false);
  const TIPOS = [{ id: "mensal", l: "📅 Mensal" }, { id: "comparativo", l: "📊 Comparativo" }, { id: "urgencias", l: "⚠️ Urgências" }, { id: "executivo", l: "🎯 Executivo" }];
  const run = async () => {
    setLoad(true); setOut("");
    const base = "Ponto Alpha Café — " + obras.length + " obras — Avanço médio: " + Math.round(obras.reduce((a, o) => a + o.avanco, 0) / obras.length) + "%\n" + obras.map(o => o.nome + ": " + o.avanco + "% (" + o.obraStatus + ") IDP:" + o.idp + " Atras:" + o.atras).join("\n");
    const prompts = { mensal: "Relatório mensal consolidado. " + base + "\nAnálise mensal, KPIs, realizações, próximas ações. Máx 400 palavras.", comparativo: "Comparativo entre implantações. " + base + "\nCompare IDP, PPC, avanço, performance. Máx 350 palavras.", urgencias: "Relatório de urgências. " + base + "\nFoco em tarefas críticas, atrasos, ações imediatas. Máx 300 palavras.", executivo: "Resumo executivo para sócios. " + base + "\nVisão estratégica, riscos, oportunidades, decisões. Máx 300 palavras." };
    try { const r = await callAI(prompts[tipo]); setOut(r); } catch { setOut("Erro."); }
    setLoad(false);
  };
  return (
    <div>
      <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>📄 Relatórios</h2>
      <Tabs tabs={TIPOS} active={tipo} onChange={setTipo} />
      <div style={{ height: 14 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn onClick={run} disabled={load}>{load ? "⏳ Gerando..." : "📄 Gerar com IA"}</Btn>
        {out && <Btn outline color={B.caramelo} onClick={() => navigator.clipboard?.writeText(out)}>📋 Copiar</Btn>}
      </div>
      {out && <div style={{ background: B.offwhite, border: "1px solid " + B.creme, borderRadius: 12, padding: 18, whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{out}</div>}
    </div>
  );
}

function WhatsAppView({ obras, contatos, setContatos, agend, setAgend }) {
  const [tab, setTab] = useState("envio");
  const [selId, setSelId] = useState(obras[0].id);
  const [msg, setMsg] = useState("");
  const [load, setLoad] = useState(false);
  const [nc, setNc] = useState({ nome: "", telefone: "", tipo: "Franqueado", obra_id: "" });
  const obra = obras.find(o => o.id === selId);
  const DIAS = [{ id: "seg", l: "Segunda" }, { id: "qua", l: "Quarta" }, { id: "sex", l: "Sexta" }];

  const gen = async () => {
    setLoad(true); setMsg("");
    try {
      const r = await callAI("Mensagem WhatsApp Business Ponto Alpha Café.\nObra: " + obra.nome + " | Status: " + obra.obraStatus + " | Avanço: " + obra.avanco + "%\nAtrasadas: " + obra.tarefas.filter(t => t.status === "Atrasado").map(t => t.t).join(", ") + "\nAndamento: " + obra.tarefas.filter(t => t.status === "Em Andamento").map(t => t.t).slice(0, 3).join(", ") + "\nBreve, emojis, max 200 palavras.");
      setMsg(r);
    } catch { setMsg("Erro."); }
    setLoad(false);
  };

  return (
    <div>
      <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>💬 WhatsApp</h2>
      <Tabs tabs={[{ id: "envio", l: "📤 Envio" }, { id: "agendamento", l: "⏰ Agendamento" }, { id: "contatos", l: "👥 Contatos" }]} active={tab} onChange={setTab} />
      <div style={{ height: 14 }} />

      {tab === "envio" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4, fontFamily: "'Montserrat',sans-serif" }}>Obra</label>
            <select value={selId} onChange={e => setSelId(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + B.creme, fontSize: 13, background: B.offwhite, minHeight: 44, fontFamily: "'Montserrat',sans-serif" }}>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <Btn full onClick={gen} disabled={load} color="#25d366">{load ? "⏳ Gerando..." : "📱 Gerar Mensagem com IA"}</Btn>
          {msg && (
            <>
              <div style={{ background: "#e9ffdb", borderRadius: 12, padding: 14, fontSize: 12, lineHeight: 1.7, color: "#1a1a1a", whiteSpace: "pre-wrap", marginTop: 12, marginBottom: 10, border: "1px solid #c3f0c8", fontFamily: "'Montserrat',sans-serif" }}>{msg}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn small outline color={B.caramelo} onClick={() => navigator.clipboard?.writeText(msg)}>📋 Copiar</Btn>
                <a href={"https://wa.me/?text=" + encodeURIComponent(msg)} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#25d366", color: "white", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'Montserrat',sans-serif" }}>📲 Abrir WhatsApp</a>
                {obra && obra.franqueado && obra.franqueado.telefone && (
                  <a href={"https://wa.me/55" + obra.franqueado.telefone.replace(/\D/g, "") + "?text=" + encodeURIComponent(msg)} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: B.cafe, color: B.creme, fontSize: 11, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'Montserrat',sans-serif" }}>📲 Franqueado</a>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "agendamento" && (
        <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>Envio Automático (08:00)</div>
            <div onClick={() => setAgend({ ...agend, ativo: !agend.ativo })} style={{ width: 46, height: 26, borderRadius: 13, background: agend.ativo ? B.verde : B.creme, position: "relative", cursor: "pointer", transition: "background .2s" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: agend.ativo ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>Dias de Envio</div>
            <div style={{ display: "flex", gap: 8 }}>
              {DIAS.map(d => (
                <button key={d.id} onClick={() => { const dias = agend.dias.includes(d.id) ? agend.dias.filter(x => x !== d.id) : [...agend.dias, d.id]; setAgend({ ...agend, dias }); }} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid " + (agend.dias.includes(d.id) ? B.cafe : B.creme), background: agend.dias.includes(d.id) ? B.cafe : "white", color: agend.dias.includes(d.id) ? B.creme : B.caramelo, cursor: "pointer", fontSize: 12, fontWeight: 700, minHeight: 42, fontFamily: "'Montserrat',sans-serif" }}>{d.l}</button>
              ))}
            </div>
          </div>
          <div style={{ background: B.offwhite, borderRadius: 8, padding: 12, fontSize: 11, color: B.caramelo, lineHeight: 1.7, marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>
            <div>Status: <strong>{agend.ativo ? "Agendado ✓" : "Inativo"}</strong></div>
            <div>Próximo envio: <strong>{agend.ativo && agend.dias.length > 0 ? (DIAS.find(d => agend.dias.includes(d.id))?.l || "-") + " às 08:00" : "—"}</strong></div>
            {agend.ultimoEnvio && <div>Último: <strong>{new Date(agend.ultimoEnvio).toLocaleString("pt-BR").slice(0, 16)}</strong></div>}
          </div>
          <Btn full onClick={async () => { setLoad(true); try { const r = await callAI("Resumo semanal WhatsApp Ponto Alpha Café.\n" + obras.map(o => o.nome + ": " + o.avanco + "% (" + o.obraStatus + ")").join("\n") + "\nBreve, profissional, emojis. Máx 200 palavras."); setMsg(r); setAgend({ ...agend, ultimoEnvio: new Date().toISOString() }); setTab("envio"); } catch {} setLoad(false); }} disabled={load}>{load ? "⏳ Gerando..." : "📤 Gerar e Enviar Agora"}</Btn>
        </div>
      )}

      {tab === "contatos" && (
        <div>
          <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>Novo Contato</div>
            <Inp label="Nome" value={nc.nome} onChange={v => setNc({ ...nc, nome: v })} />
            <Inp label="Telefone" value={nc.telefone} onChange={v => setNc({ ...nc, telefone: v })} placeholder="(00) 00000-0000" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", display: "block", marginBottom: 4, fontFamily: "'Montserrat',sans-serif" }}>Tipo</label>
                <select value={nc.tipo} onChange={e => setNc({ ...nc, tipo: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid " + B.creme, fontSize: 12, background: B.offwhite, minHeight: 42, fontFamily: "'Montserrat',sans-serif" }}>
                  {["Franqueado", "Responsável", "Engenheiro", "Arquiteto", "Equipe"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", display: "block", marginBottom: 4, fontFamily: "'Montserrat',sans-serif" }}>Obra</label>
                <select value={nc.obra_id} onChange={e => setNc({ ...nc, obra_id: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid " + B.creme, fontSize: 12, background: B.offwhite, minHeight: 42, fontFamily: "'Montserrat',sans-serif" }}>
                  <option value="">Todas</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome.split("—")[0].trim()}</option>)}
                </select>
              </div>
            </div>
            <div style={{ height: 10 }} />
            <Btn full color={B.verde} onClick={() => { if (!nc.nome || !nc.telefone) return; setContatos([...contatos, { ...nc, id: Date.now() }]); setNc({ nome: "", telefone: "", tipo: "Franqueado", obra_id: "" }); }}>+ Adicionar Contato</Btn>
          </div>
          {contatos.length === 0
            ? <div style={{ textAlign: "center", padding: 24, color: B.cinza, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>Nenhum contato cadastrado.</div>
            : contatos.map(c => (
              <div key={c.id} style={{ background: B.branco, borderRadius: 8, padding: "11px 13px", border: "1px solid " + B.creme, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{c.nome} <span style={{ fontSize: 10, color: B.caramelo }}>({c.tipo})</span></div>
                  <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{c.telefone}</div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <a href={"https://wa.me/55" + c.telefone.replace(/\D/g, "")} target="_blank" rel="noreferrer" style={{ padding: "7px 11px", borderRadius: 7, background: "#25d366", color: "white", fontSize: 11, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", minHeight: 36 }}>📲</a>
                  <button onClick={() => setContatos(contatos.filter(x => x.id !== c.id))} style={{ padding: "7px 11px", borderRadius: 7, background: "#fdecea", border: "none", cursor: "pointer", fontSize: 11, color: B.vermelho, fontWeight: 700, minHeight: 36, fontFamily: "'Montserrat',sans-serif" }}>✕</button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function ConfigView({ obras, templates, setTemplates }) {
  const [tab, setTab] = useState("import");
  const [msg, setMsg] = useState("");
  const [novoTpl, setNovoTpl] = useState({ nome: "", descricao: "" });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const txt = await file.text();
    const lines = txt.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { setMsg("❌ Arquivo inválido."); return; }
    const hdrs = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    const tarefas = lines.slice(1).map((line, i) => {
      const vals = line.split(",").map(v => v.replace(/"/g, "").trim());
      const o = {};
      hdrs.forEach((h, j) => o[h] = vals[j] || "");
      return { id: i + 1, p: parseInt(o["Prioridade"]) || 1, t: o["Tarefa"] || "Tarefa " + (i + 1), w: parseFloat(o["Peso"]) || 0.02, s: parseInt(o["Início(dias)"]) || 0, d: parseInt(o["Duração(dias)"]) || 5, dep: parseInt(o["Dependência"]) || null, progresso: 0, status: "Não Iniciado", comentario: "", responsavel: o["Responsável"] || "", custo_previsto: parseInt(o["Custo Previsto"]) || 2000, custo_realizado: 0 };
    });
    setMsg("✅ " + tarefas.length + " tarefas importadas!");
    setTemplates([...templates, { id: Date.now(), nome: file.name.replace(".csv", ""), descricao: "Importado em " + new Date().toLocaleDateString("pt-BR"), tarefas }]);
  };

  return (
    <div>
      <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>⚙️ Configurações</h2>
      <Tabs tabs={[{ id: "import", l: "📥 Importar" }, { id: "export", l: "📤 Exportar" }, { id: "templates", l: "📋 Templates" }]} active={tab} onChange={setTab} />
      <div style={{ height: 14 }} />

      {tab === "import" && (
        <div style={{ background: B.branco, borderRadius: 12, padding: 20, border: "1px solid " + B.creme }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>Importar Planilha CSV</div>
          <div style={{ fontSize: 12, color: B.cinza, lineHeight: 1.6, marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>Importe um CSV com a estrutura de tarefas para criar um template de implantação.</div>
          <div style={{ border: "2px dashed " + B.creme, borderRadius: 10, padding: "24px", textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📥</div>
            <label style={{ cursor: "pointer", display: "block" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: B.caramelo, fontFamily: "'Montserrat',sans-serif" }}>Selecionar arquivo CSV</span>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </div>
          {msg && <div style={{ background: msg.startsWith("✅") ? "#e8f5e1" : "#fdecea", padding: 10, borderRadius: 8, fontSize: 12, color: msg.startsWith("✅") ? B.verde : B.vermelho, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>{msg}</div>}
        </div>
      )}

      {tab === "export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>Modelo CSV para Excel</div>
            <div style={{ fontSize: 12, color: B.cinza, lineHeight: 1.6, marginBottom: 12, fontFamily: "'Montserrat',sans-serif" }}>37 tarefas padrão. Edite no Excel e reimporte como template.</div>
            <Btn full onClick={exportCSV}>⬇️ Baixar Modelo CSV</Btn>
          </div>
          <div style={{ background: B.branco, borderRadius: 12, padding: 18, border: "1px solid " + B.creme }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: B.cafe, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>PDF Consolidado</div>
            <Btn full outline color={B.caramelo} onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write("<!DOCTYPE html><html><head><title>Relatório</title><style>body{font-family:'Montserrat',sans-serif;padding:36px;max-width:760px;margin:0 auto;color:#2c1810}h1{border-bottom:3px solid #c4a478;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#2c1810;color:#f5ebe0;padding:7px 10px;text-align:left}td{padding:7px 10px;border-bottom:1px solid #f5ebe0}tr:nth-child(even){background:#faf6f1}</style></head><body><h1>Relatório Consolidado — Alpha Implantações</h1><table><tr><th>Obra</th><th>Status</th><th>Avanço</th><th>IDP</th><th>Atrasadas</th></tr>" + obras.map(o => "<tr><td>" + o.nome + "</td><td>" + o.obraStatus + "</td><td>" + o.avanco + "%</td><td>" + o.idp + "</td><td>" + o.atras + "</td></tr>").join("") + "</table></body></html>");
              w.document.close();
              setTimeout(() => w.print(), 400);
            }}>📑 PDF Consolidado</Btn>
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div>
          <div style={{ background: B.branco, borderRadius: 12, padding: 16, border: "1px solid " + B.creme, marginBottom: 12 }}>
            <Inp label="Nome do Template" value={novoTpl.nome} onChange={v => setNovoTpl({ ...novoTpl, nome: v })} placeholder="Ex: Quiosque Shopping" />
            <Btn full color={B.verde} onClick={() => { if (!novoTpl.nome) return; setTemplates([...templates, { id: Date.now(), ...novoTpl, tarefas: TT, origem: "padrao" }]); setNovoTpl({ nome: "", descricao: "" }); }}>+ Criar Template Padrão</Btn>
          </div>
          {[{ id: 0, nome: "Template Padrão", descricao: "37 tarefas oficiais Ponto Alpha", tarefas: TT }, ...templates].map((t, i) => (
            <div key={t.id} style={{ background: B.branco, borderRadius: 8, padding: "12px 14px", border: "1px solid " + B.creme, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: B.cafe, fontFamily: "'Montserrat',sans-serif" }}>{t.nome}{i === 0 && <span style={{ marginLeft: 6, background: B.creme, color: B.caramelo, padding: "1px 7px", borderRadius: 10, fontSize: 9, fontWeight: 700 }}>OFICIAL</span>}</div>
                <div style={{ fontSize: 11, color: B.cinza, fontFamily: "'Montserrat',sans-serif" }}>{t.descricao} · {(t.tarefas || []).length} tarefas</div>
              </div>
              {i > 0 && <button onClick={() => setTemplates(templates.filter(x => x.id !== t.id))} style={{ padding: "6px 10px", borderRadius: 6, background: "#fdecea", border: "none", cursor: "pointer", fontSize: 11, color: B.vermelho, fontWeight: 700, minHeight: 34, fontFamily: "'Montserrat',sans-serif" }}>✕</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NovaObra({ onBack, templates, onCriar, isMobile }) {
  const [f, setF] = useState({ nome: "", cidade: "", endereco: "", resp: "", dataBase: "", obs: "" });
  const criar = () => {
    if (!f.nome || !f.dataBase) { alert("Preencha nome e data base."); return; }
    const prog = new Array(37).fill(0);
    const nova = makeObra(Date.now(), f.nome, f.cidade, f.endereco, f.dataBase, f.resp, prog);
    onCriar({ ...nova, obs: f.obs });
    onBack();
  };
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: B.caramelo, fontSize: 13, fontWeight: 700, padding: "4px 0", marginBottom: 16, fontFamily: "'Montserrat',sans-serif" }}>← Voltar</button>
      <div style={{ background: B.branco, borderRadius: 16, padding: isMobile ? "18px 16px" : "24px", border: "1px solid " + B.creme }}>
        <h2 style={{ fontFamily: "'Montserrat',sans-serif", color: B.cafe, margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>Nova Implantação</h2>
        <Inp label="Nome da Obra / Unidade" value={f.nome} onChange={v => setF({ ...f, nome: v })} placeholder="Ex: Brasília — Shopping Conjunto Nacional" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Inp label="Cidade" value={f.cidade} onChange={v => setF({ ...f, cidade: v })} placeholder="Ex: Brasília-DF" />
          <Inp label="Responsável" value={f.resp} onChange={v => setF({ ...f, resp: v })} placeholder="Nome do responsável" />
        </div>
        <Inp label="Endereço" value={f.endereco} onChange={v => setF({ ...f, endereco: v })} placeholder="Endereço completo" />
        <Inp label="Data Base (Início)" value={f.dataBase} onChange={v => setF({ ...f, dataBase: v })} type="date" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: B.caramelo, textTransform: "uppercase", display: "block", marginBottom: 4, fontFamily: "'Montserrat',sans-serif" }}>Observações</label>
          <textarea value={f.obs} onChange={e => setF({ ...f, obs: e.target.value })} rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + B.creme, fontSize: 13, fontFamily: "'Montserrat',sans-serif", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ background: B.offwhite, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: B.caramelo, lineHeight: 1.6, fontFamily: "'Montserrat',sans-serif" }}>✨ Sistema gerará automaticamente o checklist com <strong>37 tarefas</strong> e o Gantt.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn outline color={B.cinza} onClick={onBack}>Cancelar</Btn>
          <Btn onClick={criar}>🏗️ Criar Implantação</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();
  const [screen, setScreen] = useState("landing"); // landing | login | signup | forgot | app
  const [user, setUser] = useState(null);
  const [obras, setObras] = useState(OBRAS_DEFAULT);
  const [logs, setLogs] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [agend, setAgend] = useState({ ativo: false, dias: ["seg", "qua", "sex"], hora: "08:00", ultimoEnvio: null });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home");
  const [selObra, setSelObra] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRefresh, setUserRefresh] = useState(0);

  useEffect(() => { userStore.init(); }, []);

  useEffect(() => {
    (async () => {
      const oo = await store.get("ai-obras-v2", null); if (oo) setObras(oo);
      const ll = await store.get("ai-logs-v2", []); setLogs(ll);
      const cc = await store.get("ai-contatos-v2", []); setContatos(cc);
      const tt = await store.get("ai-templates-v2", []); setTemplates(tt);
      const ag = await store.get("ai-agend-v2", { ativo: false, dias: ["seg", "qua", "sex"], hora: "08:00", ultimoEnvio: null }); setAgend(ag);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) store.set("ai-obras-v2", obras); }, [obras, loaded]);
  useEffect(() => { if (loaded) store.set("ai-logs-v2", logs); }, [logs, loaded]);
  useEffect(() => { if (loaded) store.set("ai-contatos-v2", contatos); }, [contatos, loaded]);
  useEffect(() => { if (loaded) store.set("ai-templates-v2", templates); }, [templates, loaded]);
  useEffect(() => { if (loaded) store.set("ai-agend-v2", agend); }, [agend, loaded]);

  const addLog = useCallback((obraNome, tarefa, campo, de, para) => {
    setLogs(prev => [...prev, { id: Date.now(), ts: new Date().toISOString(), obra: obraNome, tarefa, campo, de, para }]);
  }, []);

  const handleUpdate = useCallback((updated) => {
    const r = recalc(updated);
    setObras(prev => prev.map(o => o.id === r.id ? r : o));
    setSelObra(r);
  }, []);

  const handleSelect = useCallback((obra) => {
    if (!canAccessObra(user, obra.id)) return;
    setSelObra(obra); setView("obra-detail");
  }, [user]);
  const handleCriar = useCallback((nova) => { setObras(prev => [...prev, nova]); }, []);
  const handleLogout = () => { setUser(null); setView("home"); setSidebarOpen(false); setScreen("landing"); };

  const obrasVisiveis = useMemo(() => visibleObras(user, obras), [user, obras]);
  const alertCount = obrasVisiveis.reduce((a, o) => a + o.tarefas.filter(t => t.status === "Atrasado" || (daysLeft(t, o.elap) <= 3 && t.status !== "Concluído")).length, 0);

  // ── Screens ────────────────────────────────────────────────────────────────
  if (screen === "landing") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Montserrat',sans-serif}`}</style>
      <LandingScreen onAccess={() => setScreen("login")} />
    </>
  );

  if (screen === "login") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Montserrat',sans-serif}`}</style>
      <LoginScreen onLogin={(u) => { setUser(u); setScreen(u.status === "pendente" ? "pending" : "app"); }} onSignup={() => setScreen("signup")} onForgot={() => setScreen("forgot")} />
    </>
  );

  if (screen === "pending") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Montserrat',sans-serif}`}</style>
      <PendingApprovalScreen user={user} onLogout={handleLogout} />
    </>
  );

  if (screen === "forgot") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Montserrat',sans-serif}`}</style>
      <ForgotPasswordScreen onBack={() => setScreen("login")} />
    </>
  );

  if (screen === "signup") return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Montserrat',sans-serif}`}</style>
      <SignupScreen onBack={() => setScreen("login")} onCadastrar={() => setScreen("login")} />
    </>
  );

  // ── Main App ───────────────────────────────────────────────────────────────
  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Montserrat',sans-serif", color: B.caramelo }}>⏳ Carregando…</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Montserrat', sans-serif; background: ${B.offwhite}; }
        button, input, select, textarea { font-family: 'Montserrat', sans-serif; outline: none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${B.creme}; }
        ::-webkit-scrollbar-thumb { background: ${B.caramelo}; border-radius: 3px; }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar view={view} setView={setView} isMobile={isMobile} open={sidebarOpen} onClose={() => setSidebarOpen(false)} alertCount={alertCount} user={user} onLogout={handleLogout} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar isMobile={isMobile} onMenu={() => setSidebarOpen(true)} alertCount={alertCount} view={view} selObra={selObra} user={user} onLogout={handleLogout} />
          <div style={{ flex: 1, padding: isMobile ? "0 16px 24px" : "0 26px 24px", overflowX: "hidden" }}>
            {view === "home" && <HomeView obras={obrasVisiveis} onSelect={handleSelect} logs={logs} isMobile={isMobile} />}
            {view === "obra-detail" && selObra && canAccessObra(user, selObra.id) && <ObraDetail obra={selObra} onBack={() => setView("home")} onUpdate={handleUpdate} addLog={addLog} isMobile={isMobile} user={user} />}
            {view === "nova" && (canEdit(user) && (isAdmin(user) || user?.permissoes?.todas)
              ? <NovaObra onBack={() => setView("home")} templates={templates} onCriar={handleCriar} isMobile={isMobile} />
              : <AccessDenied />)}
            {view === "equipe" && <EquipeView obras={obrasVisiveis} logs={logs} />}
            {view === "relatorios" && <RelatoriosView obras={obrasVisiveis} />}
            {view === "whatsapp" && <WhatsAppView obras={obrasVisiveis} contatos={contatos} setContatos={setContatos} agend={agend} setAgend={setAgend} />}
            {view === "usuarios" && (isAdmin(user)
              ? <UsuariosView currentUser={user} obras={obras} isMobile={isMobile} refreshKey={userRefresh} onRefresh={() => setUserRefresh(x => x + 1)} />
              : <AccessDenied />)}
            {view === "config" && (isAdmin(user)
              ? <ConfigView obras={obras} templates={templates} setTemplates={setTemplates} />
              : <AccessDenied />)}
          </div>
        </div>
      </div>
    </>
  );
}
