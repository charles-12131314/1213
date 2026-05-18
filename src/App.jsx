import { useState } from "react";

const SYSTEM_PROMPT = `你是一位顶级的职业规划顾问和招聘分析专家，拥有丰富的HR经验。请对用户提供的招聘职位描述进行深度分析。

请严格按照以下JSON格式返回分析结果，不要包含任何Markdown代码块标记，直接输出JSON：
{
  "title": "职位名称",
  "company": "公司名称（如有，没有则留空字符串）",
  "difficulty": 难度数字1到5（1=入门级，5=极难），
  "difficultyLabel": "难度描述",
  "salary": "薪资估算（如JD中没有明确，请根据市场给出估算范围）",
  "hardSkills": ["必备技能1", "必备技能2"],
  "softSkills": ["软技能1", "软技能2"],
  "niceToHaves": ["加分项1", "加分项2"],
  "cultureSignals": ["文化信号1", "文化信号2"],
  "redFlags": ["潜在风险1", "潜在风险2"],
  "resumeTips": ["简历优化建议1", "简历优化建议2", "建议3"],
  "interviewTopics": ["面试考点1", "面试考点2"],
  "summary": "100字以内的职位核心总结",
  "fitScore": "适合什么类型候选人的简短描述"
}`;

const DIFF_COLORS = {
  1: { bg: "#EAF3DE", text: "#3B6D11", border: "#C0DD97" },
  2: { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB" },
  3: { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
  4: { bg: "#FAECE7", text: "#993C1D", border: "#F5C4B3" },
  5: { bg: "#FCEBEB", text: "#A32D2D", border: "#F7C1C1" },
};

const TAG_COLORS = {
  blue:   { bg: "#E6F1FB", text: "#185FA5" },
  green:  { bg: "#EAF3DE", text: "#3B6D11" },
  amber:  { bg: "#FAEEDA", text: "#854F0B" },
  purple: { bg: "#EEEDFE", text: "#534AB7" },
  teal:   { bg: "#E1F5EE", text: "#0F6E56" },
  gray:   { bg: "#F1EFE8", text: "#5F5E5A" },
};

function Tag({ children, color = "gray" }) {
  const p = TAG_COLORS[color] || TAG_COLORS.gray;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 6,
      fontSize: 13, fontWeight: 500, background: p.bg, color: p.text,
      marginRight: 6, marginBottom: 6,
    }}>{children}</span>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "0.5px solid var(--border)",
      borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 16, color: "var(--text2)" }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, dotColor = "#888780" }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "var(--text)", lineHeight: 1.65, marginBottom: i < items.length - 1 ? 7 : 0 }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: dotColor, marginTop: 8, flexShrink: 0 }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function StarBar({ value }) {
  const dc = DIFF_COLORS[value] || DIFF_COLORS[3];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i <= value ? dc.text : "var(--border)" }} />
      ))}
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("jd_apikey") || "");
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function saveKey() {
    const k = keyInput.trim();
    if (k.length < 10) {
      setError("API Key 格式不正确，请检查后重试");
      return;
    }
    localStorage.setItem("jd_apikey", k);
    setApiKey(k);
    setShowKeyPanel(false);
    setKeyInput("");
    setError(null);
  }

  async function analyzeJob() {
    if (!jobText.trim()) return;
    if (!apiKey) { setShowKeyPanel(true); return; }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 4096,
          temperature: 0.3,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `请分析以下招聘职位：\n\n${jobText}` },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error("API Key 无效，请重新设置");
        if (response.status === 402) throw new Error("账户余额不足，请前往 DeepSeek 平台充值");
        if (response.status === 429) throw new Error("请求过于频繁，请稍后再试");
        throw new Error(err?.error?.message || `请求失败 (${response.status})`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      const jsonStr = start !== -1 && end !== -1 ? clean.slice(start, end + 1) : clean;
      const parsed = JSON.parse(jsonStr);
      setResult(parsed);
    } catch (e) {
      setError(e.message || "分析失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  const dc = result ? DIFF_COLORS[result.difficulty] || DIFF_COLORS[3] : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{
        background: "var(--surface)", borderBottom: "0.5px solid var(--border)",
        padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-briefcase-2" style={{ fontSize: 20, color: "var(--text)" }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>职位分析 Agent</span>
        </div>
        <button
          onClick={() => { setShowKeyPanel(!showKeyPanel); setKeyInput(apiKey); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            color: apiKey ? "#3B6D11" : "#993C1D",
            background: apiKey ? "#EAF3DE" : "#FCEBEB",
            border: `0.5px solid ${apiKey ? "#C0DD97" : "#F7C1C1"}`,
            borderRadius: 20, padding: "4px 12px", cursor: "pointer",
          }}
        >
          <i className={`ti ti-${apiKey ? "key" : "key-off"}`} style={{ fontSize: 14 }} />
          {apiKey ? "DeepSeek Key 已设置" : "设置 DeepSeek API Key"}
        </button>
      </header>

      {showKeyPanel && (
        <div style={{ background: "var(--surface)", borderBottom: "0.5px solid var(--border)", padding: "16px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>
            前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: "#185FA5" }}>DeepSeek 开放平台</a> 创建 API Key，粘贴到下方（仅保存在本地浏览器，不会上传）：
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveKey()}
              placeholder="sk-..."
              style={{
                flex: 1, padding: "8px 12px", fontSize: 14, borderRadius: 8,
                border: "0.5px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", fontFamily: "monospace", outline: "none",
              }}
            />
            <button onClick={saveKey} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: "#185FA5", color: "#fff", border: "none", cursor: "pointer" }}>保存</button>
            <button onClick={() => setShowKeyPanel(false)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)", cursor: "pointer" }}>取消</button>
          </div>
          {apiKey && (
            <button onClick={() => { localStorage.removeItem("jd_apikey"); setApiKey(""); setShowKeyPanel(false); }}
              style={{ marginTop: 8, fontSize: 13, color: "#A32D2D", background: "none", border: "none", cursor: "pointer" }}>
              清除已保存的 Key
            </button>
          )}
          {error && <p style={{ marginTop: 8, fontSize: 13, color: "#A32D2D" }}>{error}</p>}
        </div>
      )}

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: 16 }}>
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            placeholder={"粘贴招聘职位描述（JD）到这里...\n\n支持中英文，包含职位名称、岗位职责、任职要求等内容，信息越完整分析越准确。"}
            style={{ width: "100%", minHeight: 160, resize: "vertical", border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)", lineHeight: 1.7, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              {jobText.length > 0 ? `${jobText.length} 字符` : "建议粘贴完整 JD 以获得更准确分析"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {jobText && (
                <button onClick={() => { setJobText(""); setResult(null); setError(null); }}
                  style={{ fontSize: 13, color: "var(--text2)", background: "none", border: "0.5px solid var(--border)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
                  清空
                </button>
              )}
              <button
                onClick={analyzeJob}
                disabled={loading || !jobText.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500,
                  background: loading || !jobText.trim() ? "var(--surface2)" : "#185FA5",
                  color: loading || !jobText.trim() ? "var(--text3)" : "#fff",
                  border: "none", borderRadius: 8, padding: "7px 20px",
                  cursor: loading || !jobText.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? <><i className="ti ti-loader" style={{ fontSize: 15, animation: "spin 1s linear infinite" }} /> 分析中...</>
                  : <><i className="ti ti-sparkles" style={{ fontSize: 15 }} /> 开始分析</>
                }
              </button>
            </div>
          </div>
        </div>

        {error && !showKeyPanel && (
          <div style={{ background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 14px", color: "#A32D2D", fontSize: 14, marginBottom: 16 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 15, marginRight: 6 }} />{error}
          </div>
        )}

        {loading && (
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "2.5rem", textAlign: "center", border: "0.5px solid var(--border)" }}>
            <i className="ti ti-brain" style={{ fontSize: 32, color: "var(--text3)", marginBottom: 12, display: "block" }} />
            <p style={{ color: "var(--text2)", fontSize: 15, margin: 0 }}>正在深度解析职位信息，请稍候...</p>
            <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 6 }}>分析技能要求 · 评估难度 · 生成求职建议</p>
          </div>
        )}

        {result && (
          <div>
            <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>{result.title || "职位分析"}</h1>
                  {result.company && (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text2)" }}>
                      <i className="ti ti-building" style={{ fontSize: 13, marginRight: 4, verticalAlign: -1 }} />{result.company}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.salary && (
                    <div style={{ background: "#EAF3DE", color: "#3B6D11", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500 }}>
                      <i className="ti ti-currency-yen" style={{ fontSize: 13, marginRight: 3 }} />{result.salary}
                    </div>
                  )}
                  {result.difficulty && (
                    <div style={{ background: dc.bg, color: dc.text, border: `0.5px solid ${dc.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
                      <StarBar value={result.difficulty} />{result.difficultyLabel}
                    </div>
                  )}
                </div>
              </div>
              {result.summary && (
                <p style={{ marginTop: 14, marginBottom: 0, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8, fontSize: 14, color: "var(--text)", lineHeight: 1.7, borderLeft: "3px solid var(--border)" }}>
                  {result.summary}
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {result.hardSkills?.length > 0 && (
                <Section icon="code" title="必备技能">
                  <div>{result.hardSkills.map((s, i) => <Tag key={i} color="blue">{s}</Tag>)}</div>
                </Section>
              )}
              {result.softSkills?.length > 0 && (
                <Section icon="heart-handshake" title="软性素质">
                  <div>{result.softSkills.map((s, i) => <Tag key={i} color="purple">{s}</Tag>)}</div>
                </Section>
              )}
            </div>

            {result.niceToHaves?.length > 0 && (
              <Section icon="stars" title="加分项">
                <div>{result.niceToHaves.map((s, i) => <Tag key={i} color="teal">{s}</Tag>)}</div>
              </Section>
            )}
            {result.cultureSignals?.length > 0 && (
              <Section icon="users" title="企业文化信号">
                <BulletList items={result.cultureSignals} dotColor="#7F77DD" />
              </Section>
            )}
            {result.redFlags?.length > 0 && (
              <Section icon="alert-triangle" title="潜在风险提示">
                <BulletList items={result.redFlags} dotColor="#EF9F27" />
              </Section>
            )}
            {result.interviewTopics?.length > 0 && (
              <Section icon="school" title="面试高频考点">
                <div>{result.interviewTopics.map((t, i) => <Tag key={i} color="amber">{t}</Tag>)}</div>
              </Section>
            )}
            {result.resumeTips?.length > 0 && (
              <Section icon="file-text" title="简历优化建议">
                <BulletList items={result.resumeTips} dotColor="#1D9E75" />
              </Section>
            )}
            {result.fitScore && (
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <i className="ti ti-target" style={{ fontSize: 18, color: "var(--text2)", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>适合人选画像</p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{result.fitScore}</p>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button onClick={() => { setResult(null); setJobText(""); }} style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500,
                background: "var(--surface2)", color: "var(--text2)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "7px 16px", cursor: "pointer",
              }}>
                <i className="ti ti-refresh" style={{ fontSize: 14 }} /> 分析新职位
              </button>
            </div>
          </div>
        )}

        {!result && !loading && (
          <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 13, marginTop: 40 }}>
            粘贴任意招聘 JD，由 DeepSeek AI 深度解析岗位要求、竞争难度及求职策略
          </p>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button { font-family: inherit; }
        input { font-family: inherit; }
      `}</style>
    </div>
  );
}
