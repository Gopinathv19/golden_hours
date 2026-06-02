import { useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { api } from "./api";
import { clearSession, getToken, saveSession } from "./session";

const initialSummary = {
  total_hours: 0,
  remaining_hours: 10000,
  progress_percent: 0,
  today_hours: 0,
  week_hours: 0,
  month_hours: 0,
  day_to_day: [],
  weekly: [],
  monthly: [],
  quote: "Ten thousand hours begins with the next honest minute.",
};

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return path === "/register" ? "register" : "login";
}

function AuthLayout({ children }) {
  return (
    <main className="auth-shell">
      <section className="auth-art">
        <div className="brand-mark">
          <Sparkles size={28} />
        </div>
        <p className="kicker">Golden Hours</p>
        <h1>The Time Polisher</h1>
        <p className="auth-copy">Track every focused session toward your 10,000-hour mastery goal.</p>
      </section>
      {children}
    </main>
  );
}

function GoogleAuthButton({ label, onAuth, setError, setLoading }) {
  const googleClientId = window.__ENV__?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleCredential(response) {
    if (!response.credential) {
      setError("Google did not return a sign-in credential.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.googleAuth(response.credential);
      onAuth(saveSession(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!googleClientId) {
    return <p className="auth-hint">Google sign-in is unavailable until VITE_GOOGLE_CLIENT_ID is configured.</p>;
  }

  return (
    <div className="google-button" aria-label={label}>
      <GoogleLogin
        text={label.toLowerCase().includes("sign-up") ? "signup_with" : "signin_with"}
        width="100%"
        onSuccess={handleCredential}
        onError={() => setError("Google sign-in failed. Please try again.")}
      />
    </div>
  );
}

function LoginPage({ onAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ email: form.email.trim(), password: form.password });
      onAuth(saveSession(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-header">
          <h2>Login</h2>
          <p>Welcome back to your practice ledger.</p>
        </div>
        <GoogleAuthButton label="Google Sign-In" onAuth={onAuth} setError={setError} setLoading={setLoading} />
        <div className="divider"><span>or</span></div>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          <Mail size={18} />
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="auth-link">
          New here? <button type="button" onClick={() => navigateTo("/register")}>Create an account</button>
        </p>
      </form>
    </AuthLayout>
  );
}

function RegisterPage({ onAuth }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (form.name.trim().length < 2) return "Name must be at least 2 characters.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await api.register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      onAuth(saveSession(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-header">
          <h2>Register</h2>
          <p>Start counting the focused hours that matter.</p>
        </div>
        <GoogleAuthButton label="Google Sign-Up" onAuth={onAuth} setError={setError} setLoading={setLoading} />
        <div className="divider"><span>or</span></div>
        <label>
          Name
          <input
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        <label>
          Confirm Password
          <input
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          <CheckCircle2 size={18} />
          {loading ? "Creating account..." : "Register"}
        </button>
        <p className="auth-link">
          Already registered? <button type="button" onClick={() => navigateTo("/login")}>Login</button>
        </p>
      </form>
    </AuthLayout>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Bars({ items }) {
  const max = Math.max(...items.map((item) => item.hours), 1);
  return (
    <div className="bars">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label.slice(5)}</span>
          <div>
            <i style={{ width: `${(item.hours / max) * 100}%` }} />
          </div>
          <b>{item.hours}h</b>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [summary, setSummary] = useState(initialSummary);
  const [entries, setEntries] = useState([]);
  const [range, setRange] = useState("day_to_day");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Practice",
    minutes: 60,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const activeBars = useMemo(() => summary[range] || [], [range, summary]);

  async function load() {
    const [summaryData, entryData] = await Promise.all([api.summary(), api.entries()]);
    setSummary(summaryData);
    setEntries(entryData);
  }

  useEffect(() => {
    load().catch((err) => setNotice(err.message));
  }, []);

  async function addEntry(event) {
    event.preventDefault();
    setNotice("");
    try {
      await api.createEntry({ ...form, minutes: Number(form.minutes) });
      setForm({ ...form, title: "", notes: "" });
      await load();
      setNotice("Session added to your golden hours.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function removeEntry(id) {
    await api.deleteEntry(id);
    await load();
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotice("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Golden Hours", { body: "Daily practice reminder is ready." });
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="kicker">Golden Hours</p>
          <h1>The Time Polisher</h1>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={enableNotifications} title="Enable browser reminders">
            <Bell size={18} />
          </button>
          <button className="ghost-button" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <span className="welcome">Welcome, {user.name}</span>
          <strong>{summary.total_hours.toLocaleString()} / 10,000</strong>
          <p>{summary.remaining_hours.toLocaleString()} hours remaining</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${summary.progress_percent * 3.6}deg` }}>
          <span>{summary.progress_percent}%</span>
        </div>
      </section>

      <section className="metrics-grid">
        <Metric icon={<Clock3 size={20} />} label="Today" value={`${summary.today_hours}h`} />
        <Metric icon={<CalendarDays size={20} />} label="This week" value={`${summary.week_hours}h`} />
        <Metric icon={<Target size={20} />} label="This month" value={`${summary.month_hours}h`} />
      </section>

      <section className="work-grid">
        <form className="entry-form" onSubmit={addEntry}>
          <h2>Add time</h2>
          <label>
            Achievement
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Deep work, coding, design..."
              required
            />
          </label>
          <div className="form-row">
            <label>
              Minutes
              <input
                type="number"
                min="1"
                max="1440"
                value={form.minutes}
                onChange={(event) => setForm({ ...form, minutes: event.target.value })}
              />
            </label>
            <label>
              Date
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
          </div>
          <label>
            Category
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            Add session
          </button>
          {notice && <p className="notice">{notice}</p>}
        </form>

        <section className="comparison-panel">
          <div className="panel-head">
            <h2>Report</h2>
            <div className="tabs">
              <button className={range === "day_to_day" ? "active" : ""} onClick={() => setRange("day_to_day")}>Day</button>
              <button className={range === "weekly" ? "active" : ""} onClick={() => setRange("weekly")}>Week</button>
              <button className={range === "monthly" ? "active" : ""} onClick={() => setRange("monthly")}>Month</button>
            </div>
          </div>
          <Bars items={activeBars} />
          <blockquote>{summary.quote}</blockquote>
        </section>
      </section>

      <section className="entry-list">
        <h2>Recent sessions</h2>
        {entries.map((entry) => (
          <article key={entry.id} className="entry-item">
            <div>
              <strong>{entry.title}</strong>
              <span>{entry.category} - {entry.date} - {Math.round((entry.minutes / 60) * 100) / 100}h</span>
            </div>
            <button className="icon-button" onClick={() => removeEntry(entry.id)} title="Delete session">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const route = useRoute();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        if (window.location.pathname === "/login" || window.location.pathname === "/register") {
          navigateTo("/");
        }
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  function handleAuth(authenticatedUser) {
    setUser(authenticatedUser);
    navigateTo("/");
  }

  function logout() {
    clearSession();
    setUser(null);
    navigateTo("/login");
  }

  if (loading) {
    return <div className="loading">Polishing time...</div>;
  }

  if (user) {
    return <Dashboard user={user} onLogout={logout} />;
  }

  return route === "register" ? <RegisterPage onAuth={handleAuth} /> : <LoginPage onAuth={handleAuth} />;
}
