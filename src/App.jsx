import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "reportApp_settings";
const HISTORY_KEY = "reportApp_history";
const MAX_HISTORY = 50;

const defaultSettings = {
  name: "",
  gasUrl: "",
  centerName: "",
  sheetTab: "",
  staff: [],
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
  manType: "1",
  partnerName: "",
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = { ...defaultSettings, ...JSON.parse(saved) };
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

  const generateText = useCallback(() => {
    const lines = [];
    lines.push(settings.name);
    if (settings.centerName) lines.push(settings.centerName);
    lines.push(form.date);

    if (form.traineeMode) {
      if (form.traineeName) lines.push(`${form.traineeName}さん研修同行です。`);
      if (form.manType === "2" && form.partnerName) {
        lines.push(`${form.partnerName}さんと2マンです`);
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

    if (form.manType === "2" && form.partnerName) {
      lines.push(`${form.partnerName}さんと2マンです`);
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

  const saveHistory = (reportText) => {
    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: form.date,
      origin: form.traineeMode ? "研修" : form.origin,
      count: form.count,
      total,
      manType: form.manType,
      partnerName: form.partnerName,
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
    setForm(entry.formSnapshot);
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

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);

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
      manType: form.manType,
      partnerName: form.manType === "2" ? form.partnerName : "",
      reportText: generateText(),
    };

    try {
      const resp = await fetch(settings.gasUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        mode: "no-cors",
      });
      // no-corsモードではレスポンスが読めないため、送信成功とみなす
      setSendStatus("ok");
      saveHistory(generateText());
    } catch (e) {
      setSendStatus("error");
    }
    setSending(false);
    setSubmitted(true);
    setTab("result");
  };

  const handleReset = () => {
    setForm(defaultForm);
    setSubmitted(false);
    setSendStatus(null);
    setIsAbsence(false);
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

  const enabledStaff = settings.staff.filter((s) => s.enabled);

  const gasScript = `// Google Apps Script - 「R8年 チーム中山原本」のメンバーシートに直接記録
// ★ 初回セットアップ：showHeaders() を実行して列位置を確認してください
var SHEET_ID = '1KB3jrOsESJEjoprC9KgLHCSzUMYWqX7bbMSMS-BLvic';

// ===== 列マッピング設定 =====
// showHeaders() の結果を見て、実際の列番号に合わせてください
// 列番号は A=1, B=2, C=3... です
var COL = {
  count:       5,   // E列: 件数
  baseAmount:  6,   // F列: 基本売上
  // --- 追加売り上げ ---
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
  inceCount:   26,  // Z列: インセ 台数
  inceAmount:  27,  // AA列: インセ 金額
  memo:        36,  // AJ列: MEMO
};

// ===== ヘッダー確認用（初回だけ実行） =====
function showHeaders() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ss.getSheets();
  var result = [];

  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (name.indexOf('【') !== 0) return; // メンバーシートのみ

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

// ===== メイン：日報データ受信 =====
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);

    // シートタブ名（例：【濱口】）
    var tabName = (d.sheetTab || '').trim();
    if (!tabName) {
      return res({ status: 'error', message: 'sheetTab が未設定です。設定画面でシート名を入力してください。' });
    }

    // 完全一致で探す。見つからなければ前後スペース無視で探す
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().trim() === tabName) {
          sheet = allSheets[i];
          break;
        }
      }
    }
    if (!sheet) {
      return res({ status: 'error', message: 'シート「' + tabName + '」が見つかりません。' });
    }

    // 日付から行を特定（例："3月15日" → 日=15 → row 5+15=20... ）
    // ★ 実際の行計算はシートの構造に依存します
    // row5=ヘッダー, row6=1日, row7=2日... → row = 5 + day
    var dayMatch = d.date.match(/(\\d+)日/);
    if (!dayMatch) {
      return res({ status: 'error', message: '日付の形式が不正です: ' + d.date });
    }
    var day = parseInt(dayMatch[1]);
    var row = 5 + day; // 6行目=1日, 7行目=2日, ...

    // 件数・基本売上を書き込み
    if (COL.count > 0) sheet.getRange(row, COL.count).setValue(d.count);
    if (COL.baseAmount > 0) sheet.getRange(row, COL.baseAmount).setValue(d.originAmount);

    // 追加売り上げを書き込み
    var fields = [
      ['naikiCount','naikiAmount'],['gaikiCount','gaikiAmount'],
      ['roboCount','roboAmount'],['rfCount','rfAmount'],
      ['mizuCount','mizuAmount'],['kokinCount','kokinAmount'],
      ['sonotaAmount'],['inceCount','inceAmount']
    ];

    fields.forEach(function(pair) {
      pair.forEach(function(key) {
        if (COL[key] > 0 && d[key] !== undefined) {
          sheet.getRange(row, COL[key]).setValue(d[key]);
        }
      });
    });

    // MEMO列に報告文（オプション）
    if (COL.memo > 0) {
      sheet.getRange(row, COL.memo).setValue(d.reportText);
    }

    return res({ status: 'ok', message: tabName + ' の ' + day + '日に記録しました' });

  } catch(err) {
    return res({ status: 'error', message: err.toString() });
  }
}

function res(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== バックアップ用：日報シートにも全データ記録 =====
function doPostBackup(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var logSheet = ss.getSheetByName('日報ログ');
  if (!logSheet) {
    logSheet = ss.insertSheet('日報ログ');
    logSheet.appendRow(['タイムスタンプ','名前','シート','日付','件数','基本売上',
      '内機台','内機円','外機台','外機円','ロボ台','ロボ円','RF台','RF円',
      '水回り台','水回り円','抗菌台','抗菌円','その他円','インセ台','インセ円',
      '合計','マン数','相手名','報告文']);
  }
  var d = JSON.parse(e.postData.contents);
  logSheet.appendRow([d.timestamp, d.name, d.sheetTab, d.date, d.count, d.originAmount,
    d.naikiCount, d.naikiAmount, d.gaikiCount, d.gaikiAmount,
    d.roboCount, d.roboAmount, d.rfCount, d.rfAmount,
    d.mizuCount, d.mizuAmount, d.kokinCount, d.kokinAmount,
    d.sonotaAmount, d.inceCount, d.inceAmount,
    d.total, d.manType, d.partnerName, d.reportText]);
}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0f",
      color: "#f0f0f0",
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{
        background: "#1a1a1a",
        borderBottom: "2px solid #ff6b00",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#ff6b00", letterSpacing: 3, fontWeight: 700 }}>
            DAILY REPORT
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>日報送信アプリ</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <TabBtn label="入力" active={tab === "form"} onClick={() => setTab("form")} />
          <TabBtn label="報告文" active={tab === "result"} onClick={() => setTab("result")} />
          <TabBtn label="履歴" active={tab === "history"} onClick={() => { setTab("history"); setSelectedHistory(null); }} />
          <TabBtn label="⚙" active={tab === "settings"} onClick={() => setTab("settings")} />
        </div>
      </div>

      <div style={{ padding: "20px 16px 100px" }}>

        {/* FORM TAB */}
        {tab === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* バリデーションエラー */}
            {errors.length > 0 && (
              <div style={{
                background: "#3a0f0f",
                border: "1px solid #8a2d2d",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 14,
              }}>
                {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}

            {/* 研修モード切り替え */}
            <div style={{
              background: "#1a1a1a",
              borderRadius: 12,
              padding: "14px 16px",
              border: `1px solid ${form.traineeMode ? "#ff6b00" : "#2a2a2a"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: form.traineeMode ? "#ff6b00" : "#888" }}>
                  研修モード
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  ONにすると研修同行報告に切り替わります
                </div>
              </div>
              <Toggle
                active={form.traineeMode}
                onClick={() => setForm((f) => ({ ...f, traineeMode: !f.traineeMode, traineeName: "" }))}
              />
            </div>

            {/* 基本情報 */}
            <Section title="基本情報">
              <Row label="名前">
                <Input value={settings.name} onChange={(v) => saveSettings({ ...settings, name: v })} />
              </Row>
              <Row label="日付">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={form.date}
                      onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                      placeholder="例：3月29日"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const d = new Date();
                      setForm((f) => ({ ...f, date: `${d.getMonth() + 1}月${d.getDate()}日` }));
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "#1a1a1a",
                      border: "1px solid #ff6b00",
                      borderRadius: 8,
                      color: "#ff6b00",
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
                <Row label={<>同行者<Req /></>}>
                  <Input
                    value={form.traineeName}
                    onChange={(v) => setForm((f) => ({ ...f, traineeName: v }))}
                    placeholder="例：米田有佑"
                  />
                </Row>
              )}
            </Section>

            {/* エディオン - 研修モードでは非表示 */}
            {!form.traineeMode && (
              <Section title="エディオン">
                <Row label={<>センター<Req /></>}>
                  <Input
                    value={form.origin}
                    onChange={(v) => setForm((f) => ({ ...f, origin: v }))}
                    placeholder="例：春日井"
                  />
                </Row>
                <Row label={<>件数<Req /></>}>
                  <Input
                    value={form.count}
                    onChange={(v) => setForm((f) => ({ ...f, count: v }))}
                    placeholder=""
                    type="number"
                    suffix="件"
                  />
                </Row>
                <Row label={<>金額<Req /></>}>
                  <MoneyInput
                    value={form.originAmount}
                    onChange={(v) => setForm((f) => ({ ...f, originAmount: v }))}
                    placeholder=""
                  />
                </Row>
              </Section>
            )}

            {/* 追加 - 研修モードでは非表示 */}
            {!form.traineeMode && (
              <Section title="追加（該当するものをON）">
                {addItems.map((item) => {
                  const a = form.additions[item.key];
                  return (
                    <div key={item.key} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: a.enabled ? 8 : 0 }}>
                        <Toggle active={a.enabled} onClick={() => toggleAddition(item.key)} />
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{item.label}</span>
                      </div>
                      {a.enabled && (
                        <div style={{ paddingLeft: 46, display: "flex", flexDirection: "column", gap: 6 }}>
                          {item.hasCount && (
                            <Row label="台数">
                              <Input
                                value={a.count}
                                onChange={(v) => updateAddition(item.key, "count", v)}
                                placeholder=""
                                type="number"
                                suffix="台"
                              />
                            </Row>
                          )}
                          {item.hasDetail && (
                            <Row label="詳細">
                              <Input
                                value={a.detail || ""}
                                onChange={(v) => updateAddition(item.key, "detail", v)}
                                placeholder="例：抗菌2台"
                              />
                            </Row>
                          )}
                          <Row label="金額">
                            <MoneyInput
                              value={a.amount}
                              onChange={(v) => updateAddition(item.key, "amount", v)}
                              placeholder=""
                            />
                          </Row>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Section>
            )}

            {/* 抗菌（スプレッド転記用） - 研修モードでは非表示 */}
            {!form.traineeMode && (
              <div style={{
                background: "#1a1a1a",
                borderRadius: 12,
                padding: "16px",
                border: "1px solid #2a2a2a",
              }}>
                <div style={{
                  fontSize: 11,
                  color: "#888",
                  fontWeight: 700,
                  letterSpacing: 2,
                  marginBottom: 12,
                }}>
                  抗菌（スプレッド転記用）
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 10, lineHeight: 1.6 }}>
                  報告文には出ません。スプレッドシートの抗菌列に転記されます。
                </div>
                <Row label="台数">
                  <Input
                    value={form.kokinCount}
                    onChange={(v) => setForm((f) => ({ ...f, kokinCount: v }))}
                    placeholder=""
                    type="number"
                    suffix="台"
                  />
                </Row>
                <Row label="金額">
                  <MoneyInput
                    value={form.kokinAmount}
                    onChange={(v) => setForm((f) => ({ ...f, kokinAmount: v }))}
                    placeholder=""
                  />
                </Row>
              </div>
            )}

            {/* 合計 - 研修モードでは非表示 */}
            {!form.traineeMode && (
              <div style={{
                background: "#1a1a1a",
                border: "2px solid #ff6b00",
                borderRadius: 12,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ff6b00" }}>合計</span>
                <span style={{ fontSize: 24, fontWeight: 900 }}>
                  {total > 0 ? `¥${total.toLocaleString()}` : "¥0"}
                </span>
              </div>
            )}

            {/* マン */}
            <Section title="作業形態">
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                {["1", "2"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, manType: m, partnerName: "" }))}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: 8,
                      border: `2px solid ${form.manType === m ? "#ff6b00" : "#333"}`,
                      background: form.manType === m ? "#ff6b0022" : "#1a1a1a",
                      color: form.manType === m ? "#ff6b00" : "#888",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {m}マン
                  </button>
                ))}
              </div>
              {form.manType === "2" && (
                <Row label="相手の名前">
                  {enabledStaff.length > 0 ? (
                    <select
                      value={form.partnerName}
                      onChange={(e) => setForm((f) => ({ ...f, partnerName: e.target.value }))}
                      style={{
                        width: "100%",
                        background: "#111",
                        border: "1px solid #333",
                        borderRadius: 8,
                        color: form.partnerName ? "#f0f0f0" : "#555",
                        padding: "8px 12px",
                        fontSize: 15,
                        outline: "none",
                      }}
                    >
                      <option value="">選択してください</option>
                      {enabledStaff.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={form.partnerName}
                      onChange={(v) => setForm((f) => ({ ...f, partnerName: v }))}
                      placeholder="例：佐藤優光"
                    />
                  )}
                </Row>
              )}
            </Section>

            {/* 送信 */}
            <button
              onClick={handleSubmit}
              disabled={sending}
              style={{
                width: "100%",
                padding: "16px 0",
                background: sending ? "#444" : "linear-gradient(135deg, #ff6b00, #ff9500)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 800,
                cursor: sending ? "not-allowed" : "pointer",
                letterSpacing: 2,
              }}
            >
              {sending ? "送信中..." : "📤 送信してスプレッドシートへ"}
            </button>

            {/* 休み報告 */}
            <AbsenceCopyBtn
              name={settings.name}
              date={form.date}
              onAbsence={() => { setIsAbsence(true); setTab("result"); }}
            />
          </div>
        )}

        {/* RESULT TAB */}
        {tab === "result" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isAbsence && sendStatus === "ok" && (
              <div style={{
                background: "#0f3a1a",
                border: "1px solid #2d8a4e",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#4ade80",
                fontSize: 14,
                fontWeight: 600,
              }}>
                ✅ スプレッドシートに送信しました
              </div>
            )}
            {!isAbsence && sendStatus === "error_no_url" && (
              <div style={{
                background: "#3a1a0f",
                border: "1px solid #8a4e2d",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#fb923c",
                fontSize: 14,
              }}>
                ⚠️ GAS URLが未設定です。⚙設定からURLを入力してください。
              </div>
            )}
            {!isAbsence && sendStatus === "error" && (
              <div style={{
                background: "#3a0f0f",
                border: "1px solid #8a2d2d",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 14,
              }}>
                ❌ 送信に失敗しました。URLを確認してください。
              </div>
            )}
            {!isAbsence && sendStatus === "error_gas" && (
              <div style={{
                background: "#3a0f0f",
                border: "1px solid #8a2d2d",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 14,
              }}>
                ❌ GASエラー：{errors[0] || "不明なエラー"}
              </div>
            )}

            <div style={{ fontSize: 13, color: "#888", fontWeight: 600, letterSpacing: 1 }}>
              {isAbsence ? "休み報告文" : "生成された報告文"}
            </div>
            <div style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "18px 16px",
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              fontSize: 15,
              fontFamily: "'Noto Sans JP', sans-serif",
            }}>
              {isAbsence ? `${settings.name}\n本日${form.date}休みです` : generateText()}
            </div>

            <button
              onClick={handleCopy}
              style={{
                width: "100%",
                padding: "14px 0",
                background: copied ? "#1a3a2a" : "#1a1a1a",
                color: copied ? "#4ade80" : "#f0f0f0",
                border: `2px solid ${copied ? "#2d8a4e" : "#ff6b00"}`,
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {copied ? "✅ コピーしました！" : "📋 テキストをコピー"}
            </button>

            <button
              onClick={handleReset}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "transparent",
                color: "#888",
                border: "1px solid #333",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 新しい日報を入力する
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
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ff6b00",
                      fontSize: 20,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ←
                  </button>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {selectedHistory.date} - {selectedHistory.origin}
                  </div>
                </div>

                <div style={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 12,
                  padding: "18px 16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.9,
                  fontSize: 15,
                }}>
                  {selectedHistory.reportText}
                </div>

                <HistoryCopyBtn text={selectedHistory.reportText} />

                <button
                  onClick={() => restoreFromHistory(selectedHistory)}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: "#1a1a1a",
                    color: "#ff6b00",
                    border: "2px solid #ff6b00",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  この内容で入力する
                </button>

                <button
                  onClick={() => deleteHistory(selectedHistory.id)}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "transparent",
                    color: "#f87171",
                    border: "1px solid #8a2d2d",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  この履歴を削除
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#888", fontWeight: 600, letterSpacing: 1 }}>
                  送信履歴（最新{MAX_HISTORY}件）
                </div>
                {history.length === 0 ? (
                  <div style={{
                    background: "#1a1a1a",
                    borderRadius: 12,
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#666",
                    fontSize: 14,
                  }}>
                    まだ送信履歴がありません
                  </div>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHistory(h)}
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{h.date}</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: "#ff6b00" }}>
                          ¥{h.total.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#888" }}>
                        {h.origin}{h.count ? ` ${h.count}件` : ""}
                        {h.manType === "2" && h.partnerName ? ` / ${h.partnerName}さんと2マン` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                        {new Date(h.timestamp).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Section title="基本設定">
              <Row label="自分の名前">
                <Input
                  value={settings.name}
                  onChange={(v) => saveSettings({ ...settings, name: v })}
                  placeholder="例：濱口翔太"
                />
              </Row>
              <Row label="センター名">
                <Input
                  value={settings.centerName}
                  onChange={(v) => saveSettings({ ...settings, centerName: v })}
                  placeholder="例：名古屋西"
                />
              </Row>
              <Row label="シート名">
                <Input
                  value={settings.sheetTab}
                  onChange={(v) => saveSettings({ ...settings, sheetTab: v })}
                  placeholder="例：【濱口】"
                />
              </Row>
              <div style={{ fontSize: 12, color: "#666", marginTop: -4, lineHeight: 1.6 }}>
                スプレッドシートの自分のタブ名を入力してください。
              </div>
            </Section>

            <Section title="スタッフ管理">
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10, lineHeight: 1.6 }}>
                2マン選択時のプルダウンに表示されます。無効で非表示になります。
              </div>
              {settings.staff.length === 0 && (
                <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                  スタッフが登録されていません
                </div>
              )}
              {settings.staff.map((s, i) => (
                <div key={s.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  padding: "8px 12px",
                  background: "#111",
                  borderRadius: 8,
                  border: "1px solid #2a2a2a",
                }}>
                  <Toggle
                    active={s.enabled}
                    onClick={() => {
                      const updated = [...settings.staff];
                      updated[i] = { ...s, enabled: !s.enabled };
                      saveSettings({ ...settings, staff: updated });
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 15, color: s.enabled ? "#f0f0f0" : "#555" }}>{s.name}</span>
                  <button
                    onClick={() => saveSettings({ ...settings, staff: settings.staff.filter((_, j) => j !== i) })}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#8a2d2d",
                      fontSize: 20,
                      cursor: "pointer",
                      padding: "0 4px",
                      lineHeight: 1,
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
                    staff: [...settings.staff, { id: Date.now().toString(), name: name.trim(), enabled: true }],
                  });
                }}
              />
            </Section>

            <Section title="Google Apps Script URL">
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10, lineHeight: 1.7 }}>
                GASをデプロイして取得したURLを貼り付けてください。
                <br />
                <span
                  style={{ color: "#ff6b00", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setTab("gas")}
                >
                  📄 GASスクリプトの確認・コピーはこちら
                </span>
              </div>
              <textarea
                value={settings.gasUrl}
                onChange={(e) => saveSettings({ ...settings, gasUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/..."
                rows={3}
                style={{
                  width: "100%",
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 8,
                  color: "#f0f0f0",
                  padding: "10px 12px",
                  fontSize: 13,
                  resize: "none",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
              />
            </Section>

            <div style={{
              background: "#1a1a0a",
              border: "1px solid #554400",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 13,
              color: "#aaa",
              lineHeight: 1.8,
            }}>
              <div style={{ color: "#ffcc00", fontWeight: 700, marginBottom: 6 }}>📋 設定手順</div>
              <div>① GASスクリプトをコピー</div>
              <div>② スプレッドシートを開く</div>
              <div>③ 拡張機能 → Apps Script</div>
              <div>④ スクリプト貼り付けて保存</div>
              <div>⑤ デプロイ → 新しいデプロイ</div>
              <div>⑥ 種類：ウェブアプリ</div>
              <div>⑦ アクセス：全員</div>
              <div>⑧ デプロイURLをここに貼る</div>
            </div>
          </div>
        )}

        {/* GAS SCRIPT TAB */}
        {tab === "gas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => setTab("settings")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ff6b00",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ←
              </button>
              <div style={{ fontSize: 15, fontWeight: 700 }}>GASスクリプト</div>
            </div>

            <div style={{
              background: "#0d1117",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "16px",
              whiteSpace: "pre-wrap",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#c9d1d9",
              lineHeight: 1.6,
              overflowX: "auto",
            }}>
              {gasScript}
            </div>

            <GasCopyBtn script={gasScript} />

            <div style={{
              background: "#1a1a0a",
              border: "1px solid #554400",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 13,
              color: "#aaa",
              lineHeight: 1.8,
            }}>
              <div style={{ color: "#ffcc00", fontWeight: 700, marginBottom: 6 }}>⚠️ セットアップ手順</div>
              <div>1. スクリプトを貼り付けて保存</div>
              <div>2. <b>showHeaders</b> を実行（▶ボタン）</div>
              <div>3. 「実行ログ」で列番号を確認</div>
              <div>4. COLの数値を実際の列番号に修正</div>
              <div>5. デプロイ → アクセス：全員</div>
              <div>6. URLをアプリの設定に貼る</div>
              <div style={{ marginTop: 6 }}>・更新時は「デプロイを管理」→「編集」</div>
              <div>・初回は権限承認が必要</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddStaffInput({ onAdd }) {
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
          flex: 1,
          background: "#111",
          border: "1px solid #333",
          borderRadius: 8,
          color: "#f0f0f0",
          padding: "8px 12px",
          fontSize: 14,
          outline: "none",
        }}
      />
      <button
        onClick={() => { onAdd(name); setName(""); }}
        style={{
          padding: "8px 16px",
          background: "#ff6b00",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        追加
      </button>
    </div>
  );
}

function GasCopyBtn({ script }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await copyToClipboard(script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        width: "100%",
        padding: "14px 0",
        background: copied ? "#1a3a2a" : "linear-gradient(135deg, #ff6b00, #ff9500)",
        color: copied ? "#4ade80" : "#fff",
        border: "none",
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {copied ? "✅ コピーしました！" : "📋 スクリプトをコピー"}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: "#1a1a1a",
      borderRadius: 12,
      padding: "16px",
      border: "1px solid #2a2a2a",
    }}>
      <div style={{
        fontSize: 11,
        color: "#ff6b00",
        fontWeight: 700,
        letterSpacing: 2,
        marginBottom: 12,
      }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
    }}>
      <div style={{ width: 70, fontSize: 13, color: "#888", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "#111",
          border: "1px solid #333",
          borderRadius: 8,
          color: "#f0f0f0",
          padding: "8px 12px",
          fontSize: 15,
          outline: "none",
          width: "100%",
        }}
      />
      {suffix && <span style={{ fontSize: 13, color: "#666", flexShrink: 0 }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: active ? "#ff6b00" : "#333",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        position: "absolute",
        top: 3,
        left: active ? 21 : 3,
        transition: "left 0.2s",
      }} />
    </div>
  );
}

function AbsenceCopyBtn({ name, date, onAbsence }) {
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
        width: "100%",
        padding: "14px 0",
        background: copied ? "#1a3a2a" : "transparent",
        color: copied ? "#4ade80" : "#888",
        border: `1px solid ${copied ? "#2d8a4e" : "#444"}`,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {copied ? "✅ コピーしました！" : "🏖 休み報告をコピー"}
    </button>
  );
}

function MoneyInput({ value, onChange, placeholder }) {
  const [editing, setEditing] = useState(false);
  const display = editing ? String(value).replace(/,/g, "") : numDisplay(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type={editing ? "number" : "text"}
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "#111",
          border: "1px solid #333",
          borderRadius: 8,
          color: "#f0f0f0",
          padding: "8px 12px",
          fontSize: 15,
          outline: "none",
          width: "100%",
        }}
      />
      <span style={{ fontSize: 13, color: "#666", flexShrink: 0 }}>円</span>
    </div>
  );
}

function Req() {
  return <span style={{ color: "#f87171", marginLeft: 2, fontSize: 11 }}>*</span>;
}

function HistoryCopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        width: "100%",
        padding: "14px 0",
        background: copied ? "#1a3a2a" : "#1a1a1a",
        color: copied ? "#4ade80" : "#f0f0f0",
        border: `2px solid ${copied ? "#2d8a4e" : "#ff6b00"}`,
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {copied ? "コピーしました！" : "テキストをコピー"}
    </button>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        background: active ? "#ff6b00" : "transparent",
        color: active ? "#fff" : "#666",
        border: `1px solid ${active ? "#ff6b00" : "#333"}`,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
