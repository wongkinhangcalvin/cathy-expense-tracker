import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "expense-tracker-v6-final";
const LEGACY_KEYS = ["expense-tracker-v6-full", "expense-tracker-v6"];

const DEFAULT_CATEGORIES = [
  "Transportation", "Food", "Family", "Entertainment",
  "SS Household & Utilities", "CSW Household & Utilities",
  "Financial", "Personal", "Shopping", "Travel", "Other",
];

const TEXT = {
  en: {
    appTitle: "Expense Tracker", dashboard: "Dashboard", expenses: "Expenses", budget: "Budget", settings: "Settings",
    totalSpending: "Total spending", monthSpending: "This month", yearSpending: "This year", budgetLeft: "Monthly budget left", overBudget: "Over budget",
    categorySummary: "Spending by category", noCategoryData: "No category spending for this month.", selectedMonth: "Selected month",
    addExpense: "Add expense", updateExpense: "Update expense", cancel: "Cancel", date: "Date", category: "Category", description: "Description", amountHkd: "Amount (HKD)", requiredMessage: "Please enter a description and an amount greater than zero.",
    history: "Expense history", search: "Search expenses", edit: "Edit", delete: "Delete", noExpenses: "No expenses yet.", noMatches: "No matching expenses.", records: "records", confirmDelete: "Delete this expense?",
    monthlyBudget: "Monthly budget", saveBudget: "Budget values save automatically.", categories: "Categories", categoryHelp: "Add, rename, and remove categories.", newCategory: "New category", addCategory: "Add category", rename: "Rename", remove: "Remove", renameCategory: "Rename category", categoryExists: "That category already exists.", categoryRequired: "Please enter a category name.", categoryInUse: "Expenses using this category will be moved to another category. Continue?", lastCategory: "At least one category must remain.",
    language: "Language", appearance: "Appearance", lightMode: "Light", darkMode: "Dark", dataBackup: "Data backup", backupHelp: "Export a JSON backup before testing on another device. Importing replaces the current data in this browser.", exportBackup: "Export backup", importBackup: "Import backup", exportSuccess: "Backup downloaded.", importSuccess: "Backup imported successfully.", importError: "The selected file is not a valid Expense Tracker backup.", browserStorage: "Your information is stored in this browser. It is not yet synchronized with OneDrive.", clearData: "Clear all expenses", clearConfirm: "Delete all expenses from this browser? This cannot be undone."
  },
  zh: {
    appTitle: "個人開支追蹤", dashboard: "總覽", expenses: "開支", budget: "預算", settings: "設定",
    totalSpending: "總開支", monthSpending: "本月開支", yearSpending: "本年開支", budgetLeft: "每月預算餘額", overBudget: "超出預算",
    categorySummary: "按類別劃分開支", noCategoryData: "本月沒有類別開支。", selectedMonth: "所選月份",
    addExpense: "新增開支", updateExpense: "更新開支", cancel: "取消", date: "日期", category: "類別", description: "描述", amountHkd: "金額（港元）", requiredMessage: "請輸入描述及大於零的金額。",
    history: "開支記錄", search: "搜尋開支", edit: "編輯", delete: "刪除", noExpenses: "暫時沒有開支。", noMatches: "沒有符合的開支。", records: "筆記錄", confirmDelete: "確定刪除此開支？",
    monthlyBudget: "每月預算", saveBudget: "預算數值會自動儲存。", categories: "類別", categoryHelp: "新增、重新命名或移除類別。", newCategory: "新類別", addCategory: "新增類別", rename: "重新命名", remove: "移除", renameCategory: "重新命名類別", categoryExists: "此類別已存在。", categoryRequired: "請輸入類別名稱。", categoryInUse: "使用此類別的開支會移至另一類別。是否繼續？", lastCategory: "必須保留至少一個類別。",
    language: "語言", appearance: "外觀", lightMode: "淺色", darkMode: "深色", dataBackup: "資料備份", backupHelp: "在另一部裝置測試前，請匯出 JSON 備份。匯入會取代此瀏覽器目前的資料。", exportBackup: "匯出備份", importBackup: "匯入備份", exportSuccess: "備份已下載。", importSuccess: "備份已成功匯入。", importError: "所選檔案不是有效的開支追蹤備份。", browserStorage: "資料目前儲存在此瀏覽器，尚未與 OneDrive 同步。", clearData: "清除所有開支", clearConfirm: "確定刪除此瀏覽器內的所有開支？此操作無法復原。"
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = value => new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD", maximumFractionDigits: 2 }).format(Number(value || 0));

function formatDate(value, lang) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-HK" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}

function normalizeExpense(expense) {
  return { id: expense.id ?? Date.now() + Math.random(), date: expense.date || today(), category: expense.category || "Other", description: expense.description || "", amount: Number(expense.amount || 0) };
}

function defaultData() {
  return { version: 1, expenses: [], categories: DEFAULT_CATEGORIES, monthlyBudget: 12000, language: "en", darkMode: false, selectedMonth: currentMonth() };
}

function loadData() {
  const defaults = defaultData();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { ...defaults, expenses: parsed.map(normalizeExpense) };
    return {
      ...defaults, ...parsed,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses.map(normalizeExpense) : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES,
    };
  } catch {
    return defaults;
  }
}

function SummaryCard({ card, muted, label, value, negative }) {
  return <div className={`${card} p-4`}><p className={`text-xs ${muted}`}>{label}</p><p className={`mt-1 break-words text-xl font-black ${negative ? "text-red-500" : ""}`}>{value}</p></div>;
}

export default function App() {
  const initial = useMemo(loadData, []);
  const importRef = useRef(null);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [categories, setCategories] = useState(initial.categories);
  const [monthlyBudget, setMonthlyBudget] = useState(Number(initial.monthlyBudget || 12000));
  const [language, setLanguage] = useState(initial.language === "zh" ? "zh" : "en");
  const [darkMode, setDarkMode] = useState(Boolean(initial.darkMode));
  const [selectedMonth, setSelectedMonth] = useState(initial.selectedMonth || currentMonth());
  const [tab, setTab] = useState("dashboard");
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState(initial.categories[0] || "Other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const t = TEXT[language];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, expenses, categories, monthlyBudget, language, darkMode, selectedMonth }));
  }, [expenses, categories, monthlyBudget, language, darkMode, selectedMonth]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0] || "Other");
  }, [categories, category]);

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(selectedMonth)), [expenses, selectedMonth]);
  const monthTotal = useMemo(() => monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [monthExpenses]);
  const year = selectedMonth.slice(0, 4);
  const yearTotal = useMemo(() => expenses.filter(e => e.date.startsWith(year)).reduce((s, e) => s + Number(e.amount || 0), 0), [expenses, year]);
  const budgetLeft = monthlyBudget - monthTotal;
  const categorySummary = useMemo(() => {
    const totals = {};
    monthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...expenses].filter(e => !q || [e.description, e.category, e.date, e.amount].join(" ").toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  }, [expenses, search]);

  function resetForm() {
    setEditingId(null); setDate(today()); setCategory(categories[0] || "Other"); setDescription(""); setAmount(""); setFormError("");
  }

  function saveExpense(event) {
    event.preventDefault();
    const clean = description.trim();
    const numeric = Number(amount);
    if (!date || !clean || !Number.isFinite(numeric) || numeric <= 0) return setFormError(t.requiredMessage);
    const record = { id: editingId || Date.now(), date, category, description: clean, amount: numeric };
    setExpenses(current => editingId ? current.map(e => e.id === editingId ? record : e) : [record, ...current]);
    setSelectedMonth(date.slice(0, 7)); resetForm(); setTab("expenses");
  }

  function editExpense(expense) {
    setEditingId(expense.id); setDate(expense.date); setCategory(expense.category); setDescription(expense.description); setAmount(String(expense.amount)); setFormError(""); setTab("expenses"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteExpense(id) {
    if (!window.confirm(t.confirmDelete)) return;
    setExpenses(current => current.filter(e => e.id !== id));
    if (editingId === id) resetForm();
  }

  function addCategory(event) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return setCategoryError(t.categoryRequired);
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) return setCategoryError(t.categoryExists);
    setCategories(current => [...current, name]); setNewCategory(""); setCategoryError("");
  }

  function renameCategory(oldName) {
    const nextName = window.prompt(t.renameCategory, oldName)?.trim();
    if (!nextName || nextName === oldName) return;
    if (categories.some(c => c.toLowerCase() === nextName.toLowerCase())) return window.alert(t.categoryExists);
    setCategories(current => current.map(c => c === oldName ? nextName : c));
    setExpenses(current => current.map(e => e.category === oldName ? { ...e, category: nextName } : e));
    if (category === oldName) setCategory(nextName);
  }

  function removeCategory(name) {
    if (categories.length <= 1) return window.alert(t.lastCategory);
    const inUse = expenses.some(e => e.category === name);
    if (inUse && !window.confirm(t.categoryInUse)) return;
    const remaining = categories.filter(c => c !== name);
    const fallback = remaining.includes("Other") ? "Other" : remaining[0];
    setCategories(remaining);
    setExpenses(current => current.map(e => e.category === name ? { ...e, category: fallback } : e));
    if (category === name) setCategory(fallback);
  }

  function exportBackup() {
    const backup = { app: "Expense Tracker V6 Final", exportedAt: new Date().toISOString(), version: 1, data: { expenses, categories, monthlyBudget, language, darkMode, selectedMonth } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `expense-tracker-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setBackupMessage(t.exportSuccess);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed.data || parsed;
      if (!Array.isArray(data.expenses) || !Array.isArray(data.categories)) throw new Error();
      const importedCategories = data.categories.filter(v => typeof v === "string" && v.trim());
      if (!importedCategories.length) throw new Error();
      setExpenses(data.expenses.map(normalizeExpense)); setCategories(importedCategories); setMonthlyBudget(Number(data.monthlyBudget || 12000)); setLanguage(data.language === "zh" ? "zh" : "en"); setDarkMode(Boolean(data.darkMode)); setSelectedMonth(data.selectedMonth || currentMonth()); resetForm(); setBackupMessage((data.language === "zh" ? TEXT.zh : TEXT.en).importSuccess);
    } catch {
      setBackupMessage(t.importError);
    } finally {
      event.target.value = "";
    }
  }

  function clearAll() {
    if (window.confirm(t.clearConfirm)) { setExpenses([]); resetForm(); }
  }

  const page = darkMode ? "min-h-screen bg-slate-950 text-slate-100" : "min-h-screen bg-slate-100 text-slate-900";
  const card = darkMode ? "rounded-2xl border border-slate-700 bg-slate-900" : "rounded-2xl border border-slate-200 bg-white";
  const input = darkMode ? "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" : "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";
  const nav = [{ id: "dashboard", label: t.dashboard, icon: "▦" }, { id: "expenses", label: t.expenses, icon: "$" }, { id: "budget", label: t.budget, icon: "◷" }, { id: "settings", label: t.settings, icon: "⚙" }];

  return <div className={page}>
    <header className={`sticky top-0 z-30 border-b ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button type="button" onClick={() => setTab("dashboard")} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-xl font-black text-white">$</span><span className="font-bold">{t.appTitle}</span></button>
        <div className="flex gap-2"><button type="button" onClick={() => setLanguage(v => v === "en" ? "zh" : "en")} className={`rounded-xl px-3 py-2 text-sm ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>{language === "en" ? "中文" : "EN"}</button><button type="button" onClick={() => setDarkMode(v => !v)} className={`rounded-xl px-3 py-2 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>{darkMode ? "☀" : "☾"}</button></div>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className={`${card} mb-5 p-3 text-sm ${muted}`}>{t.browserStorage}</div>

      {tab === "dashboard" && <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-black">{t.dashboard}</h1><p className={`mt-1 text-sm ${muted}`}>{t.selectedMonth}</p></div><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${input} sm:w-auto`} /></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard card={card} muted={muted} label={t.totalSpending} value={money(total)} /><SummaryCard card={card} muted={muted} label={t.monthSpending} value={money(monthTotal)} /><SummaryCard card={card} muted={muted} label={t.yearSpending} value={money(yearTotal)} /><SummaryCard card={card} muted={muted} label={budgetLeft < 0 ? t.overBudget : t.budgetLeft} value={money(Math.abs(budgetLeft))} negative={budgetLeft < 0} /></div>
        <div className={`${card} p-5`}><h2 className="text-lg font-bold">{t.categorySummary}</h2><div className="mt-4 space-y-4">{categorySummary.map(entry => <div key={entry.name}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{entry.name}</span><strong>{money(entry.value)}</strong></div><div className={`h-2 overflow-hidden rounded-full ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}><div className="h-full rounded-full bg-blue-600" style={{ width: `${monthTotal ? entry.value / monthTotal * 100 : 0}%` }} /></div></div>)}{!categorySummary.length && <p className={`py-8 text-center ${muted}`}>{t.noCategoryData}</p>}</div></div>
      </section>}

      {tab === "expenses" && <section className="space-y-5">
        <h1 className="text-3xl font-black">{t.expenses}</h1>
        <form onSubmit={saveExpense} className={`${card} space-y-3 p-4`}>
          <label className="block space-y-1"><span className="text-sm font-semibold">{t.date}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">{t.category}</span><select value={category} onChange={e => setCategory(e.target.value)} className={input}>{categories.map(name => <option key={name}>{name}</option>)}</select></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">{t.description}</span><input value={description} onChange={e => { setDescription(e.target.value); setFormError(""); }} className={input} /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">{t.amountHkd}</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setFormError(""); }} className={input} /></label>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-xl bg-blue-600 p-3 font-semibold text-white">{editingId ? t.updateExpense : t.addExpense}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-xl bg-slate-500 px-4 text-white">{t.cancel}</button>}</div>
        </form>
        <div><div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-bold">{t.history}</h2><p className={`text-sm ${muted}`}>{expenses.length} {t.records}</p></div></div><input type="search" value={search} onChange={e => setSearch(e.target.value)} className={`${input} mb-4`} placeholder={t.search} /><div className="space-y-3">{filtered.map(expense => <article key={expense.id} className={`${card} p-4`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-bold">{expense.description}</h3><p className="text-sm font-semibold text-blue-600">{expense.category}</p><p className={`text-sm ${muted}`}>{formatDate(expense.date, language)}</p><p className="mt-1 font-bold">{money(expense.amount)}</p></div><div className="flex flex-col gap-2"><button type="button" onClick={() => editExpense(expense)} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white">{t.edit}</button><button type="button" onClick={() => deleteExpense(expense.id)} className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white">{t.delete}</button></div></div></article>)}{!expenses.length && <div className={`${card} p-8 text-center ${muted}`}>{t.noExpenses}</div>}{expenses.length > 0 && !filtered.length && <div className={`${card} p-8 text-center ${muted}`}>{t.noMatches}</div>}</div></div>
      </section>}

      {tab === "budget" && <section className="space-y-5"><h1 className="text-3xl font-black">{t.budget}</h1><div className={`${card} p-5`}><label className="block space-y-2"><span className="font-semibold">{t.monthlyBudget}</span><input type="number" min="0" step="100" value={monthlyBudget} onChange={e => setMonthlyBudget(Math.max(0, Number(e.target.value)))} className={input} /></label><p className={`mt-2 text-sm ${muted}`}>{t.saveBudget}</p><div className="mt-6 grid grid-cols-2 gap-3"><SummaryCard card={card} muted={muted} label={t.monthSpending} value={money(monthTotal)} /><SummaryCard card={card} muted={muted} label={budgetLeft < 0 ? t.overBudget : t.budgetLeft} value={money(Math.abs(budgetLeft))} negative={budgetLeft < 0} /></div></div></section>}

      {tab === "settings" && <section className="space-y-5"><h1 className="text-3xl font-black">{t.settings}</h1>
        <div className={`${card} p-5`}><h2 className="text-lg font-bold">{t.categories}</h2><p className={`mt-1 text-sm ${muted}`}>{t.categoryHelp}</p><form onSubmit={addCategory} className="mt-4 flex gap-2"><input value={newCategory} onChange={e => { setNewCategory(e.target.value); setCategoryError(""); }} className={input} placeholder={t.newCategory} /><button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-4 font-semibold text-white">{t.addCategory}</button></form>{categoryError && <p className="mt-2 text-sm text-red-500">{categoryError}</p>}<div className="mt-4 space-y-2">{categories.map(name => <div key={name} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${darkMode ? "border-slate-700" : "border-slate-200"}`}><span className="min-w-0 truncate">{name}</span><div className="flex gap-1"><button type="button" onClick={() => renameCategory(name)} className={`rounded-lg px-3 py-2 text-sm ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>{t.rename}</button><button type="button" onClick={() => removeCategory(name)} className="rounded-lg px-3 py-2 text-sm text-red-500">{t.remove}</button></div></div>)}</div></div>
        <div className={`${card} p-5`}><h2 className="text-lg font-bold">{t.language}</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setLanguage("en")} className={`rounded-xl p-3 ${language === "en" ? "bg-blue-600 font-semibold text-white" : darkMode ? "bg-slate-800" : "bg-slate-100"}`}>English</button><button type="button" onClick={() => setLanguage("zh")} className={`rounded-xl p-3 ${language === "zh" ? "bg-blue-600 font-semibold text-white" : darkMode ? "bg-slate-800" : "bg-slate-100"}`}>繁體中文</button></div></div>
        <div className={`${card} p-5`}><h2 className="text-lg font-bold">{t.appearance}</h2><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDarkMode(false)} className={`rounded-xl p-3 ${!darkMode ? "bg-blue-600 font-semibold text-white" : "bg-slate-800"}`}>☀ {t.lightMode}</button><button type="button" onClick={() => setDarkMode(true)} className={`rounded-xl p-3 ${darkMode ? "bg-blue-600 font-semibold text-white" : "bg-slate-100"}`}>☾ {t.darkMode}</button></div></div>
        <div className={`${card} p-5`}><h2 className="text-lg font-bold">{t.dataBackup}</h2><p className={`mt-1 text-sm ${muted}`}>{t.backupHelp}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={exportBackup} className="rounded-xl bg-blue-600 p-3 font-semibold text-white">{t.exportBackup}</button><button type="button" onClick={() => importRef.current?.click()} className="rounded-xl bg-emerald-600 p-3 font-semibold text-white">{t.importBackup}</button></div><input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={importBackup} />{backupMessage && <p className="mt-3 text-sm font-semibold text-blue-500">{backupMessage}</p>}</div>
        <div className={`${card} p-5`}><button type="button" onClick={clearAll} className="w-full rounded-xl border border-red-500 p-3 font-semibold text-red-500">{t.clearData}</button></div>
      </section>}
    </main>

    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t p-2 ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"}`}><div className="mx-auto grid max-w-xl grid-cols-4 gap-1">{nav.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={tab === item.id ? "flex min-w-0 flex-col items-center rounded-xl bg-blue-600 p-2 text-xs font-semibold text-white" : `flex min-w-0 flex-col items-center rounded-xl p-2 text-xs ${muted}`}><span className="text-lg">{item.icon}</span><span className="truncate">{item.label}</span></button>)}</div></nav>
  </div>;
}
