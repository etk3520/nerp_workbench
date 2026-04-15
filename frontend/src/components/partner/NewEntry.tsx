import { useCallback, useEffect, useRef, useState } from "react";
import { type EntryIn, draftSaveEntries, submitEntries } from "@/api/partnerEntries";

/* ── Data ── */
interface RowData {
  _rowId: string; _selected: boolean;
  category: string; project_name: string; project_pm: string; module: string;
  role: string; contract_company: string; belong_company: string; team: string;
  name: string; email: string; start_date: string; end_date: string; remark: string;
  req_pledge: boolean; req_ad: boolean; req_srbs: boolean;
}

const TEXT_COLS = [
  { key: "category", label: "구분", w: 80 },
  { key: "project_name", label: "과제명", w: 150 },
  { key: "project_pm", label: "과제PM", w: 100 },
  { key: "module", label: "모듈", w: 100 },
  { key: "role", label: "역할", w: 100 },
  { key: "contract_company", label: "계약 회사명", w: 130 },
  { key: "belong_company", label: "소속 회사명", w: 130 },
  { key: "team", label: "팀", w: 100 },
  { key: "name", label: "성명", w: 90 },
  { key: "email", label: "E-mail", w: 170 },
  { key: "start_date", label: "투입일", w: 110 },
  { key: "end_date", label: "종료일", w: 110 },
  { key: "remark", label: "비고", w: 150 },
] as const;
const TEXT_KEYS = TEXT_COLS.map((c) => c.key);
const CHK_COLS = [
  { key: "req_pledge", label: "서약서", w: 65 },
  { key: "req_ad", label: "AD", w: 50 },
  { key: "req_srbs", label: "S-RBS", w: 65 },
] as const;
const CHK_KEYS = CHK_COLS.map((c) => c.key);
// All navigable columns: _sel, _no, text cols, checkbox cols
const ALL_KEYS = ["_sel", "_no", ...TEXT_KEYS, ...CHK_KEYS];
const COL_SEL = 0;
const COL_NO = 1;
const COL_TEXT_START = 2;
const COL_TEXT_END = COL_TEXT_START + TEXT_KEYS.length - 1;
const COL_CHK_START = COL_TEXT_END + 1;
type Pos = { r: number; c: number };

function mkRow(): RowData {
  return {
    _rowId: Math.random().toString(36).slice(2) + Date.now().toString(36), _selected: false,
    category: "", project_name: "", project_pm: "", module: "", role: "",
    contract_company: "", belong_company: "", team: "",
    name: "", email: "", start_date: "", end_date: "", remark: "",
    req_pledge: false, req_ad: false, req_srbs: false,
  };
}

function bnd(a: Pos, b: Pos) {
  return { r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), c0: Math.min(a.c, b.c), c1: Math.max(a.c, b.c) };
}
function inRange(r: number, c: number, anc: Pos | null, foc: Pos | null) {
  if (!anc || !foc) return false;
  const b = bnd(anc, foc);
  return r >= b.r0 && r <= b.r1 && c >= b.c0 && c <= b.c1;
}

