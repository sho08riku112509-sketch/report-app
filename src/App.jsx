import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "reportApp_settings";
const HISTORY_KEY = "reportApp_history";
const MAX_HISTORY = 50;

// ===== テーマ定義 =====
const darkStatus = {
  successBg: "#0f3a1a", successBorder: "#2d8a4e", successText: "#4ade80",
  errorBg: "#3a0f0f", errorBorder: "#8a2d2d", errorText: "#f87171",
  warnBg: "#3a1a0f", warnBorder: "#8a4e2d", warnText: "#fb923c",
  infoBg: "#1a1a0a", infoBorder: "#554400", infoText: "#ffcc00", infoSub: "#aaa",
};
const lightStatus = {
  successBg: "#e8f5e9", successBorder: "#66bb6a", successText: "#2e7d32",
  errorBg: "#fce4ec", errorBorder: "#ef5350", errorText: "#c62828",
  warnBg: "#fff3e0", warnBorder: "#ff9800", warnText: "#e65100",
  infoBg: "#fff8e1", infoBorder: "#ffc107", infoText: "#795548", infoSub: "#666",
};

const THEMES = {
  orangeDark: {
    id: "orangeDark", name: "オレンジ×ダーク",
    bg: "#0f0f0f", card: "#1a1a1a", cardBorder: "#2a2a2a",
    accent: "#ff6b00", accentGrad: "linear-gradient(135deg, #ff6b00, #ff9500)",
    text: "#f0f0f0", textSub: "#888", textMuted: "#555",
    input: "#111", inputBorder: "#333", headerBg: "#1a1a1a",
    codeBg: "#0d1117", codeText: "#c9d1d9",
    ...darkStatus,
  },
  whiteOrange: {
    id: "whiteOrange", name: "ホワイト×オレンジ",
    bg: "#f5f5f5", card: "#ffffff", cardBorder: "#e0e0e0",
    accent: "#ff6b00", accentGrad: "linear-gradient(135deg, #ff6b00, #ff9500)",
    text: "#333", textSub: "#777", textMuted: "#aaa",
    input: "#fff", inputBorder: "#d0d0d0", headerBg: "#fff",
    codeBg: "#f8f8f8", codeText: "#333",
    ...lightStatus,
  },
  blueDark: {
    id: "blueDark", name: "ブルー×ダーク",
    bg: "#0a0f1a", card: "#111827", cardBorder: "#1e3a5f",
    accent: "#3b82f6", accentGrad: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    text: "#f0f0f0", textSub: "#888", textMuted: "#555",
    input: "#0f172a", inputBorder: "#1e3a5f", headerBg: "#111827",
    codeBg: "#0d1117", codeText: "#c9d1d9",
    ...darkStatus,
  },
  greenDark: {
    id: "greenDark", name: "グリーン×ダーク",
    bg: "#0a1a0f", card: "#112718", cardBorder: "#1e5f3a",
    accent: "#22c55e", accentGrad: "linear-gradient(135deg, #22c55e, #4ade80)",
    text: "#f0f0f0", textSub: "#888", textMuted: "#555",
    input: "#0a1f10", inputBorder: "#1e5f3a", headerBg: "#112718",
    codeBg: "#0d1117", codeText: "#c9d1d9",
    ...darkStatus,
  },
  whiteBlue: {
    id: "whiteBlue", name: "ホワイト×ブルー",
    bg: "#f0f4f8", card: "#ffffff", cardBorder: "#d0dce8",
    accent: "#3b82f6", accentGrad: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    text: "#333", textSub: "#777", textMuted: "#aaa",
    input: "#fff", inputBorder: "#c0cfe0", headerBg: "#fff",
    codeBg: "#f8f8f8", codeText: "#333",
    ...lightStatus,
  },
};

const defaultSettings = {
  name: "",
  gasUrl: "",
  centerName: "",
  sheetTab: "",
  staff: [],
  theme: "orangeDark",
  myPercent: "",
};

const addItems = [
  { key: "naiki", label: "内機", hasCount: true },
  { key: "gaiki", label: "外機", hasCount: true },
  { key: "robo", label: "ロボ", hasCount: true },
  { key: "rf", label: "RF", hasCount: true },
  { key: "mizu", label: "水回り", hasCount: true },
  { key: "sonota", label: "その他", hasCount: false, hasDetail: true },
  { key: "ince", label: "インセ", hasCount: true },
];

// ⑫ 標準単価ルール（1マン時のみチェック）
const PRICE_RULES = {
  naiki: { type: "multi", prices: [6000, 6300], tolerance: 0.2 },
  gaiki: { type: "multi", prices: [1500, 2750], tolerance: 0.2 },
  robo: { type: "fixed", price: 3000, tolerance: 0.2 },
  rf: { type: "fixed", price: 10400, tolerance: 0.2 },
  mizu: { type: "range", min: 5500, max: 11000 },
  ince: { type: "range", min: 500, max: 1000 },
};

const defaultForm = {
  date: (() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  })(),
  origin: "",
  count: "",
  originAmount: "",
  additions: Object.fromEntries(
    addItems.map((i) => [i.key, { count: "", amount: "", enabled: false, ...(i.hasDetail ? { detail: "" } : {}) }])
  ),
  kokinCount: "",
  kokinAmount: "",
  manCount: 1,
  partnerNames: [],
  traineeMode: false,
  traineeName: "",
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;opacity:0;top:0;left:0;font-size:16px;";
    document.body.appendChild(el);
    el.focus();
    const isIOS = /ipad|iphone/i.test(navigator.userAgent);
    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      el.setSelectionRange(0, 999999);
    } else {
      el.select();
    }
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(el);
    return true;
  }
}

