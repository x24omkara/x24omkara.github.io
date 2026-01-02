import React, { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type Stage = "e-RA" | "LOA" | "PPA" | "COD" | "NA";

type BidRow = {
  id: string;
  authorityName: string;
  authorityLevel: string;
  tenderCapacityMW: number | null;
  category: string;
  type: string;
  connectivity: string;
  rfsNo: string;
  rfsDate: Date | null;
  rfsFY: string;
  eRaDate: Date | null;
  eRaFY: string;
  company: string;
  groupCompany: string;
  wonCapacityMW: number | null;
  finalTariff: number | null;
  initialTariff: number | null;
  statusRaw: string;
  stage: Stage;
  signedPpaCapMW: number | null;
  remarks: string;
  bidCapacityMW: number | null;
  biddingResult: string;
  anySuccess: boolean | null;
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function safeTrim(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(v: unknown): number | null {
  const s = safeTrim(v);
  if (!s) return null;
  const x = Number(s.replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
}

function parseYesNo(v: unknown): boolean | null {
  const s = safeTrim(v).toLowerCase();
  if (!s) return null;
  if (["yes", "y", "true"].includes(s)) return true;
  if (["no", "n", "false"].includes(s)) return false;
  return null;
}

function parseDateFlexible(v: unknown): Date | null {
  const s = safeTrim(v);
  if (!s) return null;

  const native = new Date(s);
  if (!Number.isNaN(native.getTime())) return native;

  const m1 = s.match(/^\s*(\d{1,2})[- ]([A-Za-z]{3,9})[- ](\d{2,4})\s*$/);
  if (m1) {
    const day = Number(m1[1]);
    const monStr = m1[2].toLowerCase();
    const month = MONTHS[monStr] ?? MONTHS[monStr.slice(0, 3)];
    let year = Number(m1[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month != null) {
      const d = new Date(year, month, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const m2 = s.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/);
  if (m2) {
    const a = Number(m2[1]);
    const b = Number(m2[2]);
    let year = Number(m2[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const month = a <= 12 ? a - 1 : b - 1;
    const day = a <= 12 ? b : a;
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtNum(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtMW(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} MW`;
}

function deriveStage(statusRaw: string): Stage {
  const s = safeTrim(statusRaw).toLowerCase();
  if (!s || s === "not applicable") return "NA";
  if (s.includes("cod")) return "COD";
  if (s.includes("ppa")) return "PPA";
  if (s.includes("loa")) return "LOA";
  if (s.includes("e-ra") || s.includes("era") || s.includes("e ra")) return "e-RA";
  return "NA";
}

function groupBy<T>(arr: T[], keyFn: (x: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = keyFn(item) || "—";
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

function monthKey(d: Date | null): string {
  if (!d) return "Unknown";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function normalizeKey(s: string) {
  return safeTrim(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// very small CSV/TSV parser
function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const first = lines[0];
  const commas = (first.match(/,/g) || []).length;
  const tabs = (first.match(/\t/g) || []).length;
  const delimiter = tabs > commas ? "\t" : ",";

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === delimiter && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function rowsToBidRows(headers: string[], rows: string[][]): BidRow[] {
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = normalizeKey(h);
    if (idx[k] == null) idx[k] = i;
  });

  const get = (r: string[], key: string): string => {
    const i = idx[normalizeKey(key)];
    return i != null ? safeTrim(r[i]) : "";
  };

  // handle duplicate "Bidding Authority"
  const baCols = headers
    .map((h, i) => ({ h, i }))
    .filter((x) => normalizeKey(x.h) === "bidding authority")
    .map((x) => x.i);
  const baNameIdx = baCols[0];
  const baLevelIdx = baCols[1];

  return rows
    .map((r, ridx) => {
      const authorityName = safeTrim(r[baNameIdx ?? -1] ?? "");
      const authorityLevel = safeTrim(r[baLevelIdx ?? -1] ?? "");
      const statusRaw = get(r, "Status (e-RA/LOA/PPA/COD)");
      const stage = deriveStage(statusRaw);

      const row: BidRow = {
        id: `${authorityName || "NA"}__${get(r, "RFS No.") || "NA"}__${get(r, "Company") || "NA"}__${ridx}`,
        authorityName: authorityName || get(r, "Bidding Authority") || "—",
        authorityLevel: authorityLevel || "—",
        tenderCapacityMW: toNumber(get(r, "Tender Capacity")),
        category: get(r, "Category") || "—",
        type: get(r, "Type") || "—",
        connectivity: get(r, "Connectivity") || "—",
        rfsNo: get(r, "RFS No.") || "—",
        rfsDate: parseDateFlexible(get(r, "RFS Date")),
        rfsFY: get(r, "RFS Financial Year") || "—",
        eRaDate: parseDateFlexible(get(r, "eRA")),
        eRaFY: get(r, "Financial Year") || "—",
        company: get(r, "Company") || "—",
        groupCompany: get(r, "Group Company") || get(r, "Company") || "—",
        wonCapacityMW: toNumber(get(r, "Won Capacity")),
        finalTariff: toNumber(get(r, "Final Tariff")),
        initialTariff: toNumber(get(r, "Initial Tariff")),
        statusRaw: statusRaw || "—",
        stage,
        signedPpaCapMW: toNumber(get(r, "Signed PPA Cap. (MW)")),
        remarks: get(r, "Remarks"),
        bidCapacityMW: toNumber(get(r, "Bid Capacity")),
        biddingResult: get(r, "Bidding Result") || "—",
        anySuccess: parseYesNo(get(r, "Any Success")),
      };

      if (!safeTrim(row.authorityName) && !safeTrim(row.rfsNo) && !safeTrim(row.company)) {
        return null;
      }
      return row;
    })
    .filter((x): x is BidRow => x !== null);
}

function weightedAverage(values: Array<{ v: number | null; w: number | null }>): number | null {
  let sum = 0;
  let wsum = 0;
  for (const { v, w } of values) {
    if (v == null || w == null) continue;
    if (!Number.isFinite(v) || !Number.isFinite(w) || w <= 0) continue;
    sum += v * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : null;
}

// small demo sample
const SAMPLE: BidRow[] = [
  {
    id: "APTransco__APTRANSCO-1 GW-2GWh__Ecoren__1",
    authorityName: "APTransco",
    authorityLevel: "State",
    tenderCapacityMW: 1000,
    category: "ESS/BESS",
    type: "BESS",
    connectivity: "STU",
    rfsNo: "APTRANSCO-1 GW-2GWh-BESS+VGF-18LMWh",
    rfsDate: parseDateFlexible("25-Aug-25"),
    rfsFY: "FY 2026",
    eRaDate: parseDateFlexible("29-Nov-25"),
    eRaFY: "FY 2026",
    company: "Ecoren Energy",
    groupCompany: "Ecoren Energy",
    wonCapacityMW: 275,
    finalTariff: 1.5,
    initialTariff: null,
    statusRaw: "e-RA",
    stage: "e-RA",
    signedPpaCapMW: null,
    remarks: "",
    bidCapacityMW: 50,
    biddingResult: "Partial Capacity Won",
    anySuccess: true,
  },
  // add more rows as needed...
];

export default function App() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rawText, setRawText] = useState("");
  const [data, setData] = useState<BidRow[]>(SAMPLE);
  const [parseError, setParseError] = useState<string | null>(null);

  const [authorityFilter, setAuthorityFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  function loadFromText(text: string) {
    try {
      const { headers, rows } = parseDelimited(text);
      if (!headers.length) {
        setParseError("No header row detected.");
        return;
      }
      const parsed = rowsToBidRows(headers, rows);
      if (!parsed.length) {
        setParseError("Parsed 0 rows. Check delimiter and header names.");
        return;
      }
      setParseError(null);
      setData(parsed);
    } catch (e: any) {
      setParseError(e?.message || "Parse failed.");
    }
  }

  function onUploadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result ?? "");
      setRawText(txt);
      loadFromText(txt);
    };
    reader.readAsText(file);
  }

  const options = useMemo(() => {
    const auth = Array.from(new Set(data.map((d) => d.authorityName))).filter(Boolean).sort();
    const cat = Array.from(new Set(data.map((d) => d.category))).filter(Boolean).sort();
    const stg = Array.from(new Set(data.map((d) => d.stage))).filter(Boolean).sort();
    return { auth, cat, stg };
  }, [data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return data.filter((d) => {
      if (authorityFilter !== "All" && d.authorityName !== authorityFilter) return false;
      if (categoryFilter !== "All" && d.category !== categoryFilter) return false;
      if (stageFilter !== "All" && d.stage !== stageFilter) return false;

      if (s) {
        const hay = [
          d.authorityName,
          d.category,
          d.type,
          d.connectivity,
          d.rfsNo,
          d.company,
          d.groupCompany,
          d.statusRaw,
          d.biddingResult,
          d.remarks,
        ]
          .join(" | ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }

      return true;
    });
  }, [data, authorityFilter, categoryFilter, stageFilter, search]);

  const kpis = useMemo(() => {
    const totalRows = filtered.length;
    const totalBid = filtered.reduce((a, d) => a + (d.bidCapacityMW ?? 0), 0);
    const totalWon = filtered.reduce((a, d) => a + (d.wonCapacityMW ?? 0), 0);
    const successes = filtered.filter((d) => d.anySuccess === true).length;
    const byTender = groupBy(filtered, (d) => d.rfsNo);
    const tenderCount = Object.keys(byTender).length;
    const tenderCap = Object.values(byTender).reduce((a, rows) => {
      const first = rows.find((r) => r.tenderCapacityMW != null)?.tenderCapacityMW ?? 0;
      return a + first;
    }, 0);
    const wAvgTariff = weightedAverage(
      filtered.map((d) => ({ v: d.finalTariff, w: d.wonCapacityMW }))
    );
    const winRate = totalRows > 0 ? (successes / totalRows) * 100 : 0;

    return { totalRows, totalBid, totalWon, successes, tenderCount, tenderCap, wAvgTariff, winRate };
  }, [filtered]);

  const wonByGroup = useMemo(() => {
    const by = groupBy(filtered, (d) => d.groupCompany || d.company);
    return Object.entries(by)
      .map(([name, rows]) => ({
        name,
        won: rows.reduce((a, r) => a + (r.wonCapacityMW ?? 0), 0),
      }))
      .filter((x) => x.won > 0)
      .sort((a, b) => b.won - a.won)
      .slice(0, 10);
  }, [filtered]);

  const wAvgTariffByMonth = useMemo(() => {
    const by = groupBy(filtered, (d) => monthKey(d.eRaDate));
    const keys = Object.keys(by).sort();
    return keys.map((k) => {
      const rows = by[k];
      const wAvg = weightedAverage(rows.map((r) => ({ v: r.finalTariff, w: r.wonCapacityMW })));
      const won = rows.reduce((a, r) => a + (r.wonCapacityMW ?? 0), 0);
      return { month: k, wAvgTariff: wAvg ?? 0, won };
    });
  }, [filtered]);

  return (
    <div style={{ minHeight: "100vh", padding: "16px", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Competitor Intelligence</div>
            <h1 style={{ fontSize: 24, margin: "4px 0" }}>Bidding Action Dashboard</h1>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Upload / paste your bidding tracker and explore wins, tariffs, participation and stage progression.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", background: "#f8fafc", cursor: "pointer" }}
              onClick={() => {
                setData(SAMPLE);
                setRawText("");
                setParseError(null);
              }}
            >
              Use sample
            </button>
            <button
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2563eb", background: "#2563eb", color: "white", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}
            >
              Upload CSV/TSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </header>

        {/* Paste area */}
        <section style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Paste CSV/TSV and click Load.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #d4d4d8", background: "#f4f4f5", cursor: "pointer", fontSize: 12 }}
                onClick={() => {
                  navigator.clipboard
                    .readText()
                    .then((t) => setRawText(t))
                    .catch(() => {});
                }}
              >
                Paste from clipboard
              </button>
              <button
                style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #16a34a", background: "#16a34a", color: "white", cursor: "pointer", fontSize: 12 }}
                onClick={() => loadFromText(rawText)}
              >
                Load
              </button>
            </div>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste CSV/TSV here (with header row)…"
            style={{
              width: "100%",
              minHeight: 140,
              borderRadius: 12,
              padding: 8,
              fontSize: 12,
              border: "1px solid #e5e7eb",
              resize: "vertical",
            }}
          />
          {parseError ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{parseError}</div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
              Loaded rows: <strong>{data.length}</strong>
            </div>
          )}
        </section>

        {/* Filters */}
        <section style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Filters</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Authority</div>
              <select
                value={authorityFilter}
                onChange={(e) => setAuthorityFilter(e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d4d4d8", fontSize: 12 }}
              >
                <option>All</option>
                {options.auth.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Category</div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d4d4d8", fontSize: 12 }}
              >
                <option>All</option>
                {options.cat.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Stage</div>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d4d4d8", fontSize: 12 }}
              >
                <option>All</option>
                {options.stg.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Search</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Authority / tender / company…"
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #d4d4d8", fontSize: 12 }}
              />
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Showing <strong>{filtered.length}</strong> rows (of {data.length})
          </div>
        </section>

        {/* KPIs */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <Kpi title="Unique tenders" value={kpis.tenderCount.toLocaleString()} sub={`Tendered capacity ≈ ${kpis.tenderCap.toLocaleString()} MW`} />
          <Kpi
            title="Participation rows"
            value={kpis.totalRows.toLocaleString()}
            sub={`Success rows: ${kpis.successes.toLocaleString()} (${fmtNum(kpis.winRate, 1)}%)`}
          />
          <Kpi
            title="Total bid capacity"
            value={kpis.totalBid.toLocaleString() + " MW"}
            sub="Sum of Bid Capacity across visible rows"
          />
          <Kpi
            title="Total won capacity"
            value={kpis.totalWon.toLocaleString() + " MW"}
            sub={`Won-weighted avg tariff: ${fmtNum(kpis.wAvgTariff, 3)}`}
          />
        </section>

        {/* Charts */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          <div style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 12, height: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Top winners (by won MW)</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wonByGroup} margin={{ top: 10, right: 10, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" name="Won (MW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 12, height: 320 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Tariff trend (won-weighted)</div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wAvgTariffByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="wAvgTariff" name="Weighted avg tariff" dot={false} />
                <Line type="monotone" dataKey="won" name="Won (MW)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Table */}
        <section style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Detail table</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["eRA date", "Authority", "Category", "Type", "Stage", "Group", "Bid (MW)", "Won (MW)", "Final tariff"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{fmtDate(r.eRaDate)}</td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>
                      <div>{r.authorityName}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{r.connectivity}</div>
                    </td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{r.category}</td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{r.type}</td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{r.stage}</td>
                    <td style={{ padding: "4px 8px", minWidth: 160 }}>
                      <div>{r.groupCompany}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>{r.company}</div>
                    </td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{fmtNum(r.bidCapacityMW, 2)}</td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{fmtNum(r.wonCapacityMW, 2)}</td>
                    <td style={{ padding: "4px 8px", whiteSpace: "nowrap" }}>{fmtNum(r.finalTariff, 3)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 12, textAlign: "center", opacity: 0.7 }}>
                      No rows match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer style={{ fontSize: 11, opacity: 0.6, paddingBottom: 16 }}>
          Notes: (1) Weighted average tariff uses won capacity as weights. (2) Tendered capacity is approximated as sum of the
          first tender capacity per RFS No. (3) Duplicate "Bidding Authority" columns are treated as name + level.
        </footer>
      </div>
    </div>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