/* ── Component ── */
export default function NewEntry() {
  const [rows, setRows] = useState<RowData[]>([mkRow()]);
  const [active, setActive] = useState<Pos | null>(null);
  const [editing, setEditing] = useState<Pos | null>(null);
  const [anchor, setAnchor] = useState<Pos | null>(null);
  const [focus, setFocus] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [savedIds, setSavedIds] = useState<number[] | null>(null); // 임시저장된 id 목록

  const activeRef = useRef(active);
  const anchorRef = useRef(anchor);
  const focusRef = useRef(focus);
  const sampleSeqRef = useRef(parseInt(localStorage.getItem("sampleSeq") || "0", 10));
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);
  useEffect(() => { focusRef.current = focus; }, [focus]);

  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selCount = rows.filter((r) => r._selected).length;

  const setCell = (ri: number, key: string, val: string | boolean) =>
    setRows((p) => p.map((r, i) => (i === ri ? { ...r, [key]: val } : r)));

  const focusGrid = () => gridRef.current?.focus();
  const startEdit = (pos: Pos) => setEditing(pos);
  const stopEdit = () => { setEditing(null); focusGrid(); };
  const sel = (pos: Pos) => { setActive(pos); setEditing(null); setAnchor(pos); setFocus(null); };

  // Scroll active cell into view
  const scrollToCell = useCallback((r: number, c: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const td = grid.querySelector(`[data-r="${r}"][data-c="${c}"]`) as HTMLElement | null;
    if (td) td.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  /* ── Copy ── */
  const copyRange = useCallback(() => {
    const a = anchor, f = focus ?? active;
    if (!a || !f) return;
    const b = bnd(a, f);
    const lines: string[] = [];
    for (let r = b.r0; r <= b.r1; r++) {
      const cells: string[] = [];
      for (let c = b.c0; c <= b.c1; c++) {
        const key = ALL_KEYS[c];
        if (key === "_sel" || key === "_no") continue;
        const v = rows[r]?.[key as keyof RowData];
        cells.push(typeof v === "boolean" ? (v ? "Y" : "N") : (v as string) || "");
      }
      lines.push(cells.join("\t"));
    }
    const text = lines.join("\n");
    if (!text) return;
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    focusGrid();
  }, [anchor, focus, active, rows]);

  /* ── Paste ── */
  const pasteText = useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (!lines.length) return;
    const src = lines.map((l) => l.split("\t"));
    const srcR = src.length, srcC = Math.max(...src.map((r) => r.length));
    const cur = activeRef.current, anch = anchorRef.current, foc = focusRef.current;
    const hasRange = anch && foc && (anch.r !== foc.r || anch.c !== foc.c);

    // Paste targets in TEXT_KEYS index space (0-based into TEXT_KEYS)
    let tr0: number, textCol0: number, tRows: number, tCols: number;
    if (hasRange) {
      const b = bnd(anch!, foc!);
      tr0 = b.r0;
      textCol0 = Math.max(0, b.c0 - COL_TEXT_START);
      tRows = b.r1 - b.r0 + 1;
      tCols = b.c1 - b.c0 + 1;
    } else {
      tr0 = cur ? cur.r : 0;
      textCol0 = cur ? Math.max(0, cur.c - COL_TEXT_START) : 0;
      tRows = srcR; tCols = srcC;
    }
    setRows((prev) => {
      const next = [...prev];
      while (next.length < tr0 + tRows) next.push(mkRow());
      for (let r = 0; r < tRows; r++)
        for (let c = 0; c < tCols; c++) {
          const ci = textCol0 + c;
          if (ci >= TEXT_KEYS.length) continue;
          (next[tr0 + r] as unknown as Record<string, unknown>)[TEXT_KEYS[ci]] = (src[r % srcR]?.[c % srcC] ?? "").trim();
        }
      return next;
    });
    const np = { r: tr0 + tRows, c: Math.max(COL_TEXT_START, cur?.c ?? COL_TEXT_START) };
    setActive(np); setAnchor(np); setFocus(null);
    setSavedIds(null);
  }, []);

  /* ── Keyboard ── */
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !editing) { e.preventDefault(); copyRange(); return; }
      if (!active || editing) return;
      const maxC = ALL_KEYS.length - 1, maxR = rows.length - 1;
      const isChk = active.c >= COL_CHK_START;
      const isText = active.c >= COL_TEXT_START && active.c <= COL_TEXT_END;
      const isSel = active.c === COL_SEL;

      // Enter/Space on row-select checkbox → toggle row selection
      if ((e.key === "Enter" || e.key === " ") && isSel) {
        e.preventDefault();
        setRows((p) => p.map((r, i) => i === active.r ? { ...r, _selected: !r._selected } : r));
        return;
      }
      // Enter/Space on req checkbox → toggle
      if ((e.key === "Enter" || e.key === " ") && isChk) {
        e.preventDefault();
        const chkKey = ALL_KEYS[active.c];
        setRows((p) => p.map((r, i) => i === active.r ? { ...r, [chkKey]: !r[chkKey as keyof RowData] } : r));
        setSavedIds(null);
        return;
      }
      // Enter on text → edit
      if (e.key === "Enter" && isText) { e.preventDefault(); startEdit(active); return; }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const b = bnd(anchor ?? active, focus ?? active);
        setRows((p) => p.map((r, ri) => {
          if (ri < b.r0 || ri > b.r1) return r;
          const u = { ...r };
          for (let c = b.c0; c <= b.c1; c++) {
            const k = ALL_KEYS[c];
            if (c >= COL_TEXT_START && c <= COL_TEXT_END) (u as unknown as Record<string, unknown>)[k] = "";
            else (u as unknown as Record<string, unknown>)[k] = false;
          }
          return u;
        }));
        setSavedIds(null);
        return;
      }
      let nr = active.r, nc = active.c;
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); nr = Math.max(0, nr - 1); break;
        case "ArrowDown": e.preventDefault(); nr = Math.min(maxR, nr + 1); break;
        case "ArrowLeft": e.preventDefault(); nc = Math.max(0, nc - 1); break;
        case "ArrowRight": e.preventDefault(); nc = Math.min(maxC, nc + 1); break;
        case "Tab": e.preventDefault(); nc = e.shiftKey ? Math.max(0, nc - 1) : Math.min(maxC, nc + 1); break;
        default: return;
      }
      const np = { r: nr, c: nc };
      setActive(np);
      if (e.shiftKey && e.key.startsWith("Arrow")) setFocus(np);
      else { setAnchor(np); setFocus(null); }
      scrollToCell(nr, nc);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [active, editing, rows.length, anchor, focus, copyRange, scrollToCell]);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  /* ── Mouse ── */
  const onMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.shiftKey || e.button !== 0) return;
    setDragging(true); setAnchor({ r, c }); setFocus(null);
  };
  const onMouseEnter = (r: number, c: number) => { if (dragging) setFocus({ r, c }); };
  useEffect(() => { const up = () => setDragging(false); document.addEventListener("mouseup", up); return () => document.removeEventListener("mouseup", up); }, []);

  const lastClickRef = useRef<{ r: number; c: number; time: number } | null>(null);
  const onClick = (r: number, c: number, e: React.MouseEvent) => {
    focusGrid();
    if (e.shiftKey && active) { setFocus({ r, c }); return; }

    const now = Date.now();
    const last = lastClickRef.current;
    // True double-click: same cell, within 300ms
    if (last && last.r === r && last.c === c && now - last.time < 300) {
      lastClickRef.current = null;
      if (c >= COL_TEXT_START && c <= COL_TEXT_END) startEdit({ r, c });
      return;
    }
    lastClickRef.current = { r, c, time: now };
    sel({ r, c });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault(); pasteText(text);
  };

  /* ── Sample copy with auto-increment email ── */
  const onCopySample = () => {
    sampleSeqRef.current += 1;
    localStorage.setItem("sampleSeq", String(sampleSeqRef.current));
    const seq = String(sampleSeqRef.current).padStart(4, "0");
    const s = [
      "ITO", "N-ERP ITO 운영계약", "변사또", "재무(FI)", "설계", "삼성SDS", "미라콤",
      "회계관리그룹(ERP재무)", "이몽룡", `mongdragon.lee${seq}@samsung.com`, "2026-03-09", "9999-12-31", "",
    ].join("\t");
    const ta = document.createElement("textarea");
    ta.value = s; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    alert(`샘플 데이터가 복사되었습니다. (E-mail: mongdragon.lee${seq}@samsung.com)\n셀 클릭 후 Ctrl+V로 붙여넣기 하세요.`);
  };

  /* ── Row actions ── */
  const addRow = () => { setRows((p) => [...p, mkRow()]); setSavedIds(null); };
  const selAll = () => setRows((p) => p.map((r) => ({ ...r, _selected: true })));
  const deselAll = () => setRows((p) => p.map((r) => ({ ...r, _selected: false })));
  const delSel = () => {
    setRows((p) => { const n = p.filter((r) => !r._selected); return n.length ? n : [mkRow()]; });
    setActive(null); setEditing(null); setAnchor(null); setFocus(null); setSavedIds(null);
  };
  const toggleSel = (i: number) => setRows((p) => p.map((r, j) => (j === i ? { ...r, _selected: !r._selected } : r)));
  const allSel = rows.length > 0 && selCount === rows.length;
  const hasSel = selCount > 0;

  /* ── Draft save (임시저장) ── */
  const onDraftSave = async () => {
    const dataRows = rows.filter((r) => TEXT_KEYS.some((k) => (r[k as keyof RowData] as string)?.trim()));
    if (!dataRows.length) { alert("입력된 데이터가 없습니다."); return; }
    const entries: EntryIn[] = dataRows.map((r) => ({
      category: r.category || null, project_name: r.project_name || null,
      project_pm: r.project_pm || null, module: r.module || null, role: r.role || null,
      contract_company: r.contract_company || null, belong_company: r.belong_company || null,
      team: r.team || null, name: r.name || null, email: r.email || null,
      start_date: r.start_date || null, end_date: r.end_date || null, remark: r.remark || null,
      req_pledge: r.req_pledge, req_ad: r.req_ad, req_srbs: r.req_srbs,
    }));
    try {
      const res = await draftSaveEntries(entries);
      setSavedIds(res.ids);
      alert(`${res.count}건이 임시저장되었습니다.`);
    } catch (err) {
      alert((err as Error).message || "임시저장 실패");
    }
  };

  /* ── Submit (신청) ── */
  const onSubmit = async () => {
    if (!savedIds?.length) return;
    if (!confirm("신청 하시겠습니까?")) return;
    try {
      const res = await submitEntries(savedIds);
      alert(`${res.count}건이 신청되었습니다.`);
      setRows([mkRow()]); setActive(null); setEditing(null); setAnchor(null); setFocus(null); setSavedIds(null);
    } catch { alert("신청에 실패했습니다."); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <button onClick={addRow} style={S.btn}><span className="material-icons-outlined" style={S.ico}>add</span>행 추가</button>
        <button onClick={selAll} style={S.btn}><span className="material-icons-outlined" style={S.ico}>select_all</span>전체선택</button>
        <button onClick={deselAll} disabled={!hasSel} style={{ ...S.btn, opacity: hasSel ? 1 : 0.4, cursor: hasSel ? "pointer" : "default" }}>
          <span className="material-icons-outlined" style={S.ico}>deselect</span>선택해제</button>
        <button onClick={delSel} disabled={!hasSel}
          style={{ ...S.btn, color: hasSel ? "#e74c3c" : "var(--color-text-secondary)", opacity: hasSel ? 1 : 0.4, cursor: hasSel ? "pointer" : "default" }}>
          <span className="material-icons-outlined" style={S.ico}>delete_outline</span>삭제</button>
        <div style={S.sep} />
        <button onClick={onCopySample} style={{ ...S.btn, color: "var(--color-accent)" }}>
          <span className="material-icons-outlined" style={S.ico}>content_copy</span>샘플 데이터 복사</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>클릭→선택, 재클릭→편집 | 드래그/Shift→범위 | Ctrl+C/V</span>
      </div>

      {/* Grid */}
      <div ref={gridRef} tabIndex={0} style={{ flex: 1, overflow: "auto", outline: "none" }} onPaste={onPaste}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 40 }}>
                <input type="checkbox" checked={allSel} onChange={(e) => (e.target.checked ? selAll() : deselAll())} style={S.chk} />
              </th>
              <th style={{ ...S.th, width: 45 }}>No</th>
              {TEXT_COLS.map((col) => <th key={col.key} style={{ ...S.th, width: col.w, minWidth: col.w }}>{col.label}</th>)}
              {CHK_COLS.map((col) => <th key={col.key} style={{ ...S.th, width: col.w }}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row._rowId} style={{ background: row._selected ? "var(--color-surface-hover)" : undefined }}>
                <td data-r={ri} data-c={COL_SEL}
                  onClick={(e) => { onClick(ri, COL_SEL, e); }}
                  style={{ ...S.td, textAlign: "center", width: 40, boxShadow: active?.r === ri && active?.c === COL_SEL ? "inset 0 0 0 2px var(--color-accent)" : "none" }}>
                  <input type="checkbox" checked={row._selected} onChange={() => toggleSel(ri)} style={S.chk} tabIndex={-1} />
                </td>
                <td data-r={ri} data-c={COL_NO}
                  onClick={(e) => { onClick(ri, COL_NO, e); }}
                  style={{ ...S.td, textAlign: "center", width: 45, color: "var(--color-text-muted)", boxShadow: active?.r === ri && active?.c === COL_NO ? "inset 0 0 0 2px var(--color-accent)" : "none" }}>
                  {ri + 1}
                </td>
                {TEXT_COLS.map((col, i) => {
                  const ci = COL_TEXT_START + i;
                  const isAct = active?.r === ri && active?.c === ci;
                  const isRng = inRange(ri, ci, anchor, focus ?? active);
                  const isEdit = editing?.r === ri && editing?.c === ci;
                  const val = (row[col.key as keyof RowData] as string) || "";
                  return (
                    <td key={col.key} style={{ ...S.td, padding: 0, width: col.w, minWidth: col.w }} data-r={ri} data-c={ci}>
                      {isEdit ? (
                        <input ref={inputRef} type="text" value={val}
                          onChange={(e) => { setCell(ri, col.key, e.target.value); setSavedIds(null); }}
                          onBlur={stopEdit}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); stopEdit(); } if (e.key === "Escape") stopEdit(); }}
                          style={S.cellInput} />
                      ) : (
                        <div onClick={(e) => onClick(ri, ci, e)}
                          onMouseDown={(e) => onMouseDown(ri, ci, e)}
                          onMouseEnter={() => onMouseEnter(ri, ci)}
                          style={{
                            ...S.cellDiv,
                            background: isRng && !isAct ? "rgba(46,125,156,0.12)" : "transparent",
                            boxShadow: isAct ? "inset 0 0 0 2px var(--color-accent)" : "none",
                          }}>{val || "\u00A0"}</div>
                      )}
                    </td>
                  );
                })}
                {CHK_COLS.map((col, i) => {
                  const ci = COL_CHK_START + i;
                  const isAct = active?.r === ri && active?.c === ci;
                  return (
                    <td key={col.key} style={{ ...S.td, textAlign: "center", width: col.w }}
                      data-r={ri} data-c={ci}
                      onClick={(e) => { onClick(ri, ci, e); }}
                      onMouseDown={(e) => onMouseDown(ri, ci, e)}
                      onMouseEnter={() => onMouseEnter(ri, ci)}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: 36, boxShadow: isAct ? "inset 0 0 0 2px var(--color-accent)" : "none",
                      }}>
                        <input type="checkbox" checked={row[col.key]}
                          onChange={(e) => { setCell(ri, col.key, e.target.checked); setSavedIds(null); }}
                          style={S.chk} tabIndex={-1} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <button onClick={onDraftSave} style={S.draftBtn}>임시저장</button>
        <button onClick={onSubmit} disabled={!savedIds}
          style={{ ...S.submitBtn, opacity: savedIds ? 1 : 0.4, cursor: savedIds ? "pointer" : "default" }}>
          신청</button>
      </div>
    </div>
  );
}