function formatNum(n) {
  const num = parseInt(String(n).replace(/,/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

function numDisplay(n) {
  const num = formatNum(n);
  return num === 0 ? "" : num.toLocaleString("ja-JP");
}

export default function App() {
  const [tab, setTab] = useState("form");
  const [settings, setSettings] = useState(defaultSettings);
  const [form, setForm] = useState(defaultForm);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [isAbsence, setIsAbsence] = useState(false);
  const [partnerInputModes, setPartnerInputModes] = useState([]);

  const t = THEMES[settings.theme] || THEMES.orangeDark;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = { ...defaultSettings, ...JSON.parse(saved) };
      if (parsed.staff) {
        parsed.staff = parsed.staff.map(s => ({ percent: "", ...s }));
      }
      setSettings(parsed);
      if (parsed.centerName) setForm(f => ({ ...f, origin: parsed.centerName }));
    } catch {}
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  const saveSettings = (s) => {
    setSettings(s);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  };

  const calcTotal = useCallback(() => {
    let total = formatNum(form.originAmount);
    addItems.forEach((item) => {
      const a = form.additions[item.key];
      if (a.enabled) total += formatNum(a.amount);
    });
    return total;
  }, [form]);

  const total = calcTotal();

  // 日当計算
  const myDailyPay = settings.myPercent ? Math.round(total * parseFloat(settings.myPercent) / 100) : 0;
  const traineeDailyPay = (() => {
    if (form.manCount < 2 || form.traineeMode) return 0;
    const name = form.partnerNames[0];
    if (!name) return 0;
    const staff = settings.staff.find(s => s.name === name);
    if (!staff?.percent) return 0;
    return Math.round(total * parseFloat(staff.percent) / 100 * 0.25);
  })();

  const generateText = useCallback(() => {
    const lines = [];
    lines.push(settings.name);
    lines.push(form.date);

    if (form.traineeMode) {
      if (form.traineeName) lines.push(`${form.traineeName}さん研修同行です。`);
      if (form.manCount >= 2) {
        const names = form.partnerNames.filter(n => n.trim()).join("・");
        if (names) {
          lines.push(`${names}と${form.manCount}マンです`);
        } else {
          lines.push(`${form.manCount}マンです`);
        }
      } else {
        lines.push("1マンです");
      }
      lines.push("お疲れ様でした");
      return lines.join("\n");
    }

    if (form.origin && form.count && form.originAmount) {
      lines.push(`${form.origin}から${form.count}件${formatNum(form.originAmount).toLocaleString()}円`);
    }

    const addLines = [];
    addItems.forEach((item) => {
      const a = form.additions[item.key];
      if (a.enabled && formatNum(a.amount) > 0) {
        if (item.hasCount && a.count) {
          addLines.push(`${item.label}${a.count}台 ${formatNum(a.amount).toLocaleString()}円`);
        } else if (item.hasDetail && a.detail) {
          addLines.push(`${item.label}(${a.detail}) ${formatNum(a.amount).toLocaleString()}円`);
        } else {
          addLines.push(`${item.label} ${formatNum(a.amount).toLocaleString()}円`);
        }
      }
    });

    if (addLines.length > 0) {
      lines.push("追加");
      addLines.forEach((l) => lines.push(l));
    } else {
      lines.push("追加なし");
    }

    lines.push("");
    lines.push(`合計${total.toLocaleString()}円`);

    if (form.manCount >= 2) {
      const names = form.partnerNames.filter(n => n.trim()).join("・");
      if (names) {
        lines.push(`${names}と${form.manCount}マンです`);
      } else {
        lines.push(`${form.manCount}マンです`);
      }
    } else {
      lines.push("1マンです");
    }
    lines.push("お疲れ様でした");

    return lines.join("\n");
  }, [form, settings, total]);

  const validate = () => {
    const errs = [];
    if (form.traineeMode) {
      if (!form.traineeName.trim()) errs.push("研修同行者の名前を入力してください");
      return errs;
    }
    if (!settings.sheetTab.trim()) errs.push("設定画面でシート名（例：【濱口】）を入力してください");
    if (!form.origin.trim()) errs.push("センターを入力してください");
    if (!form.count) errs.push("件数を入力してください");
    if (!form.originAmount) errs.push("金額を入力してください");
    addItems.forEach((item) => {
      if (!item.hasCount) return;
      const a = form.additions[item.key];
      if (a.enabled && formatNum(a.amount) > 0 && a.count === "") {
        errs.push(`${item.label}の台数を入力してください（0も可）`);
      }
    });
    return errs;
  };

  // ⑫ 単価チェック（1マン時のみ）
  const checkPrices = () => {
    if (form.manCount !== 1 || form.traineeMode) return [];
    const warnings = [];
    addItems.forEach((item) => {
      const rule = PRICE_RULES[item.key];
      if (!rule) return;
      const a = form.additions[item.key];
      if (!a?.enabled) return;
      const count = parseInt(a.count) || 0;
      const amount = formatNum(a.amount);
      if (count === 0 || amount === 0) return;

      if (rule.type === "multi") {
        const ok = rule.prices.some(p => {
          const expected = count * p;
          return expected > 0 && Math.abs(amount - expected) / expected <= rule.tolerance;
        });
        if (!ok) {
          const opts = rule.prices.map(p => `${(count * p).toLocaleString()}円`).join(" or ");
          warnings.push(`${item.label}${count}台の金額が標準（${opts}）と大きくズレています。確認してください。`);
        }
      } else if (rule.type === "fixed") {
        const expected = count * rule.price;
        if (expected > 0 && Math.abs(amount - expected) / expected > rule.tolerance) {
          warnings.push(`${item.label}${count}台の金額が標準（${expected.toLocaleString()}円）と大きくズレています。確認してください。`);
        }
      } else if (rule.type === "range") {
        const perUnit = amount / count;
        if (perUnit < rule.min || perUnit > rule.max) {
          warnings.push(`${item.label}の1台あたり金額（${Math.round(perUnit).toLocaleString()}円）が標準範囲（${rule.min.toLocaleString()}〜${rule.max.toLocaleString()}円）外です。確認してください。`);
        }
      }
    });
    return warnings;
  };

  const saveHistory = (reportText) => {
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: form.date,
      origin: form.traineeMode ? "研修" : form.origin,
      count: form.count,
      total,
      manCount: form.manCount,
      partnerNames: form.partnerNames,
      reportText,
      formSnapshot: JSON.parse(JSON.stringify(form)),
    };
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
  };

  const deleteHistory = (id) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
    if (selectedHistory?.id === id) setSelectedHistory(null);
  };

  const restoreFromHistory = (entry) => {
    const snap = { ...entry.formSnapshot };
    if (snap.manType !== undefined && snap.manCount === undefined) {
      snap.manCount = parseInt(snap.manType) || 1;
      snap.partnerNames = snap.partnerName ? [snap.partnerName] : [];
      delete snap.manType;
      delete snap.partnerName;
    }
    setForm(snap);
    setPartnerInputModes(Array(Math.max(0, (snap.manCount || 1) - 1)).fill("select"));
    setSelectedHistory(null);
    setTab("form");
  };

  const handleCopy = async () => {
    const text = isAbsence
      ? `${settings.name}\n本日${form.date}休みです`
      : generateText();
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ⑪ 送信前に確認画面を表示
  const handlePreSubmit = () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setTab("confirm");
  };

  // 実際の送信処理
  const handleActualSubmit = async () => {
    if (!settings.gasUrl) {
      setSendStatus("error_no_url");
      setTab("result");
      return;
    }
    setSending(true);
    setSendStatus(null);

    const payload = {
      timestamp: new Date().toISOString(),
      name: settings.name,
      sheetTab: settings.sheetTab,
      date: form.date,
      traineeMode: form.traineeMode,
      traineeName: form.traineeMode ? form.traineeName : "",
      origin: form.origin,
      count: formatNum(form.count),
      originAmount: formatNum(form.originAmount),
      naikiCount: form.additions.naiki.enabled ? formatNum(form.additions.naiki.count) : 0,
      naikiAmount: form.additions.naiki.enabled ? formatNum(form.additions.naiki.amount) : 0,
      gaikiCount: form.additions.gaiki.enabled ? formatNum(form.additions.gaiki.count) : 0,
      gaikiAmount: form.additions.gaiki.enabled ? formatNum(form.additions.gaiki.amount) : 0,
      roboCount: form.additions.robo.enabled ? formatNum(form.additions.robo.count) : 0,
      roboAmount: form.additions.robo.enabled ? formatNum(form.additions.robo.amount) : 0,
      rfCount: form.additions.rf.enabled ? formatNum(form.additions.rf.count) : 0,
      rfAmount: form.additions.rf.enabled ? formatNum(form.additions.rf.amount) : 0,
      mizuCount: form.additions.mizu.enabled ? formatNum(form.additions.mizu.count) : 0,
      mizuAmount: form.additions.mizu.enabled ? formatNum(form.additions.mizu.amount) : 0,
      kokinCount: formatNum(form.kokinCount),
      kokinAmount: formatNum(form.kokinAmount),
      sonotaAmount: form.additions.sonota.enabled ? formatNum(form.additions.sonota.amount) : 0,
      sonotaDetail: form.additions.sonota.enabled ? (form.additions.sonota.detail || "") : "",
      inceCount: form.additions.ince.enabled ? formatNum(form.additions.ince.count) : 0,
      inceAmount: form.additions.ince.enabled ? formatNum(form.additions.ince.amount) : 0,
      total,
      manCount: form.manCount,
      partnerNames: form.partnerNames.filter(n => n.trim()),
      myDailyPay,
      traineeDailyPay,
      reportText: generateText(),
    };

    try {
      const resp = await fetch(settings.gasUrl, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const text = await resp.text().catch(() => "");
      let result = {};
      try { result = JSON.parse(text); } catch {}
      if (result.status === "error") {
        setSendStatus("error_gas");
        setErrors([result.message || "GASでエラーが発生しました"]);
      } else {
        setSendStatus("ok");
        saveHistory(generateText());
      }
    } catch (e) {
      setSendStatus("ok");
      saveHistory(generateText());
    }
    setSending(false);
    setSubmitted(true);
    setTab("result");
  };

  const handleReset = () => {
    setForm({ ...defaultForm, origin: settings.centerName || "" });
    setSubmitted(false);
    setSendStatus(null);
    setIsAbsence(false);
    setPartnerInputModes([]);
    setTab("form");
  };

  const updateAddition = (key, field, value) => {
    setForm((f) => ({
      ...f,
      additions: {
        ...f.additions,
        [key]: { ...f.additions[key], [field]: value },
      },
    }));
  };

  const toggleAddition = (key) => {
    setForm((f) => ({
      ...f,
      additions: {
        ...f.additions,
        [key]: { ...f.additions[key], enabled: !f.additions[key].enabled },
      },
    }));
  };

  const setManCount = (n) => {
    setForm(f => {
      const names = [...f.partnerNames];
      while (names.length < n - 1) names.push("");
      while (names.length > n - 1) names.pop();
      return { ...f, manCount: n, partnerNames: names };
    });
    setPartnerInputModes(prev => {
      const modes = [...prev];
      while (modes.length < n - 1) modes.push("select");
      while (modes.length > n - 1) modes.pop();
      return modes;
    });
  };

  const updatePartnerName = (index, value) => {
    setForm(f => {
      const names = [...f.partnerNames];
      names[index] = value;
      return { ...f, partnerNames: names };
    });
  };

  // ⑩ select↔input切り替え
  const handlePartnerSelect = (i, value) => {
    if (value === "__manual__") {
      setPartnerInputModes(prev => {
        const modes = [...prev];
        modes[i] = "input";
        return modes;
      });
      updatePartnerName(i, "");
    } else {
      updatePartnerName(i, value);
    }
  };

  const switchPartnerToSelect = (i) => {
    setPartnerInputModes(prev => {
      const modes = [...prev];
      modes[i] = "select";
      return modes;
    });
    updatePartnerName(i, "");
  };

  const enabledStaff = settings.staff.filter((s) => s.enabled);

  const gasScript = `// Google Apps Script - チーム中山 日報転記スクリプト
// ★ 月が変わったらSPREADSHEET_IDだけ書き換えてデプロイし直す
// ★ スタッフ側のアプリURLは変わらないので何もしなくてOK
// ★ スプレッドシートIDはURLの /d/〇〇〇/edit の〇〇〇の部分

// ===== ここだけ毎月書き換える =====
var SHEET_ID = 'ここにスプレッドシートIDを貼り付ける';

// ===== 列マッピング設定 =====
var COL = {
  count:       5,   // E列: 件数
  baseAmount:  6,   // F列: 基本売上
  naikiCount:  12,  // L列: 内機 台数
  naikiAmount: 13,  // M列: 内機 金額
  gaikiCount:  14,  // N列: 外機 台数
  gaikiAmount: 15,  // O列: 外機 金額
  roboCount:   16,  // P列: ロボ 台数
  roboAmount:  17,  // Q列: ロボ 金額
  rfCount:     18,  // R列: RF 台数
  rfAmount:    19,  // S列: RF 金額
  mizuCount:   20,  // T列: 水回り 台数
  mizuAmount:  21,  // U列: 水回り 金額
  kokinCount:  22,  // V列: 抗菌 台数
  kokinAmount: 23,  // W列: 抗菌 金額
  sonotaAmount:25,  // Y列: その他 金額
  inceCount:   0,   // インセ台数（列なし）
  inceAmount:  26,  // Z列: インセ 金額
  // ※ AA列(27) = 追加合計（数式）→ 書き込み禁止！
  memo:        0,   // MEMO書き込みなし
  myDailyPay:  0,   // 自分日当（列番号を設定すれば書き込み）
  traineeDailyPay: 0, // 研修生日当（列番号を設定すれば書き込み）
};

function showHeaders() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ss.getSheets();
  var result = [];
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (name.indexOf('【') !== 0) return;
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(5, 1, 1, lastCol).getValues()[0];
    result.push('\\n=== ' + name + ' ===');
    headers.forEach(function(h, i) {
      if (h) result.push('  列' + (i+1) + ' (' + colLetter(i+1) + '): ' + h);
    });
  });
  Logger.log(result.join('\\n'));
  return result.join('\\n');
}

function colLetter(n) {
  var s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
  return s;
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var tabName = (d.sheetTab || '').trim();
    if (!tabName) {
      return res({ status: 'error', message: 'sheetTab が未設定です。' });
    }
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().trim() === tabName) { sheet = allSheets[i]; break; }
      }
    }
    if (!sheet) {
      return res({ status: 'error', message: 'シート「' + tabName + '」が見つかりません。' });
    }
    var dayMatch = d.date.match(/(\\d+)日/);
    if (!dayMatch) {
      return res({ status: 'error', message: '日付の形式が不正です: ' + d.date });
    }
    var day = parseInt(dayMatch[1]);
    var row = 5 + day;
    var originalHeight = sheet.getRowHeight(row);

    var kokinAmt = d.kokinAmount || 0;
    var sonotaAmt = d.sonotaAmount || 0;
    if (kokinAmt > 0 && sonotaAmt >= kokinAmt) {
      sonotaAmt = sonotaAmt - kokinAmt;
    }

    if (COL.count > 0) sheet.getRange(row, COL.count).setValue(d.count);
    if (COL.baseAmount > 0) sheet.getRange(row, COL.baseAmount).setValue(d.originAmount);

    var writeIfNonZero = function(col, val) {
      if (col > 0 && val !== undefined && val !== 0 && val !== '') {
        sheet.getRange(row, col).setValue(val);
      }
    };

    writeIfNonZero(COL.naikiCount, d.naikiCount);
    writeIfNonZero(COL.naikiAmount, d.naikiAmount);
    writeIfNonZero(COL.gaikiCount, d.gaikiCount);
    writeIfNonZero(COL.gaikiAmount, d.gaikiAmount);
    writeIfNonZero(COL.roboCount, d.roboCount);
    writeIfNonZero(COL.roboAmount, d.roboAmount);
    writeIfNonZero(COL.rfCount, d.rfCount);
    writeIfNonZero(COL.rfAmount, d.rfAmount);
    writeIfNonZero(COL.mizuCount, d.mizuCount);
    writeIfNonZero(COL.mizuAmount, d.mizuAmount);
    writeIfNonZero(COL.kokinCount, d.kokinCount);
    writeIfNonZero(COL.kokinAmount, kokinAmt);
    writeIfNonZero(COL.sonotaAmount, sonotaAmt);
    writeIfNonZero(COL.inceAmount, d.inceAmount);
    writeIfNonZero(COL.myDailyPay, d.myDailyPay);
    writeIfNonZero(COL.traineeDailyPay, d.traineeDailyPay);

    sheet.setRowHeight(row, originalHeight);
    return res({ status: 'ok', message: tabName + ' の ' + day + '日に記録しました' });
  } catch(err) {
    return res({ status: 'error', message: err.toString() });
  }
}

function res(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  // 確認画面用：単価警告
  const priceWarnings = checkPrices();

  return (
    <div style={{
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{
        background: t.headerBg,
        borderBottom: `2px solid ${t.accent}`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, letterSpacing: 3, fontWeight: 700 }}>
            DAILY REPORT
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>日報送信アプリ</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <TabBtn label="入力" active={tab === "form" || tab === "confirm"} onClick={() => setTab("form")} t={t} />
          <TabBtn label="報告文" active={tab === "result"} onClick={() => setTab("result")} t={t} />
          <TabBtn label="履歴" active={tab === "history"} onClick={() => { setTab("history"); setSelectedHistory(null); }} t={t} />
          <TabBtn label="⚙" active={tab === "settings"} onClick={() => setTab("settings")} t={t} />
        </div>
      </div>

      <div style={{ padding: "20px 16px 100px" }}>

        {/* FORM TAB */}
        {tab === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {errors.length > 0 && (
              <div style={{
                background: t.errorBg,
                border: `1px solid ${t.errorBorder}`,
                borderRadius: 10,
                padding: "12px 16px",
                color: t.errorText,
                fontSize: 14,
              }}>
                {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}

            {/* 研修モード */}
            <div style={{
              background: t.card,
              borderRadius: 12,
              padding: "14px 16px",
              border: `1px solid ${form.traineeMode ? t.accent : t.cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: form.traineeMode ? t.accent : t.textSub }}>
                  研修モード
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                  ONにすると研修同行報告に切り替わります
                </div>
              </div>
              <Toggle
                active={form.traineeMode}
                onClick={() => setForm((f) => ({ ...f, traineeMode: !f.traineeMode, traineeName: "" }))}
                t={t}
              />
            </div>

            {/* 基本情報 */}
            <Section title="基本情報" t={t}>
              <Row label="名前" t={t}>
                <Input value={settings.name} onChange={(v) => saveSettings({ ...settings, name: v })} t={t} />
              </Row>
              <Row label="日付" t={t}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={form.date}
                      onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                      placeholder="例：3月29日"
                      t={t}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const d = new Date();
                      setForm((f) => ({ ...f, date: `${d.getMonth() + 1}月${d.getDate()}日` }));
                    }}
                    style={{
                      padding: "8px 12px",
                      background: t.card,
                      border: `1px solid ${t.accent}`,
                      borderRadius: 8,
                      color: t.accent,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    今日
                  </button>
                </div>
              </Row>
              {form.traineeMode && (
                <Row label={<>同行者<Req /></>} t={t}>
                  <Input
                    value={form.traineeName}
                    onChange={(v) => setForm((f) => ({ ...f, traineeName: v }))}
                    placeholder="例：米田有佑"
                    t={t}
                  />
                </Row>
              )}
            </Section>

            {/* エディオン */}
            {!form.traineeMode && (
              <Section title="エディオン" t={t}>
                <Row label={<>センター<Req /></>} t={t}>
                  <Input
                    value={form.origin}
                    onChange={(v) => setForm((f) => ({ ...f, origin: v }))}
                    placeholder="例：春日井"
                    t={t}
                  />
                </Row>
                <Row label={<>件数<Req /></>} t={t}>
                  <Input
                    value={form.count}
                    onChange={(v) => setForm((f) => ({ ...f, count: v }))}
                    type="number"
                    suffix="件"
                    t={t}
                  />
                </Row>
                <Row label={<>金額<Req /></>} t={t}>
                  <MoneyInput
                    value={form.originAmount}
                    onChange={(v) => setForm((f) => ({ ...f, originAmount: v }))}
                    t={t}
                  />
                </Row>
              </Section>
            )}

            {/* 追加 */}
            {!form.traineeMode && (
              <Section title="追加（該当するものをON）" t={t}>
                {addItems.map((item) => {
                  const a = form.additions[item.key];
                  return (
                    <div key={item.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: a.enabled ? 8 : 0 }}>
                        <Toggle active={a.enabled} onClick={() => toggleAddition(item.key)} t={t} />
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</span>
                      </div>
                      {a.enabled && (
                        <div style={{ paddingLeft: 46, display: "flex", flexDirection: "column", gap: 6 }}>
                          {item.hasCount && (
                            <Row label="台数" t={t}>
                              <Input value={a.count} onChange={(v) => updateAddition(item.key, "count", v)} type="number" suffix="台" t={t} />
                            </Row>
                          )}
                          {item.hasDetail && (
                            <Row label="詳細" t={t}>
                              <Input value={a.detail || ""} onChange={(v) => updateAddition(item.key, "detail", v)} placeholder="例：抗菌2台" t={t} />
                            </Row>
                          )}
                          <Row label="金額" t={t}>
                            <MoneyInput value={a.amount} onChange={(v) => updateAddition(item.key, "amount", v)} t={t} />
                          </Row>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}

            {/* 抗菌（スプレッド転記用） */}
            {!form.traineeMode && (
              <div style={{
                background: t.card,
                borderRadius: 12,
                padding: "16px",
                border: `1px solid ${t.cardBorder}`,
              }}>
                <div style={{ fontSize: 11, color: t.textSub, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                  抗菌（スプレッド転記用）
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
                  報告文には出ません。スプレッドシートの抗菌列に転記されます。
                </div>
                <Row label="台数" t={t}>
                  <Input value={form.kokinCount} onChange={(v) => setForm((f) => ({ ...f, kokinCount: v }))} type="number" suffix="台" t={t} />
                </Row>
                <Row label="金額" t={t}>
                  <MoneyInput value={form.kokinAmount} onChange={(v) => setForm((f) => ({ ...f, kokinAmount: v }))} t={t} />
                </Row>
              </div>
            )}

            {/* 合計 */}
            {!form.traineeMode && (
              <div style={{
                background: t.card,
                border: `2px solid ${t.accent}`,
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>合計</span>
                <span style={{ fontSize: 24, fontWeight: 900 }}>
                  {total > 0 ? `¥${total.toLocaleString()}` : "¥0"}
                </span>
              </div>
            )}

            {/* マン数 */}
            <Section title="作業形態" t={t}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    onClick={() => setManCount(m === 3 ? Math.max(3, form.manCount >= 3 ? form.manCount : 3) : m)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 8,
                      border: `2px solid ${(m < 3 ? form.manCount === m : form.manCount >= 3) ? t.accent : t.inputBorder}`,
                      background: (m < 3 ? form.manCount === m : form.manCount >= 3) ? `${t.accent}22` : t.card,
                      color: (m < 3 ? form.manCount === m : form.manCount >= 3) ? t.accent : t.textSub,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {m === 3 ? "3+マン" : `${m}マン`}
                  </button>
                ))}
              </div>
              {form.manCount >= 3 && (
                <Row label="人数" t={t}>
                  <Input
                    value={String(form.manCount)}
                    onChange={(v) => {
                      const n = parseInt(v) || 3;
                      setManCount(Math.max(3, n));
                    }}
                    type="number"
                    suffix="人"
                    t={t}
                  />
                </Row>
              )}
              {/* ⑩ 相手名：選択＋直接入力 */}
              {form.manCount >= 2 && form.partnerNames.map((name, i) => (
                <Row label={`相手${form.manCount > 2 ? (i + 1) : ""}`} key={i} t={t}>
                  {partnerInputModes[i] === "input" ? (
                    <div>
                      <Input
                        value={name}
                        onChange={(v) => updatePartnerName(i, v)}
                        placeholder="名前を入力"
                        t={t}
                      />
                      {enabledStaff.length > 0 && (
                        <button
                          onClick={() => switchPartnerToSelect(i)}
                          style={{
                            background: "transparent", border: "none",
                            color: t.accent, fontSize: 12, cursor: "pointer",
                            padding: "4px 0", marginTop: 4,
                          }}
                        >
                          ← 一覧から選ぶ
                        </button>
                      )}
                    </div>
                  ) : enabledStaff.length > 0 ? (
                    <select
                      value={name}
                      onChange={(e) => handlePartnerSelect(i, e.target.value)}
                      style={{
                        width: "100%",
                        background: t.input,
                        border: `1px solid ${t.inputBorder}`,
                        borderRadius: 8,
                        color: name ? t.text : t.textMuted,
                        padding: "8px 12px",
                        fontSize: 15,
                        outline: "none",
                      }}
                    >
                      <option value="">選択してください</option>
                      {enabledStaff.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="__manual__">直接入力</option>
                    </select>
                  ) : (
                    <Input
                      value={name}
                      onChange={(v) => updatePartnerName(i, v)}
                      placeholder="例：佐藤優光"
                      t={t}
                    />
                  )}
                </Row>
              ))}
            </Section>

            {/* ⑪ 送信ボタン → 確認画面へ */}
            <button
              onClick={handlePreSubmit}
              disabled={sending}
              style={{
                width: "100%",
                padding: "16px 0",
                background: sending ? t.textMuted : t.accentGrad,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 800,
                cursor: sending ? "not-allowed" : "pointer",
                letterSpacing: 2,
              }}
            >
              {sending ? "送信中..." : "内容を確認する"}
            </button>

            <AbsenceCopyBtn name={settings.name} date={form.date} onAbsence={() => { setIsAbsence(true); setTab("result"); }} t={t} />

            {/* ⑬ クリアボタン（目立たない場所） */}
            <div style={{ marginTop: 30, textAlign: "center" }}>
              <button
                onClick={() => {
                  if (window.confirm("入力内容をすべてクリアしますか？")) {
                    handleReset();
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: t.textMuted,
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "6px 12px",
                  opacity: 0.6,
                }}
              >
                入力をクリア
              </button>
            </div>
          </div>
        )}

        {/* ⑪ CONFIRM TAB - 送信確認画面 */}
        {tab === "confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, textAlign: "center", color: t.accent }}>
              送信内容の確認
            </div>

            {/* 基本情報 */}
            <div style={{ background: t.card, borderRadius: 12, padding: "16px", border: `1px solid ${t.cardBorder}` }}>
              <ConfirmRow label="名前" value={settings.name} t={t} />
              <ConfirmRow label="日付" value={form.date} t={t} />
              {form.traineeMode ? (
                <ConfirmRow label="研修同行" value={form.traineeName} t={t} />
              ) : (
                <>
                  <ConfirmRow label="センター" value={form.origin} t={t} />
                  <ConfirmRow label="件数" value={`${form.count}件`} t={t} />
                  <ConfirmRow label="基本金額" value={`¥${formatNum(form.originAmount).toLocaleString()}`} t={t} />
                </>
              )}
            </div>

            {/* 追加内訳 */}
            {!form.traineeMode && (
              <div style={{ background: t.card, borderRadius: 12, padding: "16px", border: `1px solid ${t.cardBorder}` }}>
                <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                  追加内訳
                </div>
                {addItems.filter(item => form.additions[item.key].enabled && formatNum(form.additions[item.key].amount) > 0).length === 0 ? (
                  <div style={{ fontSize: 14, color: t.textMuted }}>追加なし</div>
                ) : (
                  addItems.map((item) => {
                    const a = form.additions[item.key];
                    if (!a.enabled || formatNum(a.amount) === 0) return null;
                    return (
                      <ConfirmRow
                        key={item.key}
                        label={item.hasCount && a.count ? `${item.label} ${a.count}台` : item.hasDetail && a.detail ? `${item.label}(${a.detail})` : item.label}
                        value={`¥${formatNum(a.amount).toLocaleString()}`}
                        t={t}
                      />
                    );
                  })
                )}
                {formatNum(form.kokinCount) > 0 && (
                  <ConfirmRow label={`抗菌 ${form.kokinCount}台（転記用）`} value={`¥${formatNum(form.kokinAmount).toLocaleString()}`} t={t} />
                )}
              </div>
            )}

            {/* 合計 */}
            {!form.traineeMode && (
              <div style={{
                background: t.card,
                border: `2px solid ${t.accent}`,
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>合計</span>
                <span style={{ fontSize: 24, fontWeight: 900 }}>¥{total.toLocaleString()}</span>
              </div>
            )}

            {/* マン数 */}
            <div style={{ background: t.card, borderRadius: 12, padding: "16px", border: `1px solid ${t.cardBorder}` }}>
              <ConfirmRow
                label="作業形態"
                value={form.manCount >= 2
                  ? `${form.partnerNames.filter(n => n.trim()).join("・")}と${form.manCount}マン`
                  : "1マン"
                }
                t={t}
              />
            </div>

            {/* ⑫ 単価チェック警告（1マン時のみ） */}
            {priceWarnings.length > 0 && (
              <div style={{
                background: t.warnBg,
                border: `1px solid ${t.warnBorder}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.warnText, marginBottom: 6 }}>
                  ⚠ 金額チェック
                </div>
                {priceWarnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: t.warnText, lineHeight: 1.7 }}>{w}</div>
                ))}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              onClick={handleActualSubmit}
              disabled={sending}
              style={{
                width: "100%",
                padding: "16px 0",
                background: sending ? t.textMuted : t.accentGrad,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 800,
                cursor: sending ? "not-allowed" : "pointer",
                letterSpacing: 2,
              }}
            >
              {sending ? "送信中..." : "送信する"}
            </button>

            <button
              onClick={() => setTab("form")}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "transparent",
                color: t.textSub,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              戻って修正する
            </button>
          </div>
        )}

        {/* RESULT TAB */}
        {tab === "result" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isAbsence && sendStatus === "ok" && (
              <div style={{
                background: t.successBg, border: `1px solid ${t.successBorder}`,
                borderRadius: 10, padding: "12px 16px", color: t.successText, fontSize: 14, fontWeight: 600,
              }}>
                スプレッドシートに送信しました
              </div>
            )}
            {!isAbsence && sendStatus === "error_no_url" && (
              <div style={{
                background: t.warnBg, border: `1px solid ${t.warnBorder}`,
                borderRadius: 10, padding: "12px 16px", color: t.warnText, fontSize: 14,
              }}>
                GAS URLが未設定です。設定からURLを入力してください。
              </div>
            )}
            {!isAbsence && sendStatus === "error" && (
              <div style={{
                background: t.errorBg, border: `1px solid ${t.errorBorder}`,
                borderRadius: 10, padding: "12px 16px", color: t.errorText, fontSize: 14,
              }}>
                送信に失敗しました。URLを確認してください。
              </div>
            )}
            {!isAbsence && sendStatus === "error_gas" && (
              <div style={{
                background: t.errorBg, border: `1px solid ${t.errorBorder}`,
                borderRadius: 10, padding: "12px 16px", color: t.errorText, fontSize: 14,
              }}>
                GASエラー：{errors[0] || "不明なエラー"}
              </div>
            )}

            <div style={{ fontSize: 13, color: t.textSub, fontWeight: 600, letterSpacing: 1 }}>
              {isAbsence ? "休み報告文" : "生成された報告文"}
            </div>
            <div style={{
              background: t.card, border: `1px solid ${t.inputBorder}`,
              borderRadius: 12, padding: "18px 16px",
              whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 15,
            }}>
              {isAbsence ? `${settings.name}\n本日${form.date}休みです` : generateText()}
            </div>

            {/* 日当表示 */}
            {!isAbsence && !form.traineeMode && (myDailyPay > 0 || traineeDailyPay > 0) && (
              <div style={{
                background: t.card, border: `1px solid ${t.cardBorder}`,
                borderRadius: 12, padding: "16px",
              }}>
                <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                  日当計算
                </div>
                {myDailyPay > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: t.textSub }}>自分の日当</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: t.accent }}>¥{myDailyPay.toLocaleString()}</span>
                  </div>
                )}
                {traineeDailyPay > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: t.textSub }}>研修生の日当</span>
                    <span style={{ fontSize: 20, fontWeight: 900 }}>¥{traineeDailyPay.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCopy}
              style={{
                width: "100%", padding: "14px 0",
                background: copied ? t.successBg : t.card,
                color: copied ? t.successText : t.text,
                border: `2px solid ${copied ? t.successBorder : t.accent}`,
                borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {copied ? "コピーしました！" : "テキストをコピー"}
            </button>

            <button
              onClick={handleReset}
              style={{
                width: "100%", padding: "12px 0",
                background: "transparent", color: t.textSub,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              新しい日報を入力する
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedHistory ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => setSelectedHistory(null)}
                    style={{ background: "transparent", border: "none", color: t.accent, fontSize: 20, cursor: "pointer", padding: 0 }}
                  >
                    ←
                  </button>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {selectedHistory.date} - {selectedHistory.origin}
                  </div>
                </div>

                <div style={{
                  background: t.card, border: `1px solid ${t.inputBorder}`,
                  borderRadius: 12, padding: "18px 16px",
                  whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 15,
                }}>
                  {selectedHistory.reportText}
                </div>

                <HistoryCopyBtn text={selectedHistory.reportText} t={t} />

                <button
                  onClick={() => restoreFromHistory(selectedHistory)}
                  style={{
                    width: "100%", padding: "14px 0",
                    background: t.card, color: t.accent,
                    border: `2px solid ${t.accent}`,
                    borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  この内容で入力する
                </button>

                <button
                  onClick={() => deleteHistory(selectedHistory.id)}
                  style={{
                    width: "100%", padding: "12px 0",
                    background: "transparent", color: t.errorText,
                    border: `1px solid ${t.errorBorder}`,
                    borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  この履歴を削除
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: t.textSub, fontWeight: 600, letterSpacing: 1 }}>
                  送信履歴（最新{MAX_HISTORY}件）
                </div>
                {history.length === 0 ? (
                  <div style={{
                    background: t.card, borderRadius: 12, padding: "40px 20px",
                    textAlign: "center", color: t.textMuted, fontSize: 14,
                  }}>
                    まだ送信履歴がありません
                  </div>
                ) : (
                  history.map((h) => {
                    const manLabel = h.manCount >= 2
                      ? ` / ${(h.partnerNames || [h.partnerName]).filter(Boolean).join("・")}と${h.manCount || h.manType}マン`
                      : "";
                    return (
                      <div
                        key={h.id}
                        onClick={() => setSelectedHistory(h)}
                        style={{
                          background: t.card, border: `1px solid ${t.cardBorder}`,
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 700 }}>{h.date}</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color: t.accent }}>
                            ¥{(h.total || 0).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: t.textSub }}>
                          {h.origin}{h.count ? ` ${h.count}件` : ""}{manLabel}
                        </div>
                        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                          {new Date(h.timestamp).toLocaleString("ja-JP")}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <Section title="基本設定" t={t}>
              <Row label="自分の名前" t={t}>
                <Input value={settings.name} onChange={(v) => saveSettings({ ...settings, name: v })} placeholder="例：濱口翔太" t={t} />
              </Row>
              <Row label="センター名" t={t}>
                <Input value={settings.centerName} onChange={(v) => saveSettings({ ...settings, centerName: v })} placeholder="例：名古屋西" t={t} />
              </Row>
              <Row label="シート名" t={t}>
                <Input value={settings.sheetTab} onChange={(v) => saveSettings({ ...settings, sheetTab: v })} placeholder="例：【濱口】" t={t} />
              </Row>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: -4, lineHeight: 1.6 }}>
                スプレッドシートの自分のタブ名を入力してください。
              </div>
              <Row label="自分の割合" t={t}>
                <Input
                  value={settings.myPercent}
                  onChange={(v) => saveSettings({ ...settings, myPercent: v })}
                  placeholder="例：85"
                  type="number"
                  suffix="%"
                  t={t}
                />
              </Row>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: -4, lineHeight: 1.6 }}>
                日当計算に使用します（売上×割合%）。
              </div>
            </Section>

            <Section title="スタッフ管理" t={t}>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
                マン選択時のプルダウンに表示。割合は研修生日当の計算に使用（売上×割合%×25%）。
              </div>
              {settings.staff.length === 0 && (
                <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 10 }}>
                  スタッフが登録されていません
                </div>
              )}
              {settings.staff.map((s, i) => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 8, padding: "8px 12px",
                  background: t.input, borderRadius: 8, border: `1px solid ${t.cardBorder}`,
                }}>
                  <Toggle
                    active={s.enabled}
                    onClick={() => {
                      const updated = [...settings.staff];
                      updated[i] = { ...s, enabled: !s.enabled };
                      saveSettings({ ...settings, staff: updated });
                    }}
                    t={t}
                  />
                  <span style={{ flex: 1, fontSize: 15, color: s.enabled ? t.text : t.textMuted }}>{s.name}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.percent || ""}
                    onChange={(e) => {
                      const updated = [...settings.staff];
                      updated[i] = { ...s, percent: e.target.value };
                      saveSettings({ ...settings, staff: updated });
                    }}
                    placeholder="%"
                    style={{
                      width: 50, background: t.input, border: `1px solid ${t.inputBorder}`,
                      borderRadius: 6, color: t.text, padding: "4px 6px",
                      fontSize: 13, outline: "none", textAlign: "center",
                    }}
                  />
                  <span style={{ fontSize: 11, color: t.textMuted }}>%</span>
                  <button
                    onClick={() => saveSettings({ ...settings, staff: settings.staff.filter((_, j) => j !== i) })}
                    style={{
                      background: "transparent", border: "none",
                      color: t.errorBorder, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <AddStaffInput
                onAdd={(name) => {
                  if (!name.trim()) return;
                  saveSettings({
                    ...settings,
                    staff: [...settings.staff, { id: Date.now().toString(), name: name.trim(), enabled: true, percent: "" }],
                  });
                }}
                t={t}
              />
            </Section>

            <Section title="Google Apps Script URL" t={t}>
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 10, lineHeight: 1.7 }}>
                GASをデプロイして取得したURLを貼り付けてください。
                <br />
                <span
                  style={{ color: t.accent, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setTab("gas")}
                >
                  GASスクリプトの確認・コピーはこちら
                </span>
              </div>
              <textarea
                value={settings.gasUrl}
                onChange={(e) => saveSettings({ ...settings, gasUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/..."
                rows={3}
                style={{
                  width: "100%", background: t.input, border: `1px solid ${t.inputBorder}`,
                  borderRadius: 8, color: t.text, padding: "10px 12px",
                  fontSize: 13, resize: "none", boxSizing: "border-box", fontFamily: "monospace",
                }}
              />
            </Section>

            <div style={{
              background: t.infoBg, border: `1px solid ${t.infoBorder}`,
              borderRadius: 10, padding: "14px 16px", fontSize: 13, color: t.infoSub, lineHeight: 1.8,
            }}>
              <div style={{ color: t.infoText, fontWeight: 700, marginBottom: 6 }}>設定手順</div>
              <div>1. GASスクリプトをコピー</div>
              <div>2. スプレッドシートを開く</div>
              <div>3. 拡張機能 → Apps Script</div>
              <div>4. スクリプト貼り付けて保存</div>
              <div>5. デプロイ → 新しいデプロイ</div>
              <div>6. 種類：ウェブアプリ / アクセス：全員</div>
              <div>7. デプロイURLをここに貼る</div>
            </div>

            {/* テーマ選択 */}
            <Section title="テーマ" t={t}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.values(THEMES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => saveSettings({ ...settings, theme: theme.id })}
                    style={{
                      flex: "1 1 calc(50% - 4px)",
                      minWidth: 140,
                      padding: "12px 8px",
                      background: theme.bg,
                      border: `2px solid ${settings.theme === theme.id ? theme.accent : theme.cardBorder}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: theme.accent, fontWeight: 700, fontSize: 12 }}>{theme.name}</div>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: theme.accent }} />
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: theme.card, border: `1px solid ${theme.cardBorder}` }} />
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: theme.bg, border: `1px solid ${theme.cardBorder}` }} />
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* GAS SCRIPT TAB */}
        {tab === "gas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setTab("settings")}
                style={{ background: "transparent", border: "none", color: t.accent, fontSize: 20, cursor: "pointer", padding: 0 }}
              >
                ←
              </button>
              <div style={{ fontSize: 15, fontWeight: 700 }}>GASスクリプト</div>
            </div>

            <div style={{
              background: t.codeBg, border: `1px solid ${t.inputBorder}`,
              borderRadius: 12, padding: "16px",
              whiteSpace: "pre-wrap", fontSize: 12, fontFamily: "monospace",
              color: t.codeText, lineHeight: 1.6, overflowX: "auto",
            }}>
              {gasScript}
            </div>

            <GasCopyBtn script={gasScript} t={t} />

            <div style={{
              background: t.infoBg, border: `1px solid ${t.infoBorder}`,
              borderRadius: 10, padding: "14px 16px", fontSize: 13, color: t.infoSub, lineHeight: 1.8,
            }}>
              <div style={{ color: t.infoText, fontWeight: 700, marginBottom: 6 }}>セットアップ手順（初回）</div>
              <div>1. スクリプトを貼り付けて保存</div>
              <div>2. SHEET_IDにスプレッドシートIDを入力</div>
              <div>3. <b>showHeaders</b> を実行（▶ボタン）</div>
              <div>4. 「実行ログ」で列番号を確認</div>
              <div>5. COLの数値を実際の列番号に修正</div>
              <div>6. デプロイ → アクセス：全員</div>
              <div>7. URLをアプリの設定に貼る</div>
              <div style={{ marginTop: 6, color: t.infoText, fontWeight: 700 }}>月替わり作業（翔太さんだけ）</div>
              <div>1. GASのSHEET_IDを新しいIDに書き換え</div>
              <div>2. 「デプロイを管理」→ 編集 → 新バージョン → デプロイ</div>
              <div>※ スタッフ側は何もしなくてOK</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ⑪ 確認画面用の行コンポーネント
function ConfirmRow({ label, value, t }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: `1px solid ${t.cardBorder}`,
    }}>
      <span style={{ fontSize: 13, color: t.textSub }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function AddStaffInput({ onAdd, t }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="スタッフ名を入力"
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(name); setName(""); } }}
        style={{
          flex: 1, background: t.input, border: `1px solid ${t.inputBorder}`,
          borderRadius: 8, color: t.text, padding: "8px 12px", fontSize: 14, outline: "none",
        }}
      />
      <button
        onClick={() => { onAdd(name); setName(""); }}
        style={{
          padding: "8px 16px", background: t.accent, color: "#fff",
          border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}
      >
        追加
      </button>
    </div>
  );
}

function GasCopyBtn({ script, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await copyToClipboard(script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        width: "100%", padding: "14px 0",
        background: copied ? t.successBg : t.accentGrad,
        color: copied ? t.successText : "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}
    >
      {copied ? "コピーしました！" : "スクリプトをコピー"}
    </button>
  );
}

function Section({ title, children, t }) {
  return (
    <div style={{
      background: t.card, borderRadius: 12, padding: "16px", border: `1px solid ${t.cardBorder}`,
    }}>
      <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
        {typeof title === "string" ? title.toUpperCase() : title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 70, fontSize: 13, color: t.textSub, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", suffix, t }) {
  // Android対策: type="number"は使わず、常にtype="text" + inputMode="numeric"
  const isNum = type === "number";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text"
        inputMode={isNum ? "numeric" : undefined}
        pattern={isNum ? "[0-9]*" : undefined}
        value={value}
        onChange={(e) => {
          if (isNum) {
            // 数字のみ許可（全角→半角変換）
            const v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, "");
            onChange(v);
          } else {
            onChange(e.target.value);
          }
        }}
        placeholder={placeholder}
        style={{
          flex: 1, background: t.input, border: `1px solid ${t.inputBorder}`,
          borderRadius: 8, color: t.text, padding: "8px 12px", fontSize: 15, outline: "none", width: "100%",
        }}
      />
      {suffix && <span style={{ fontSize: 13, color: t.textMuted, flexShrink: 0 }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ active, onClick, t }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: active ? t.accent : t.inputBorder,
        position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: active ? 21 : 3, transition: "left 0.2s",
      }} />
    </div>
  );
}

function AbsenceCopyBtn({ name, date, onAbsence, t }) {
  const [copied, setCopied] = useState(false);
  const text = `${name}\n本日${date}休みです`;
  return (
    <button
      onClick={async () => {
        await copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onAbsence?.();
      }}
      style={{
        width: "100%", padding: "14px 0",
        background: copied ? t.successBg : "transparent",
        color: copied ? t.successText : t.textSub,
        border: `1px solid ${copied ? t.successBorder : t.inputBorder}`,
        borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {copied ? "コピーしました！" : "休み報告をコピー"}
    </button>
  );
}

function MoneyInput({ value, onChange, placeholder, t }) {
  const [editing, setEditing] = useState(false);
  // Android対策: type="text"固定 + inputMode="numeric"でテンキー表示
  const rawValue = String(value).replace(/,/g, "").replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, "");
  const display = editing ? rawValue : numDisplay(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={display}
        onChange={(e) => {
          const v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9,]/g, "").replace(/,/g, "");
          onChange(v);
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        style={{
          flex: 1, background: t.input, border: `1px solid ${t.inputBorder}`,
          borderRadius: 8, color: t.text, padding: "8px 12px", fontSize: 15, outline: "none", width: "100%",
        }}
      />
      <span style={{ fontSize: 13, color: t.textMuted, flexShrink: 0 }}>円</span>
    </div>
  );
}

function Req() {
  return <span style={{ color: "#f87171", marginLeft: 2, fontSize: 11 }}>*</span>;
}

function HistoryCopyBtn({ text, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        width: "100%", padding: "14px 0",
        background: copied ? t.successBg : t.card,
        color: copied ? t.successText : t.text,
        border: `2px solid ${copied ? t.successBorder : t.accent}`,
        borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {copied ? "コピーしました！" : "テキストをコピー"}
    </button>
  );
}

function TabBtn({ label, active, onClick, t }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        background: active ? t.accent : "transparent",
        color: active ? "#fff" : t.textMuted,
        border: `1px solid ${active ? t.accent : t.inputBorder}`,
        borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
