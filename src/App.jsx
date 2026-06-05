import { useState, useEffect } from "react";

const VERSION = "0.7.1";

const COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"];

const PHASES = [
  { id: 1, name: "Foundation" },
  { id: 2, name: "Core Features" },
  { id: 3, name: "Distribution" },
];

const TAG_OPTIONS = [
  { label: "Bug",      color: "#e05555", bg: "#2a1515" },
  { label: "Feature",  color: "#4a8fd4", bg: "#0f1e2e" },
  { label: "Docs",     color: "#5a9e3a", bg: "#142010" },
  { label: "Infra",    color: "#c47a00", bg: "#2a1a00" },
  { label: "Design",   color: "#8b78e6", bg: "#1a1530" },
  { label: "Testing",  color: "#d4608a", bg: "#2a1020" },
  { label: "Research", color: "#3ab88a", bg: "#0a2218" },
  { label: "Chore",    color: "#8a8880", bg: "#1e1e1c" },
];

// Storage is namespaced per project so each project's board data is isolated.
// The project name is read at runtime from /.devboard-config.json (written by
// setup.js). Until that resolves — or if it's missing — we fall back to this key.
const FALLBACK_STORAGE_KEY = "devboard-default-v1";
const storageKeyFor = (projectName) =>
  projectName ? `devboard-${projectName}-v1` : FALLBACK_STORAGE_KEY;

// New project boards start EMPTY. (Pre-0.7.1 builds shipped a snapshot of a
// real project's board here, so every fresh board looked like that project
// regardless of storage-key isolation.)
const defaultCards = [];

function Tag({ label }) {
  const t = TAG_OPTIONS.find(t => t.label === label);
  if (!t) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.05em",
      padding: "2px 7px", borderRadius: 20,
      background: t.bg, color: t.color,
      fontFamily: "'DM Mono', monospace",
      border: `1px solid ${t.color}33`,
    }}>{label}</span>
  );
}