const S = {
  toolbar: { padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--color-border-light)", background: "var(--color-surface)", flexWrap: "wrap" } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12, fontWeight: 500, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-surface)", color: "var(--color-text-secondary)", cursor: "pointer" } as React.CSSProperties,
  ico: { fontSize: 16 } as React.CSSProperties,
  sep: { borderLeft: "1px solid var(--color-border)", height: 20, margin: "0 4px" } as React.CSSProperties,
  table: { width: "max-content", minWidth: "100%", borderCollapse: "collapse", fontSize: 13 } as React.CSSProperties,
  th: { padding: "8px 6px", background: "var(--color-bg)", borderBottom: "2px solid var(--color-border)", borderRight: "1px solid var(--color-border)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1, textAlign: "center" } as React.CSSProperties,
  td: { padding: 0, borderBottom: "1px solid var(--color-border-light)", borderRight: "1px solid var(--color-border-light)", verticalAlign: "middle", height: 36 } as React.CSSProperties,
  cellDiv: { width: "100%", height: "36px", lineHeight: "36px", padding: "0 6px", cursor: "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxSizing: "border-box", userSelect: "none" } as React.CSSProperties,
  cellInput: { width: "100%", height: "36px", border: "none", boxShadow: "inset 0 0 0 2px var(--color-accent)", background: "#fff", fontSize: 13, padding: "4px 6px", fontFamily: "inherit", boxSizing: "border-box", display: "block" } as React.CSSProperties,
  chk: { cursor: "pointer", width: 16, height: 16 } as React.CSSProperties,
  footer: { padding: "12px 16px", borderTop: "1px solid var(--color-border)", background: "var(--color-surface)", display: "flex", justifyContent: "flex-end", gap: 12 } as React.CSSProperties,
  draftBtn: { padding: "8px 32px", fontSize: 14, fontWeight: 600, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer" } as React.CSSProperties,
  submitBtn: { padding: "8px 32px", fontSize: 14, fontWeight: 600, border: "none", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff", cursor: "pointer" } as React.CSSProperties,
};
