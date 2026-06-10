import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  HelpCircle,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Send,
  Store,
  TicketIcon,
  UserRound,
  X
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

type Role = "client" | "staff" | "admin";
type User = { id: string; name: string; email: string; role: Role; organizationId: string | null };
type Category = { id: string; name: string };
type Ticket = {
  id: number;
  subject: string;
  details: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: "em_fila" | "analisando" | "em_desenvolvimento" | "resolvido" | "aberto" | "em_atendimento";
  createdAt: string;
  updatedAt: string;
  requester?: User;
  organization?: { name: string };
  category?: Category;
  messages?: TicketMessage[];
  attachments?: Attachment[];
};
type TicketMessage = {
  id: string;
  message: string;
  visibility: "public" | "internal";
  createdAt: string;
  author?: User;
  attachments?: Attachment[];
};
type Attachment = { id: string; originalName: string; mimeType: string; size: number };
type Release = {
  id: string;
  title: string;
  description: string;
  status: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  items: { id: string; title: string; description: string; ticketId: number | null }[];
};
type WorkspaceTab = "tickets" | "releases" | "help";
type MessageMode = "public" | "internal";
type ActionFeedback = { kind: "success" | "error" | "info"; text: string } | null;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const statusOptions = [
  { value: "em_fila", label: "Em fila" },
  { value: "analisando", label: "Analisando" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "resolvido", label: "Resolvido" }
] as const;

function statusLabel(status: Ticket["status"]) {
  const legacy: Record<string, string> = {
    aberto: "Em fila",
    em_atendimento: "Analisando"
  };
  return legacy[status] ?? statusOptions.find((option) => option.value === status)?.label ?? status;
}

async function api<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}/api${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? "Erro na requisicao.");
  return body as T;
}

