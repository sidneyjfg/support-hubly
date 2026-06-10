import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, FileText, LogOut, MessageSquare, Plus, Search, Send, TicketIcon, X } from "lucide-react";

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
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", categoryId: "" });
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
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

  async function loadTicket(id: number) {
    const ticket = await api<Ticket>(`/tickets/${id}`, { headers: authHeaders(token) });
    setSelected(ticket);
    setSelectedId(id);
  }

  useEffect(() => {
    loadBase().catch((err) => setNotice(err.message));
  }, []);

  useEffect(() => {
    if (selectedId) loadTicket(selectedId).catch((err) => setNotice(err.message));
  }, [selectedId]);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch(`${API_URL}/api/tickets`, { method: "POST", headers: authHeaders(token), body: form }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).message);
      return response.json();
    });
    event.currentTarget.reset();
    setCreateOpen(false);
    setNotice("Ticket criado e notificacao enviada para a equipe.");
    await loadBase();
  }

  async function updateTicket(id: number, data: Partial<Ticket>) {
    await api<Ticket>(`/tickets/${id}`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    await loadBase();
    await loadTicket(id);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    await fetch(`${API_URL}/api/tickets/${selected.id}/messages`, { method: "POST", headers: authHeaders(token), body: form }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).message);
    });
    event.currentTarget.reset();
    await loadTicket(selected.id);
  }

  async function createRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
    event.currentTarget.reset();
    await loadBase();
  }

  const stats = useMemo(() => ({
    open: tickets.filter((ticket) => ticket.status !== "resolvido").length,
    solved: tickets.filter((ticket) => ticket.status === "resolvido").length
  }), [tickets]);

  return (
    <div className="workspace">
      {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}

      <section id="tickets" className="band">
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
                <button key={ticket.id} className={`ticket-row ${selectedId === ticket.id ? "active" : ""}`} onClick={() => loadTicket(ticket.id)}>
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
              </div>
              {staff && (
                <div className="actions">
                  <select value={selected.status} onChange={(e) => updateTicket(selected.id, { status: e.target.value as Ticket["status"] })}>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={selected.priority} onChange={(e) => updateTicket(selected.id, { priority: e.target.value as Ticket["priority"] })}>
                    <option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
                  </select>
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
              <textarea name="message" placeholder="Responder ticket" required />
              {staff && <label className="checkbox"><input name="visibility" type="checkbox" value="internal" /> Nota interna</label>}
              <input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" />
              <button className="primary-button" type="submit"><Send size={17} /> Responder</button>
            </form>
          </div>
        )}
      </section>

      {createOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="new-ticket-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="new-ticket-title"><Plus size={18} /> Novo ticket</h3>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            </div>
            <form className="form compact" onSubmit={createTicket}>
              <label>Assunto<input name="subject" required minLength={3} autoFocus /></label>
              <label>Detalhes<textarea name="details" required minLength={5} /></label>
              <div className="form-row">
                <label>Categoria<select name="categoryId" required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Prioridade<select name="priority" defaultValue="media"><option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
              </div>
              <label>Anexo<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" /></label>
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className="primary-button" type="submit"><Send size={17} /> Enviar ticket</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section id="releases" className="band">
        <div className="section-heading">
          <div><span className="eyebrow">Atualizacoes</span><h2>Releases e resolvidos</h2></div>
        </div>
        {staff && (
          <div className="panel">
            <h3><CheckCircle2 size={18} /> Publicar atualizacao</h3>
            <form className="form compact" onSubmit={createRelease}>
              <div className="form-row"><label>Titulo<input name="title" required /></label><label>Status<select name="status"><option value="planejado">Planejado</option><option value="em_andamento">Em andamento</option><option value="resolvido">Resolvido</option><option value="publicado">Publicado</option></select></label></div>
              <label>Descricao<textarea name="description" required /></label>
              <div className="form-row"><label>Item resolvido<input name="itemTitle" /></label><label>Detalhe do item<input name="itemDescription" /></label></div>
              <label className="checkbox"><input name="published" type="checkbox" defaultChecked /> Publicar para todos os clientes</label>
              <button className="primary-button" type="submit">Salvar atualizacao</button>
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
      </section>
    </div>
  );
}