function CardModal({ card, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(card ? card.title : "");
  const [col, setCol]     = useState(card ? card.col   : "Backlog");
  const [tags, setTags]   = useState(card ? card.tags  : []);
  const [phase, setPhase] = useState(card?.phase ?? 2);
  const isNew = !card || card.title === "";

  const toggleTag = (label) => {
    setTags(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]);
  };

  const selectStyle = {
    width: "100%", background: "#0d1810", border: "1px solid #1e2a22",
    borderRadius: 8, padding: "8px 12px", color: "#d4e0d0",
    fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 18, outline: "none",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(3px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#111512", border: "1px solid #1e2a22",
        borderRadius: 14, padding: "24px 28px", width: 440,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#6a8a70", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
            {isNew ? "New card" : "Edit card"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6a8a70", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <textarea
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs doing?"
          rows={2}
          style={{
            width: "100%", background: "#0d1810", border: "1px solid #1e2a22",
            borderRadius: 8, padding: "10px 12px", color: "#d4e0d0",
            fontSize: 15, fontFamily: "'DM Sans', sans-serif", resize: "none",
            outline: "none", lineHeight: 1.5, marginBottom: 18, boxSizing: "border-box",
          }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6a8a70", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 8 }}>Column</label>
        <select value={col} onChange={e => setCol(e.target.value)} style={selectStyle}>
          {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6a8a70", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 8 }}>Phase</label>
        <select value={phase} onChange={e => setPhase(Number(e.target.value))} style={selectStyle}>
          {PHASES.map(p => <option key={p.id} value={p.id}>Phase {p.id} — {p.name}</option>)}
        </select>

        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6a8a70", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", display: "block", marginBottom: 10 }}>Tags</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
          {TAG_OPTIONS.map(t => (
            <button key={t.label} onClick={() => toggleTag(t.label)} style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
              padding: "4px 10px", borderRadius: 20, cursor: "pointer",
              fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
              background: tags.includes(t.label) ? t.bg : "transparent",
              color: tags.includes(t.label) ? t.color : "#4a6a50",
              border: tags.includes(t.label) ? `1px solid ${t.color}55` : "1px solid #1e2a22",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {!isNew && (
            <button onClick={() => onDelete(card.id)} style={{
              background: "none", border: "1px solid #3a1a1a", color: "#a33",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
            }}>Delete</button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              background: "none", border: "1px solid #1e2a22", color: "#6a8a70",
              borderRadius: 8, padding: "8px 16px", cursor: "pointer",
              fontSize: 12, fontFamily: "'DM Mono', monospace",
            }}>Cancel</button>
            <button onClick={() => title.trim() && onSave({ title: title.trim(), col, tags, phase })} style={{
              background: "#2a7a5a", border: "none", color: "#d4e0d0",
              borderRadius: 8, padding: "8px 20px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace",
              opacity: title.trim() ? 1 : 0.4,
            }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanView({ cards, onCardClick, onAddClick }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, alignItems: "start", paddingBottom: "2rem" }}>
      {COLUMNS.map(col => {
        const colCards = cards.filter(c => c.col === col);
        const accentColor = col === "In Progress" ? "#8B5E00" : col === "Done" ? "#2a7a5a" : "#6a8a70";
        return (
          <div key={col} style={{ background: "#111512", borderRadius: 12, padding: 10, border: "1px solid #1e2a22" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: accentColor, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{col}</span>
              <span style={{ fontSize: 10, color: "#3a5a40", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{colCards.length}</span>
            </div>
            {colCards.map(card => (
              <div key={card.id} onClick={() => onCardClick(card)} style={{
                background: "#0d1810", border: "1px solid #1e2a22",
                borderRadius: 9, padding: "10px 11px", marginBottom: 7,
                cursor: "pointer", transition: "border-color 0.15s, transform 0.1s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a7a5a66"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2a22"; e.currentTarget.style.transform = ""; }}
              >
                <p style={{ fontSize: 13, color: "#d4e0d0", lineHeight: 1.45, marginBottom: card.tags.length ? 8 : 0, fontFamily: "'DM Sans', sans-serif" }}>{card.title}</p>
                {card.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {card.tags.map(t => <Tag key={t} label={t} />)}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => onAddClick(col)} style={{
              width: "100%", background: "none", border: "1px dashed #1e2a22",
              borderRadius: 9, padding: "7px", cursor: "pointer",
              color: "#3a5a40", fontSize: 16, transition: "border-color 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a7a5a66"; e.currentTarget.style.color = "#2a7a5a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2a22"; e.currentTarget.style.color = "#3a5a40"; }}
            >+</button>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ cards, onCardClick }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? cards : cards.filter(c => c.col === filter);
  return (
    <div style={{ paddingBottom: "2rem" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["All", ...COLUMNS].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
            padding: "4px 12px", borderRadius: 20, cursor: "pointer",
            border: filter === f ? "1px solid #2a7a5a" : "1px solid #1e2a22",
            background: filter === f ? "#2a7a5a18" : "none",
            color: filter === f ? "#2a7a5a" : "#6a8a70",
            letterSpacing: "0.06em", transition: "all 0.15s",
          }}>{f}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {filtered.length === 0 && (
          <div style={{ color: "#3a5a40", fontSize: 13, fontFamily: "'DM Mono', monospace", padding: "2rem 0", textAlign: "center" }}>No cards here yet.</div>
        )}
        {filtered.map(card => (
          <div key={card.id} onClick={() => onCardClick(card)} style={{
            display: "grid", gridTemplateColumns: "1fr auto auto",
            alignItems: "center", gap: 12,
            background: "#111512", border: "1px solid #1e2a22",
            borderRadius: 9, padding: "10px 14px", cursor: "pointer",
            transition: "border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#2a7a5a66"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2a22"}
          >
            <span style={{ fontSize: 13, color: "#d4e0d0", fontFamily: "'DM Sans', sans-serif" }}>{card.title}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {card.tags.map(t => <Tag key={t} label={t} />)}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              fontFamily: "'DM Mono', monospace",
              color: card.col === "In Progress" ? "#8B5E00" : card.col === "Done" ? "#2a7a5a" : "#6a8a70",
              textTransform: "uppercase", minWidth: 72, textAlign: "right",
            }}>{card.col}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapView({ cards, onCardClick }) {
  const getPhaseStatus = (phaseCards) => {
    if (phaseCards.length === 0) return "planned";
    if (phaseCards.every(c => c.col === "Done")) return "complete";
    if (phaseCards.some(c => c.col === "In Progress" || c.col === "Review")) return "in_progress";
    return "planned";
  };

  const cardPrefix = (col) => col === "Done" ? "✓" : (col === "In Progress" || col === "Review") ? "→" : "○";
  const cardColor  = (col) => col === "Done" ? "#4a9a6a" : (col === "In Progress" || col === "Review") ? "#c47a00" : "#555";

  const HEADER_BG = { complete: "#1a3d2e", in_progress: "#3d2800", planned: "#1e1e22" };
  const BADGE     = {
    complete:    { color: "#4a9a6a", bg: "#0d2018", border: "#4a9a6a44", label: "complete ✓" },
    in_progress: { color: "#c47a00", bg: "#1e1400", border: "#c47a0044", label: "in progress" },
    planned:     { color: "#6a8a70", bg: "#151a16", border: "#6a8a7044", label: "planned" },
  };

  return (
    <div style={{ paddingBottom: "2rem", maxWidth: 720 }}>
      {PHASES.map(phase => {
        const phaseCards = cards.filter(c => (c.phase ?? 2) === phase.id);
        const status = getPhaseStatus(phaseCards);
        const badge = BADGE[status];

        return (
          <div key={phase.id} style={{
            border: "1px solid #1e2a22", borderRadius: 12,
            marginBottom: 16, overflow: "hidden",
          }}>
            <div style={{
              background: HEADER_BG[status],
              padding: "12px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "1px solid #1e2a22",
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                color: "#d4e0d0", fontFamily: "'DM Mono', monospace", textTransform: "uppercase",
              }}>
                Phase {phase.id} — {phase.name}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
                fontFamily: "'DM Mono', monospace",
                color: badge.color, background: badge.bg,
                padding: "3px 10px", borderRadius: 20,
                border: `1px solid ${badge.border}`,
              }}>
                {badge.label}
              </span>
            </div>

            <div style={{ padding: "10px 18px 14px", background: "#0d0f0e" }}>
              {phaseCards.length === 0 && (
                <span style={{ fontSize: 12, color: "#3a5a40", fontFamily: "'DM Mono', monospace" }}>No cards in this phase.</span>
              )}
              {phaseCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  title="Click to edit"
                  style={{
                    display: "flex", alignItems: "baseline", gap: 8,
                    padding: "4px 0", cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <span style={{
                    fontSize: 11, fontFamily: "'DM Mono', monospace",
                    color: cardColor(card.col), flexShrink: 0,
                    width: 14, textAlign: "center", lineHeight: 1.6,
                  }}>
                    {cardPrefix(card.col)}
                  </span>
                  <span style={{
                    fontSize: 13, lineHeight: 1.5,
                    color: cardColor(card.col),
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {card.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DevBoard() {
  const [cards, setCards]   = useState(defaultCards);
  const [view, setView]     = useState("kanban");
  const [modal, setModal]   = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [projectName, setProjectName] = useState(null);

  const storageKey = storageKeyFor(projectName);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve the project name from config before loading, so we read from the
      // correct namespaced key on first paint (no flash of the fallback board).
      // Canonical location is public/devboard-config.json (served by Vite in dev
      // AND copied into dist on build); the dotfile in the devboard root is the
      // legacy pre-0.7.1 location, kept as a fallback for clones that pulled new
      // code but haven't re-run `npm run setup` yet.
      let name = null;
      for (const path of ["/devboard-config.json", "/.devboard-config.json"]) {
        try {
          const res = await fetch(path, { cache: "no-store" });
          if (!res.ok) continue;
          const cfg = await res.json();
          if (cfg && typeof cfg.projectName === "string" && cfg.projectName.trim()) {
            name = cfg.projectName.trim();
            break;
          }
        } catch {}
      }
      if (cancelled) return;
      setProjectName(name);
      console.log("Project name:", name);
      console.log("Storage key:", storageKeyFor(name));

      const saved = localStorage.getItem(storageKeyFor(name));
      if (saved) try {
        const parsed = JSON.parse(saved);
        setCards(parsed.map(c => ({ phase: 2, ...c })));
      } catch {}
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = (newCards) => {
    setCards(newCards);
    localStorage.setItem(storageKey, JSON.stringify(newCards));
  };

  const handleSave = ({ title, col, tags, phase }) => {
    if (modal.mode === "new") {
      persist([...cards, { id: `c${Date.now()}`, title, col, tags, phase: phase ?? 2, createdAt: Date.now() }]);
    } else {
      persist(cards.map(c => c.id === modal.card.id ? { ...c, title, col, tags, phase: phase ?? 2 } : c));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    persist(cards.filter(c => c.id !== id));
    setModal(null);
  };

  const totalByCol = COLUMNS.reduce((acc, col) => {
    acc[col] = cards.filter(c => c.col === col).length;
    return acc;
  }, {});

  const VIEWS = [
    { id: "kanban",  label: "⊞ Board"   },
    { id: "list",    label: "≡ List"    },
    { id: "roadmap", label: "⊟ Roadmap" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0d0f0e", minHeight: "100vh", padding: "0 16px" }}>

        {/* header */}
        <div style={{ borderBottom: "1px solid #1e2a22", paddingBottom: 14, marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#2a7a5a", letterSpacing: "0.15em", fontWeight: 700, textTransform: "uppercase" }}>Dev Board</span>
              {!loaded && <span style={{ fontSize: 10, color: "#3a5a40", fontFamily: "'DM Mono', monospace" }}>loading…</span>}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#d4e0d0", marginTop: 2, letterSpacing: "-0.02em" }}>
              {projectName ? `${projectName} — Board` : "Project Board"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", background: "#111512", border: "1px solid #1e2a22", borderRadius: 8, padding: 3, gap: 2 }}>
              {VIEWS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  padding: "5px 13px", borderRadius: 6, cursor: "pointer",
                  background: view === v.id ? "#1a2a1e" : "none",
                  border: view === v.id ? "1px solid #2a3a2e" : "1px solid transparent",
                  color: view === v.id ? "#d4e0d0" : "#4a6a50",
                  fontSize: 11, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.06em", transition: "all 0.15s",
                }}>{v.label}</button>
              ))}
            </div>
            <button onClick={() => setModal({ mode: "new", defaultCol: "Backlog" })} style={{
              background: "#2a7a5a", border: "none", color: "#d4e0d0",
              borderRadius: 8, padding: "7px 16px", cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.06em",
            }}>+ New card</button>
          </div>
        </div>

        {/* stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto" }}>
          {COLUMNS.map(col => (
            <div key={col} style={{
              flex: "0 0 auto", background: "#111512", border: "1px solid #1e2a22",
              borderRadius: 9, padding: "8px 16px", display: "flex", flexDirection: "column", gap: 2,
            }}>
              <span style={{
                fontSize: 18, fontWeight: 600, fontFamily: "'DM Mono', monospace",
                color: col === "In Progress" ? "#8B5E00" : col === "Done" ? "#2a7a5a" : "#d4e0d0",
              }}>{totalByCol[col]}</span>
              <span style={{ fontSize: 10, color: "#6a8a70", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{col}</span>
            </div>
          ))}
        </div>

        {/* main view */}
        {view === "kanban"  && <KanbanView  cards={cards} onCardClick={card => setModal({ mode: "edit", card })} onAddClick={col => setModal({ mode: "new", defaultCol: col })} />}
        {view === "list"    && <ListView    cards={cards} onCardClick={card => setModal({ mode: "edit", card })} />}
        {view === "roadmap" && <RoadmapView cards={cards} onCardClick={card => setModal({ mode: "edit", card })} />}
      </div>

      {modal && (
        <CardModal
          card={modal.mode === "edit" ? modal.card : { title: "", col: modal.defaultCol ?? "Backlog", tags: [], phase: 2 }}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{
        position: "fixed", bottom: 10, right: 14,
        fontSize: 10, color: "#333",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.08em"
      }}>
        v{VERSION}
      </div>
    </>
  );
}