function AppShell({ user, onLogout, children }: { user: User; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>Hubly Tickets</strong>
            <span>Atendimento</span>
          </div>
        </div>
        <nav className="nav">
          <a href="#tickets"><TicketIcon size={18} /> Tickets</a>
          <a href="#releases"><Bell size={18} /> Atualizacoes</a>
          <a href="#help"><HelpCircle size={18} /> Ajuda</a>
        </nav>
        <button className="ghost-button" onClick={onLogout}><LogOut size={17} /> Sair</button>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{user.role === "client" ? "Cliente" : "Equipe interna"}</span>
            <h1>Central de tickets</h1>
          </div>
          <div className="user-pill">{user.name}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

function AuthScreen({ onAuth }: { onAuth: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const result = await api<{ token: string; user: User }>(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      onAuth(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar.");
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <div className="brand large">
          <div className="brand-mark">H</div>
          <div>
            <strong>Hubly Tickets</strong>
            <span>Portal de suporte</span>
          </div>
        </div>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Criar conta</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === "register" && (
            <>
              <label>Nome<input name="name" required minLength={2} /></label>
              <label>Organizacao<input name="organization" required minLength={2} /></label>
            </>
          )}
          <label>E-mail<input name="email" type="email" required /></label>
          <label>Senha<input name="password" type="password" required minLength={mode === "register" ? 6 : 1} /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" type="submit">{mode === "login" ? "Entrar" : "Cadastrar"}</button>
        </form>
      </section>
    </div>
  );
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem("ticket.token") ?? "");
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("ticket.user");
    return stored ? JSON.parse(stored) : null;
  });

  function onAuth(nextToken: string, nextUser: User) {
    localStorage.setItem("ticket.token", nextToken);
    localStorage.setItem("ticket.user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("ticket.token");
    localStorage.removeItem("ticket.user");
    setToken("");
    setUser(null);
  }

  if (!token || !user) return <AuthScreen onAuth={onAuth} />;
  return (
    <AppShell user={user} onLogout={logout}>
      <Dashboard token={token} user={user} />
    </AppShell>
  );
}

function Dashboard({ token, user }: { token: string; user: User }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("tickets");
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", categoryId: "" });
  const [notice, setNotice] = useState("");
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState<"status" | "priority" | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageMode, setMessageMode] = useState<MessageMode>("public");
  const [creatingRelease, setCreatingRelease] = useState(false);
  const staff = user.role === "staff" || user.role === "admin";

  async function loadBase() {
    const [nextCategories, nextTickets, nextReleases] = await Promise.all([
      api<Category[]>("/categories", { headers: authHeaders(token) }),
      api<Ticket[]>(`/tickets?${new URLSearchParams(filters).toString()}`, { headers: authHeaders(token) }),
      api<Release[]>("/releases", { headers: authHeaders(token) })
    ]);
    setCategories(nextCategories);
    setTickets(nextTickets);
    setReleases(nextReleases);
  }

  async function loadTicket(id: number, preserveFeedback = false) {
    const ticket = await api<Ticket>(`/tickets/${id}`, { headers: authHeaders(token) });
    setSelected(ticket);
    setSelectedId(id);
    if (!preserveFeedback) setActionFeedback(null);
  }

  useEffect(() => {
    loadBase().catch((err) => setNotice(err.message));
  }, []);

  useEffect(() => {
    function syncTabWithHash() {
      if (window.location.hash === "#releases") {
        setActiveTab("releases");
        return;
      }
      if (window.location.hash === "#help") {
        setActiveTab("help");
        return;
      }
      setActiveTab("tickets");
    }
    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);
    return () => window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  useEffect(() => {
    if (selectedId) loadTicket(selectedId).catch((err) => setNotice(err.message));
  }, [selectedId]);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingTicket) return;
    const target = event.currentTarget;
    const form = new FormData(target);
    setCreatingTicket(true);
    setNotice("Criando ticket...");
    try {
      await fetch(`${API_URL}/api/tickets`, { method: "POST", headers: authHeaders(token), body: form }).then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? "Erro ao criar ticket.");
        return body;
      });
      target.reset();
      setCreateOpen(false);
      setNotice("Ticket criado. A equipe sera notificada.");
      await loadBase();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Erro ao criar ticket.");
    } finally {
      setCreatingTicket(false);
    }
  }

  async function updateTicket(id: number, data: Partial<Ticket>) {
    const field = data.status ? "status" : "priority";
    setUpdatingTicket(field);
    setActionFeedback({ kind: "info", text: field === "status" ? "Salvando status..." : "Salvando prioridade..." });
    try {
      await api<Ticket>(`/tickets/${id}`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      await loadBase();
      await loadTicket(id, true);
      const value = data.status ? statusLabel(data.status) : data.priority;
      setActionFeedback({ kind: "success", text: `${field === "status" ? "Status" : "Prioridade"} alterado para ${value}.` });
    } catch (err) {
      setActionFeedback({ kind: "error", text: err instanceof Error ? err.message : "Nao foi possivel salvar a alteracao." });
    } finally {
      setUpdatingTicket(null);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sendingMessage) return;
    const form = new FormData(event.currentTarget);
    form.set("visibility", messageMode);
    const target = event.currentTarget;
    const label = messageMode === "internal" ? "nota interna" : "resposta ao cliente";
    setSendingMessage(true);
    setActionFeedback({ kind: "info", text: `Enviando ${label}...` });
    try {
      await fetch(`${API_URL}/api/tickets/${selected.id}/messages`, { method: "POST", headers: authHeaders(token), body: form }).then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message ?? `Erro ao enviar ${label}.`);
      });
      target.reset();
      await loadTicket(selected.id, true);
      setActionFeedback({ kind: "success", text: `${messageMode === "internal" ? "Nota interna salva" : "Resposta enviada ao cliente"}.` });
    } catch (err) {
      setActionFeedback({ kind: "error", text: err instanceof Error ? err.message : `Erro ao enviar ${label}.` });
    } finally {
      setSendingMessage(false);
    }
  }

  async function createRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRelease) return;
    const form = new FormData(event.currentTarget);
    const target = event.currentTarget;
    setCreatingRelease(true);
    setNotice("Salvando atualizacao...");
    try {
      await api<Release>("/releases", {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          status: form.get("status"),
          published: form.get("published") === "on",
          items: form.get("itemTitle")
            ? [{ title: form.get("itemTitle"), description: form.get("itemDescription") || form.get("description"), ticketId: null }]
            : []
        })
      });
      target.reset();
      setNotice("Atualizacao salva.");
      await loadBase();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Erro ao salvar atualizacao.");
    } finally {
      setCreatingRelease(false);
    }
  }

  const stats = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status !== "resolvido").length,
    solved: tickets.filter((ticket) => ticket.status === "resolvido").length
  }), [tickets]);

  return (
    <div className="workspace">
      {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}

      <div className="workspace-tabs" role="tablist" aria-label="Areas do painel">
        <button type="button" className={activeTab === "tickets" ? "active" : ""} onClick={() => { window.location.hash = "tickets"; setActiveTab("tickets"); }} aria-selected={activeTab === "tickets"} role="tab">
          <TicketIcon size={17} /> Tickets
        </button>
        <button type="button" className={activeTab === "releases" ? "active" : ""} onClick={() => { window.location.hash = "releases"; setActiveTab("releases"); }} aria-selected={activeTab === "releases"} role="tab">
          <Bell size={17} /> Atualizacoes
        </button>
        <button type="button" className={activeTab === "help" ? "active" : ""} onClick={() => { window.location.hash = "help"; setActiveTab("help"); }} aria-selected={activeTab === "help"} role="tab">
          <HelpCircle size={17} /> Ajuda
        </button>
      </div>

      {activeTab === "tickets" && <section id="tickets" className="band">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Tickets</span>
            <h2>{staff ? "Fila de atendimento" : "Meus tickets"}</h2>
          </div>
          <div className="heading-actions">
            <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Novo ticket</button>
            <div className="stats"><span>{stats.open} ativos</span><span>{stats.solved} resolvidos</span></div>
          </div>
        </div>

        <div className="ticket-grid">
          <div className="panel list-panel">
            <div className="filters">
              <div className="search"><Search size={16} /><input placeholder="Buscar assunto" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Status</option>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button className="secondary-button" onClick={() => loadBase()}>Filtrar</button>
            </div>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <button key={ticket.id} className={`ticket-row ${selectedId === ticket.id ? "active" : ""}`} onClick={() => setSelectedId(ticket.id)}>
                  <span className={`dot ${ticket.status}`} />
                  <strong>#{ticket.id} {ticket.subject}</strong><span className="ticket-status">{statusLabel(ticket.status)}</span>
                  <small>{ticket.category?.name} · {ticket.priority} · {new Date(ticket.updatedAt).toLocaleDateString("pt-BR")}</small>
                  {staff && <small>{ticket.requester?.name} · {ticket.organization?.name}</small>}
                </button>
              ))}
              {!tickets.length && <div className="empty">Nenhum ticket encontrado.</div>}
            </div>
          </div>
        </div>

        {selected && (
          <div className="panel detail-panel">
            <div className="detail-header">
              <div>
                <h3><MessageSquare size={18} /> #{selected.id} {selected.subject}</h3>
                <p>{selected.details}</p>
                {actionFeedback && <div className={`action-feedback ${actionFeedback.kind}`}>{actionFeedback.text}</div>}
              </div>
              {staff && (
                <div className="actions">
                  <label>Status
                    <select value={selected.status} disabled={updatingTicket !== null} onChange={(e) => updateTicket(selected.id, { status: e.target.value as Ticket["status"] })}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Prioridade
                    <select value={selected.priority} disabled={updatingTicket !== null} onChange={(e) => updateTicket(selected.id, { priority: e.target.value as Ticket["priority"] })}>
                    <option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="messages">
              {selected.messages?.map((message) => (
                <div className={`message ${message.visibility}`} key={message.id}>
                  <div><strong>{message.author?.name}</strong><span>{new Date(message.createdAt).toLocaleString("pt-BR")}</span>{message.visibility === "internal" && <em>Interno</em>}</div>
                  <p>{message.message}</p>
                  {message.attachments?.map((attachment) => (
                    <a key={attachment.id} href={`${API_URL}/api/attachments/${attachment.id}/download?token=${token}`} target="_blank" rel="noreferrer"><FileText size={15} /> {attachment.originalName}</a>
                  ))}
                </div>
              ))}
            </div>
            <form className="form reply-form" onSubmit={sendMessage}>
              {staff && (
                <div className="message-mode" role="tablist" aria-label="Tipo de mensagem">
                  <button type="button" className={messageMode === "public" ? "active" : ""} onClick={() => setMessageMode("public")}>Resposta ao cliente</button>
                  <button type="button" className={messageMode === "internal" ? "active" : ""} onClick={() => setMessageMode("internal")}>Nota interna</button>
                </div>
              )}
              <textarea name="message" placeholder={messageMode === "internal" ? "Escrever nota interna" : "Responder ao cliente"} required disabled={sendingMessage} />
              <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={sendingMessage} />
              <button className="primary-button" type="submit" disabled={sendingMessage}>
                {sendingMessage ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                {sendingMessage ? "Enviando..." : messageMode === "internal" ? "Salvar nota" : "Enviar resposta"}
              </button>
            </form>
          </div>
        )}
      </section>}

      {createOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !creatingTicket && setCreateOpen(false)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="new-ticket-title"><Plus size={18} /> Novo ticket</h3>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setCreateOpen(false)} disabled={creatingTicket}><X size={18} /></button>
            </div>
            <form className="form compact" onSubmit={createTicket}>
              <label>Assunto<input name="subject" required minLength={3} autoFocus disabled={creatingTicket} /></label>
              <label>Detalhes<textarea name="details" required minLength={5} disabled={creatingTicket} /></label>
              <div className="form-row">
                <label>Categoria<select name="categoryId" required disabled={creatingTicket}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Prioridade<select name="priority" defaultValue="media" disabled={creatingTicket}><option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
              </div>
              <label>Anexo<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={creatingTicket} /></label>
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={creatingTicket}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={creatingTicket}>
                  {creatingTicket ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                  {creatingTicket ? "Criando..." : "Enviar ticket"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {activeTab === "releases" && <section id="releases" className="band">
        <div className="section-heading">
          <div><span className="eyebrow">Atualizacoes</span><h2>Releases e resolvidos</h2></div>
        </div>
        {staff && (
          <div className="panel">
            <h3><CheckCircle2 size={18} /> Publicar atualizacao</h3>
            <form className="form compact" onSubmit={createRelease}>
              <div className="form-row"><label>Titulo<input name="title" required disabled={creatingRelease} /></label><label>Status<select name="status" disabled={creatingRelease}><option value="planejado">Planejado</option><option value="em_andamento">Em andamento</option><option value="resolvido">Resolvido</option><option value="publicado">Publicado</option></select></label></div>
              <label>Descricao<textarea name="description" required disabled={creatingRelease} /></label>
              <div className="form-row"><label>Item resolvido<input name="itemTitle" disabled={creatingRelease} /></label><label>Detalhe do item<input name="itemDescription" disabled={creatingRelease} /></label></div>
              <label className="checkbox"><input name="published" type="checkbox" defaultChecked disabled={creatingRelease} /> Publicar para todos os clientes</label>
              <button className="primary-button" type="submit" disabled={creatingRelease}>
                {creatingRelease ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />}
                {creatingRelease ? "Salvando..." : "Salvar atualizacao"}
              </button>
            </form>
          </div>
        )}
        <div className="release-list">
          {releases.map((release) => (
            <article className="release-card" key={release.id}>
              <div><span className={`status ${release.published ? "published" : ""}`}>{release.published ? "Publicado" : "Rascunho"}</span><span>{release.status.replace("_", " ")}</span></div>
              <h3>{release.title}</h3>
              <p>{release.description}</p>
              {release.items?.map((item) => <p className="release-item" key={item.id}><CheckCircle2 size={15} /> {item.title}: {item.description}</p>)}
            </article>
          ))}
          {!releases.length && <div className="empty">Nenhuma atualizacao publicada.</div>}
        </div>
      </section>}

      {activeTab === "help" && <section id="help" className="band">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Ajuda Hubly</span>
            <h2>Duvidas comuns sobre vitrine e agendamentos</h2>
          </div>
        </div>

        <div className="panel help-panel help-featured">
          <h3><HelpCircle size={18} /> Por que meu cliente nao consegue agendar?</h3>
          <p>Na maioria dos casos, o bloqueio acontece porque a vitrine ainda nao esta pronta para o publico. O cliente so consegue agendar quando existe vitrine publicada, perfil completo, profissional ativo, servico ativo com preco e horario disponivel para aquele profissional.</p>
          <ul className="help-list">
            <li>Abra <strong>Vitrine</strong> e veja se o checklist esta completo.</li>
            <li>Confira se o botao <strong>Publicado</strong> esta ativo e se voce clicou em <strong>Salvar vitrine</strong>.</li>
            <li>Em <strong>Profissionais</strong>, confirme se o profissional esta ativo.</li>
            <li>Clique em <strong>Horarios</strong> e confira se existe pelo menos um dia ativo com expediente valido.</li>
            <li>Veja se o servico esta ativo, tem preco e pertence ao mesmo profissional.</li>
            <li>Teste em <strong>/clientes</strong>, escolhendo a empresa, profissional, servico, data e horario.</li>
          </ul>
        </div>

        <div className="help-layout">
          <div className="panel help-panel">
            <h3><TicketIcon size={18} /> Como abrir um chamado de suporte</h3>
            <p>Use chamados quando a organizacao tentou seguir os passos e ainda precisa de ajuda da equipe Hubly.</p>
            <ul className="help-list">
              <li>Abra a aba <strong>Tickets</strong>.</li>
              <li>Clique em <strong>Novo ticket</strong>.</li>
              <li>Escreva um assunto claro, por exemplo: <strong>Cliente nao consegue agendar</strong>.</li>
              <li>Em detalhes, informe o nome da organizacao, link da vitrine, profissional, servico, data testada e o erro visto.</li>
              <li>Se tiver print, anexe uma imagem ou PDF.</li>
              <li>Clique em <strong>Enviar ticket</strong>. A equipe sera notificada e acompanhara por respostas dentro do ticket.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><Store size={18} /> Minha empresa nao aparece na galeria publica</h3>
            <p>Isso acontece quando a vitrine esta em rascunho ou ainda nao atende os requisitos minimos.</p>
            <ul className="help-list">
              <li>Preencha nome publico, descricao, telefone ou e-mail.</li>
              <li>Informe rua, cidade e UF.</li>
              <li>Adicione uma URL de foto de capa.</li>
              <li>Ative <strong>Publicado</strong> e clique em <strong>Salvar vitrine</strong>.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><UserRound size={18} /> O profissional nao aparece para o cliente</h3>
            <p>O cliente so escolhe profissionais que estao prontos para agendamento publico.</p>
            <ul className="help-list">
              <li>Cadastre o profissional em <strong>Profissionais</strong>.</li>
              <li>Informe nome completo e especialidade.</li>
              <li>Mantenha o status como <strong>Ativo</strong>.</li>
              <li>Garanta que ele tenha pelo menos um servico ativo com preco.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><CalendarClock size={18} /> Nao aparece nenhum horario disponivel</h3>
            <p>Os horarios dependem da carga horaria do profissional e da duracao do servico escolhido.</p>
            <ul className="help-list">
              <li>Clique em <strong>Horarios</strong> no profissional correto.</li>
              <li>Ative os dias em que ele atende.</li>
              <li>Use formato <strong>HH:MM</strong>, como 09:00 e 18:00.</li>
              <li>O horario inicial precisa ser menor que o horario final.</li>
              <li>Se preencher almoco, preencha inicio e fim. Para nao usar intervalo, deixe os dois vazios.</li>
              <li>Se ja existe agendamento naquele horario, o slot fica ocupado.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><FileText size={18} /> O servico nao aparece na pagina publica</h3>
            <p>Servicos sem preco ou inativos nao entram no agendamento publico.</p>
            <ul className="help-list">
              <li>Crie o servico em <strong>Profissionais</strong> &gt; <strong>Novo servico</strong>.</li>
              <li>Escolha o profissional correto.</li>
              <li>Informe duracao em minutos.</li>
              <li>Informe preco maior que zero.</li>
              <li>Mantenha o servico como <strong>Ativo</strong>.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><CheckCircle2 size={18} /> Ativei publicado, mas continua como rascunho</h3>
            <p>O Hubly nao publica uma vitrine incompleta. Se faltar algum requisito, ele salva como rascunho para evitar uma pagina quebrada para o cliente final.</p>
            <ul className="help-list">
              <li>Complete o perfil publico.</li>
              <li>Cadastre um profissional ativo.</li>
              <li>Cadastre um servico ativo com preco.</li>
              <li>Configure agenda ativa para esse profissional.</li>
              <li>Volte em <strong>Vitrine</strong>, ative <strong>Publicado</strong> e salve novamente.</li>
            </ul>
          </div>

          <div className="panel help-panel">
            <h3><MessageSquare size={18} /> O cliente preencheu tudo e nao confirma</h3>
            <p>O botao de confirmacao so libera quando os dados obrigatorios estao validos.</p>
            <ul className="help-list">
              <li>Escolha profissional, servico, data e horario.</li>
              <li>Informe nome completo.</li>
              <li>Informe e-mail valido.</li>
              <li>Informe WhatsApp brasileiro valido.</li>
              <li>Se nao estiver conectado, crie senha com pelo menos 8 caracteres.</li>
            </ul>
          </div>
        </div>

        <div className="panel help-panel">
          <h3><CheckCircle2 size={18} /> Caminho correto para testar do zero</h3>
          <ul className="help-list">
            <li>No Hubly, abra <strong>Vitrine</strong> e complete perfil, endereco e foto de capa.</li>
            <li>Abra <strong>Profissionais</strong>, crie um profissional e deixe ativo.</li>
            <li>No profissional, clique em <strong>Horarios</strong> e salve dias ativos com expediente valido.</li>
            <li>Crie um <strong>Novo servico</strong> para esse profissional, com duracao e preco.</li>
            <li>Volte para <strong>Vitrine</strong>, ative <strong>Publicado</strong> e clique em <strong>Salvar vitrine</strong>.</li>
            <li>Acesse <strong>/clientes</strong>, encontre a empresa e faça um agendamento de teste.</li>
          </ul>
        </div>
      </section>}
    </div>
  );
}
