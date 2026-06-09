import { useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  LineChart as LineChartIcon,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { api } from "./api";
import { clearSession, getToken, saveSession } from "./session";

const GOAL_HOURS = 10000;
const MONTHLY_GOAL = 80;

const initialSummary = {
  total_hours: 0,
  remaining_hours: GOAL_HOURS,
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

function usePath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return path;
}

function formatHours(value = 0) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}h`;
}

function shortDate(label) {
  if (!label) return "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const parts = label.split("-");
  if (parts.length < 3) return label;

  const month = months[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);

  return `${month} ${day}`;
}

function parseDateKey(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getAnalytics(summary, entries) {
  const daily = [...(summary.day_to_day || [])];
  const weekly = [...(summary.weekly || [])];
  const monthly = [...(summary.monthly || [])];
  const activeDays = daily.filter((item) => item.hours > 0);
  const bestDay = activeDays.reduce((best, item) => (item.hours > (best?.hours || 0) ? item : best), null);
  const dailyAverage = daily.length ? summary.total_hours / Math.max(daily.length, 1) : 0;
  const weeklyAverage = weekly.length ? weekly.reduce((sum, item) => sum + item.hours, 0) / weekly.length : summary.week_hours;
  const monthlyAverage = monthly.length ? monthly.reduce((sum, item) => sum + item.hours, 0) / monthly.length : summary.month_hours;
  const currentStreak = calculateStreak(daily);
  const longestStreak = calculateLongestStreak(daily);
  const recentWeek = weekly.at(-1)?.hours || 0;
  const previousWeek = weekly.at(-2)?.hours || 0;
  const weeklyGrowth = previousWeek ? ((recentWeek - previousWeek) / previousWeek) * 100 : 0;
  const recentMonth = monthly.at(-1)?.hours || summary.month_hours || 0;
  const previousMonth = monthly.at(-2)?.hours || 0;
  const monthlyGrowth = previousMonth ? ((recentMonth - previousMonth) / previousMonth) * 100 : 0;
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const averageSession = entries.length ? totalMinutes / entries.length / 60 : 0;
  const byWeekday = entries.reduce((map, entry) => {
    const weekday = parseDateKey(entry.date).toLocaleDateString(undefined, { weekday: "long" });
    map[weekday] = (map[weekday] || 0) + entry.minutes / 60;
    return map;
  }, {});
  const productiveDay = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0]?.[0] || "No sessions yet";

  return {
    daily,
    weekly,
    monthly,
    bestDay,
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    currentStreak,
    longestStreak,
    weeklyGrowth,
    monthlyGrowth,
    averageSession,
    productiveDay,
    recentMonth,
  };
}

function calculateStreak(days) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if ((days[index]?.hours || 0) <= 0) break;
    streak += 1;
  }
  return streak;
}

function calculateLongestStreak(days) {
  let longest = 0;
  let current = 0;
  days.forEach((day) => {
    current = day.hours > 0 ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
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
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
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
          <input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        </label>
        <label>
          Confirm Password
          <input type="password" minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
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

function StatCard({ icon, label, value, detail, trend }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <p>{detail}</p>}
        {trend && <small className={trend.startsWith("-") ? "down" : "up"}>{trend}</small>}
      </div>
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const formattedLabel = label
    ? label.split("-").reverse().join("-")
    : "";

  return (
    <div className="chart-tooltip">
      <strong>{formattedLabel}</strong>
      <span>{payload[0].value}h</span>
    </div>
  );
}

function MiniBars({ items }) {
  const max = Math.max(...items.map((item) => item.hours), 1);
  return (
    <div className="mini-bars">
      {items.slice(-8).map((item) => (
        <div className="mini-bar-row" key={item.label}>
          <span>{shortDate(item.label)}</span>
          <div><i style={{ width: `${(item.hours / max) * 100}%` }} /></div>
          <b>{item.hours}h</b>
        </div>
      ))}
    </div>
  );
}

function SessionForm({ form, setForm, onSubmit, notice }) {
  return (
    <form className="entry-form" onSubmit={onSubmit}>
      <h2>Add Time</h2>
      <label>
        Achievement
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Deep work, coding, design..." required />
      </label>
      <div className="form-row">
        <label>
          Minutes
          <input type="number" min="1" max="1440" value={form.minutes} onChange={(event) => setForm({ ...form, minutes: event.target.value })} />
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
        Add Session
      </button>
      {notice && <p className="notice">{notice}</p>}
    </form>
  );
}

function DashboardPage({ user, summary, entries, analytics, reload, onLogout, notice, setNotice }) {
  const [range, setRange] = useState("day_to_day");
  const [form, setForm] = useState({
    title: "",
    category: "Practice",
    minutes: 60,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [currentPage,setCurrentPage] = useState(1);
  const itemsPerPage=5;
  const [selectedEntry, setSelectedEntry] = useState(null);
  const activeItems = summary[range] || [];

  const sortedEntries = [...entries].sort(
    (a,b) => new Date(b.date) - new Date(a.date)
  );

  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);

  const startIndex = (currentPage - 1)*itemsPerPage;

  const currentEntries = sortedEntries.slice(
    startIndex, startIndex+itemsPerPage
  )

  async function addEntry(event) {
    event.preventDefault();
    setNotice("");
    try {
      await api.createEntry({ ...form, minutes: Number(form.minutes) });
      setForm({ ...form, title: "", notes: "" });
      await reload();
      setNotice("Session added to your golden hours.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function removeEntry(id) {
    await api.deleteEntry(id);
    await reload();
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
      <AppHeader title="Dashboard" subtitle="Golden Hours" onLogout={onLogout} onNotify={enableNotifications} />

      <section className="hero-panel">
        <div>
          <span className="welcome">Welcome, {user.name}</span>
          <h1>Golden Hours</h1>
          <strong>{formatHours(summary.total_hours)} / 10,000h</strong>
          <p>{formatHours(summary.remaining_hours)} remaining · {analytics.currentStreak} day streak</p>
        </div>
        <div className="progress-ring" style={{ "--progress": `${summary.progress_percent * 3.6}deg` }}>
          <span>{summary.progress_percent}%</span>
        </div>
      </section>

      <section className="metrics-grid">
        <StatCard icon={<Clock3 size={20} />} label="Today" value={formatHours(summary.today_hours)} detail="Focused practice" />
        <StatCard icon={<CalendarDays size={20} />} label="This Week" value={formatHours(summary.week_hours)} detail="Weekly momentum" />
        <StatCard icon={<Target size={20} />} label="This Month" value={formatHours(summary.month_hours)} detail="Monthly mastery" />
      </section>

      <section className="work-grid">
        <SessionForm form={form} setForm={setForm} onSubmit={addEntry} notice={notice} />
        <section className="analytics-panel report-summary">
          <div className="panel-head">
            <div>
              <h2>Report Summary</h2>
              <p>Current snapshot</p>
            </div>
            <div className="tabs">
              <button className={range === "day_to_day" ? "active" : ""} onClick={() => setRange("day_to_day")}>Day</button>
              <button className={range === "weekly" ? "active" : ""} onClick={() => setRange("weekly")}>Week</button>
              <button className={range === "monthly" ? "active" : ""} onClick={() => setRange("monthly")}>Month</button>
            </div>
          </div>
          <div className="summary-strip">
            <StatCard icon={<Flame size={18} />} label="Streak" value={`${analytics.currentStreak}d`} />
            <StatCard icon={<BarChart3 size={18} />} label="Total" value={formatHours(summary.total_hours)} />
            <StatCard icon={<TrendingUp size={18} />} label="Average" value={formatHours(analytics.dailyAverage)} />
          </div>
          <div className="small-chart">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={activeItems}>
                <defs>
                  <linearGradient id="goldArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#ffd85a" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#ffd85a" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickFormatter={shortDate} tick={{ fill: "#bfb6a1", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#bfb6a1", fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="hours" stroke="#ffd85a" fill="url(#goldArea)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="report-insights">
            <p><span>Best Day</span><strong>{analytics.bestDay ? `${shortDate(analytics.bestDay.label)} · ${analytics.bestDay.hours}h` : "No data"}</strong></p>
            <p><span>Current Trend</span><strong>{analytics.weeklyGrowth >= 0 ? "Improving" : "Needs focus"}</strong></p>
            <p><span>Average Hours</span><strong>{formatHours(analytics.dailyAverage)}</strong></p>
          </div>
          <button className="wide-link" onClick={() => navigateTo("/reports")}>
            View Full Analytics <ArrowRight size={18} />
          </button>
        </section>
      </section>

      <section className="entry-list">
        <div className="panel-head">
          <h2>Recent Sessions</h2>
        </div>
        {currentEntries.map((entry) => (
          <article key={entry.id} className="entry-item">
            <div>
              <strong>{entry.title}</strong>
              <span>{entry.category} · {entry.date} · {formatHours(entry.minutes / 60)}</span>
            </div>
            
            <button className="icon-button" onClick={() => removeEntry(entry.id)} title="Delete session">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </section>
      <div className="pagination">
  <button
    onClick={() => setCurrentPage((p) => p - 1)}
    disabled={currentPage === 1}
  >
    Previous
  </button>

  {Array.from({ length: totalPages }, (_, i) => (
    <button
      key={i + 1}
      className={currentPage === i + 1 ? "active" : ""}
      onClick={() => setCurrentPage(i + 1)}
    >
      {i + 1}
    </button>
  ))}

  <button
    onClick={() => setCurrentPage((p) => p + 1)}
    disabled={currentPage === totalPages}
  >
    Next
  </button>
</div>
    </main>
  );
}

function AppHeader({ title, subtitle, onLogout, onNotify, back }) {
  return (
    <header className="topbar">
      <div>
        <p className="kicker">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        {back && (
          <button className="ghost-button" onClick={back}>
            <ArrowLeft size={18} />
            Dashboard
          </button>
        )}
        {onNotify && (
          <button className="icon-button" onClick={onNotify} title="Enable browser reminders">
            <Bell size={18} />
          </button>
        )}
        <button className="ghost-button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </header>
  );
}

function ReportsPage({ summary, entries, analytics, onLogout }) {
  const heatmapValues = useMemo(() => {
    const map = new Map((summary.day_to_day || []).map((item) => [item.label, item.hours]));
    const end = new Date();
    const start = addDays(end, -91);
    const values = [];
    for (let day = start; day <= end; day = addDays(day, 1)) {
      const date = isoDate(day);
      values.push({ date, count: map.get(date) || 0 });
    }
    return values;
  }, [summary.day_to_day]);

  const achievements = getAchievements(summary, analytics, entries);
  const pieData = [
    { name: "Complete", value: Math.min(summary.month_hours, MONTHLY_GOAL) },
    { name: "Remaining", value: Math.max(MONTHLY_GOAL - summary.month_hours, 0) },
  ];

  return (
    <main className="app-shell reports-shell">
      <AppHeader title="Reports" subtitle="Track consistency. Build your legacy." onLogout={onLogout} back={() => navigateTo("/")} />

      <section className="report-stat-grid">
        <StatCard icon={<Clock3 size={22} />} label="Total Hours" value={formatHours(summary.total_hours)} detail="Lifetime practice" />
        <StatCard icon={<Flame size={22} />} label="Current Streak" value={`${analytics.currentStreak} days`} detail={`Best: ${analytics.longestStreak} days`} />
        <StatCard icon={<TrendingUp size={22} />} label="Daily Average" value={formatHours(analytics.dailyAverage)} trend={`${analytics.weeklyGrowth.toFixed(0)}% vs last week`} />
        <StatCard icon={<BarChart3 size={22} />} label="Weekly Average" value={formatHours(analytics.weeklyAverage)} detail="Rolling report" />
        <StatCard icon={<CalendarDays size={22} />} label="Monthly Average" value={formatHours(analytics.monthlyAverage)} detail="Long-term pace" />
        <StatCard icon={<Target size={22} />} label="Goal Completion" value={`${summary.progress_percent}%`} detail="of 10,000h goal" />
      </section>

      <section className="report-grid two-columns">
        <section className="analytics-panel large-panel">
          <div className="panel-head">
            <div>
              <h2>Daily Analytics</h2>
              <p>Hours and trend over the active period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={330}>
            <ComposedChart data={analytics.daily}>
              <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
              <XAxis dataKey="label" tickFormatter={shortDate} tick={{ fill: "#bfb6a1", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#bfb6a1", fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="hours" fill="#f3b72f" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="hours" stroke="#ffdf63" strokeWidth={3} dot={{ r: 4, fill: "#0d0d0c", stroke: "#ffdf63", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="detail-strip">
            <p><span>Today</span><strong>{formatHours(summary.today_hours)}</strong></p>
            <p><span>Best Day</span><strong>{analytics.bestDay ? `${shortDate(analytics.bestDay.label)} (${analytics.bestDay.hours}h)` : "No data"}</strong></p>
            <p><span>Average</span><strong>{formatHours(analytics.dailyAverage)}</strong></p>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="panel-head">
            <div>
              <h2>Consistency Heatmap</h2>
              <p>Daily contribution intensity</p>
            </div>
          </div>
          <CalendarHeatmap
            startDate={addDays(new Date(), -91)}
            endDate={new Date()}
            values={heatmapValues}
            classForValue={(value) => {
              if (!value?.count) return "color-empty";
              if (value.count < 0.5) return "color-scale-1";
              if (value.count < 1) return "color-scale-2";
              if (value.count < 2) return "color-scale-3";
              return "color-scale-4";
            }}
            tooltipDataAttrs={(value) => ({ "data-tip": `${value?.date || ""}: ${value?.count || 0}h` })}
            showWeekdayLabels
          />
          <div className="heatmap-legend">
            <span />
            <span />
            <span />
            <span />
            <span />
            <b>2h+</b>
          </div>
        </section>
      </section>

      <section className="report-grid two-columns">
        <section className="analytics-panel">
          <div className="panel-head"><h2>Weekly Analytics</h2></div>
          <MiniBars items={analytics.weekly} />
          <div className="detail-strip compact">
            <p><span>Weekly Hours</span><strong>{formatHours(summary.week_hours)}</strong></p>
            <p><span>Growth</span><strong className={analytics.weeklyGrowth >= 0 ? "up" : "down"}>{analytics.weeklyGrowth.toFixed(0)}%</strong></p>
          </div>
        </section>

        <section className="analytics-panel monthly-panel">
          <div className="panel-head"><h2>Monthly Overview</h2></div>
          <div className="monthly-layout">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={72} outerRadius={92} startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#ffcf42" />
                    <Cell fill="rgba(255,255,255,.13)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{Math.min(Math.round((summary.month_hours / MONTHLY_GOAL) * 100), 100)}%</strong>
                <span>of {MONTHLY_GOAL}h monthly goal</span>
              </div>
            </div>
            <MiniBars items={analytics.monthly} />
          </div>
        </section>
      </section>

      <section className="report-grid two-columns">
        <section className="analytics-panel">
          <div className="panel-head"><h2>Productivity Insights</h2></div>
          <div className="insight-list">
            <Insight icon={<Award size={18} />} title="Most productive day" detail={analytics.productiveDay} />
            <Insight icon={<TrendingUp size={18} />} title="Weekly improvement" detail={`${analytics.weeklyGrowth.toFixed(0)}% compared with previous week`} />
            <Insight icon={<Clock3 size={18} />} title="Average session" detail={formatHours(analytics.averageSession)} />
            <Insight icon={<Flame size={18} />} title="Longest streak" detail={`${analytics.longestStreak} days`} />
          </div>
        </section>

        <section className="analytics-panel">
          <div className="panel-head"><h2>Achievement Center</h2></div>
          <div className="achievement-grid">
            {achievements.map((achievement) => (
              <article className={`achievement ${achievement.done ? "done" : ""}`} key={achievement.label}>
                <div><achievement.icon size={28} /></div>
                <strong>{achievement.label}</strong>
                <span>{achievement.done ? "Achieved" : `${achievement.progress}%`}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="analytics-panel long-term-panel">
        <div className="panel-head">
          <div>
            <h2>Long-Term Analytics</h2>
            <p>Historical progress, growth, consistency, and time distribution</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={analytics.monthly}>
            <defs>
              <linearGradient id="monthArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#ffd85a" stopOpacity={0.58} />
                <stop offset="95%" stopColor="#ffd85a" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#bfb6a1", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#bfb6a1", fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="hours" stroke="#ffd85a" fill="url(#monthArea)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
        <blockquote>{summary.quote}</blockquote>
      </section>
    </main>
  );
}

function Insight({ icon, title, detail }) {
  return (
    <article className="insight-item">
      <div>{icon}</div>
      <p><strong>{title}</strong><span>{detail}</span></p>
    </article>
  );
}

function getAchievements(summary, analytics, entries) {
  const checks = [
    { label: "First Session", target: 1, value: entries.length, icon: CheckCircle2 },
    { label: "10 Hours", target: 10, value: summary.total_hours, icon: Award },
    { label: "50 Hours", target: 50, value: summary.total_hours, icon: Award },
    { label: "100 Hours", target: 100, value: summary.total_hours, icon: Award },
    { label: "500 Hours", target: 500, value: summary.total_hours, icon: Target },
    { label: "1000 Hours", target: 1000, value: summary.total_hours, icon: Target },
    { label: "7 Day Streak", target: 7, value: analytics.currentStreak, icon: Flame },
    { label: "30 Day Streak", target: 30, value: analytics.currentStreak, icon: Flame },
    { label: "Consistency Master", target: 14, value: analytics.longestStreak, icon: Sparkles },
  ];
  return checks.map((item) => ({ ...item, done: item.value >= item.target, progress: Math.min(Math.round((item.value / item.target) * 100), 100) }));
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(initialSummary);
  const [entries, setEntries] = useState([]);
  const [notice, setNotice] = useState("");
  const path = usePath();

  const analytics = useMemo(() => getAnalytics(summary, entries), [summary, entries]);

  async function loadAppData() {
    const [summaryData, entryData] = await Promise.all([api.summary(), api.entries()]);
    setSummary(summaryData);
    setEntries(entryData);
  }

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(async (currentUser) => {
        setUser(currentUser);
        await loadAppData();
        if (window.location.pathname === "/login" || window.location.pathname === "/register") {
          navigateTo("/");
        }
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  function handleAuth(authenticatedUser) {
    setUser(authenticatedUser);
    loadAppData().catch((err) => setNotice(err.message));
    navigateTo("/");
  }

  function logout() {
    clearSession();
    setUser(null);
    setSummary(initialSummary);
    setEntries([]);
    navigateTo("/login");
  }

  if (loading) {
    return <div className="loading">Polishing time...</div>;
  }

  if (!user) {
    return path === "/register" ? <RegisterPage onAuth={handleAuth} /> : <LoginPage onAuth={handleAuth} />;
  }

  if (path === "/reports") {
    return <ReportsPage summary={summary} entries={entries} analytics={analytics} onLogout={logout} />;
  }

  return (
    <DashboardPage
      user={user}
      summary={summary}
      entries={entries}
      analytics={analytics}
      reload={loadAppData}
      onLogout={logout}
      notice={notice}
      setNotice={setNotice}
    />
  );
}
