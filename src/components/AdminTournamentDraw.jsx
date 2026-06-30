import { useState } from "react";
import PropTypes from "prop-types";
import {
  getTournamentRegistrations,
  getPlayerDirectory,
} from "../services/registrations";
import { updateTournament } from "../services/tournaments";
import { buildBracket, roundName } from "../lib/draw";
import { formatDateRange } from "../lib/tournamentUtils";

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const AdminTournamentDraw = ({ tournaments }) => {
  const [selectedId, setSelectedId] = useState("");
  const [directory, setDirectory] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("all");
  const [bracket, setBracket] = useState(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  const selectedTournament =
    tournaments.find((tn) => tn.id === selectedId) || null;

  const handleSelect = async (id) => {
    setSelectedId(id);
    setBracket(null);
    setCategory("all");
    setPublishMsg("");
    setPublished(!!tournaments.find((tn) => tn.id === id)?.draw);
    if (!id) {
      setRegistrations([]);
      return;
    }
    setLoading(true);
    try {
      const [dir, regs] = await Promise.all([
        getPlayerDirectory().catch(() => []),
        getTournamentRegistrations(id).catch(() => []),
      ]);
      setDirectory(dir);
      setRegistrations(regs);
    } finally {
      setLoading(false);
    }
  };

  const nameMap = new Map(
    directory.map((p) => [p.id, p.full_name || "Player"])
  );

  const pairLabel = (reg) => {
    const a = reg.player_name || nameMap.get(reg.player_id) || "Player";
    const b = reg.partner_id
      ? reg.partner_name || nameMap.get(reg.partner_id) || "Player"
      : "—";
    return `${a} & ${b}`;
  };

  const categories = Array.from(
    new Set(registrations.map((reg) => reg.category).filter(Boolean))
  );

  const filteredRegs =
    category === "all"
      ? registrations
      : registrations.filter((reg) => reg.category === category);

  const pairs = filteredRegs.map((reg) => ({
    id: reg.id,
    label: pairLabel(reg),
  }));

  const handleGenerate = () => {
    setBracket(buildBracket(pairs));
  };

  // Serialize the bracket down to plain labels for storage / public display.
  const serializeBracket = (b) => ({
    generatedAt: new Date().toISOString(),
    size: b.size,
    byes: b.byes,
    count: b.count,
    category: category !== "all" ? category : null,
    rounds: b.rounds.map((round) =>
      round.map((m) => ({
        a: m.a ? m.a.label : null,
        b: m.b ? m.b.label : null,
      }))
    ),
  });

  const handlePublish = async () => {
    if (!bracket || !selectedId) return;
    setPublishing(true);
    setPublishMsg("");
    try {
      await updateTournament(selectedId, { draw: serializeBracket(bracket) });
      setPublished(true);
      setPublishMsg(
        "Draw published — it's now visible to everyone on the tournament page."
      );
    } catch (err) {
      setPublishMsg(err.message || "Failed to publish draw.");
    } finally {
      setPublishing(false);
    }
  };

  const handleRemovePublished = async () => {
    if (!selectedId) return;
    setPublishing(true);
    setPublishMsg("");
    try {
      await updateTournament(selectedId, { draw: null });
      setPublished(false);
      setPublishMsg("Published draw removed.");
    } catch (err) {
      setPublishMsg(err.message || "Failed to remove draw.");
    } finally {
      setPublishing(false);
    }
  };

  const handlePrint = () => {
    if (!bracket || !selectedTournament) return;

    const rows = bracket.rounds[0]
      .map((m, i) => {
        const a = m.a ? m.a.label : "BYE";
        const b = m.b ? m.b.label : "BYE";
        return `<tr><td class="num">${i + 1}</td><td>${escapeHtml(
          a
        )}</td><td class="vs">vs</td><td>${escapeHtml(b)}</td></tr>`;
      })
      .join("");

    const dateStr = formatDateRange(
      selectedTournament.start_date,
      selectedTournament.end_date,
      "en"
    );
    const meta = [
      dateStr,
      selectedTournament.location,
      category !== "all" ? category : null,
    ]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" · ");

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Draw - ${escapeHtml(selectedTournament.name)}</title>
<style>
  body { font-family: Arial, "Segoe UI", sans-serif; color: #111; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #b8860b; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; font-size: 12px; margin: 0 0 18px; }
  .name { font-size: 16px; font-weight: bold; margin: 0 0 4px; }
  .meta { color: #555; font-size: 13px; margin: 0 0 22px; }
  h2 { font-size: 14px; margin: 0 0 8px; border-bottom: 2px solid #111; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 14px; }
  td.num { width: 42px; color: #999; font-weight: bold; }
  td.vs { width: 42px; text-align: center; color: #999; font-style: italic; }
  .foot { margin-top: 22px; font-size: 12px; color: #888; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Padel Federation of Macedonia</h1>
  <p class="sub">Tournament Draw · Жреб</p>
  <p class="name">${escapeHtml(selectedTournament.name)}</p>
  <p class="meta">${meta}</p>
  <h2>First Round</h2>
  <table>${rows}</table>
  <p class="foot">${pairs.length} pairs · ${bracket.byes} bye(s) · bracket of ${bracket.size}</p>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=720");
    if (!w) {
      alert("Please allow pop-ups to export the draw PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const tournamentsWithRegs = tournaments; // admin can pick any tournament

  return (
    <div className="admin-card admin-draw-card">
      <div className="admin-card-header">
        <div>
          <h2>Tournament Draw</h2>
          <p>
            Generate a random single-elimination draw from the registered pairs
            and export it as a printable PDF.
          </p>
        </div>
      </div>

      <div className="admin-draw-body">
        <div className="admin-draw-controls">
          <label className="admin-field">
            <span>Tournament</span>
            <select
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Select a tournament…</option>
              {tournamentsWithRegs.map((tn) => (
                <option key={tn.id} value={tn.id}>
                  {tn.name}
                </option>
              ))}
            </select>
          </label>

          {categories.length > 0 && (
            <label className="admin-field">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setBracket(null);
                }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {selectedId && (
          <>
            <div className="admin-draw-summary">
              <span className="admin-count-pill">
                {pairs.length} pairs
                {category !== "all" ? ` · ${category}` : ""}
              </span>
              {published && (
                <span className="admin-tournament-status admin-tournament-status-active">
                  Published
                </span>
              )}
              {pairs.length >= 2 && (
                <button
                  type="button"
                  className="admin-btn approve"
                  onClick={handleGenerate}
                >
                  {bracket ? "Re-shuffle draw" : "Generate draw"}
                </button>
              )}
              {bracket && (
                <button
                  type="button"
                  className="admin-btn admin-edit-btn"
                  onClick={handlePrint}
                >
                  Export PDF
                </button>
              )}
              {bracket && (
                <button
                  type="button"
                  className="admin-btn approve"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing
                    ? "Publishing…"
                    : published
                      ? "Re-publish draw"
                      : "Publish draw"}
                </button>
              )}
              {published && (
                <button
                  type="button"
                  className="admin-btn decline"
                  onClick={handleRemovePublished}
                  disabled={publishing}
                >
                  Remove published
                </button>
              )}
            </div>

            {publishMsg && (
              <p className="admin-draw-publish-msg">{publishMsg}</p>
            )}

            {loading ? (
              <p className="admin-empty-state">Loading registrations…</p>
            ) : pairs.length < 2 ? (
              <p className="admin-empty-state">
                At least 2 registered pairs are needed to generate a draw.
              </p>
            ) : !bracket ? (
              <p className="admin-empty-state">
                Click “Generate draw” to create the bracket.
              </p>
            ) : (
              <div className="admin-bracket">
                {bracket.rounds.map((round, roundIdx) => (
                  <div className="admin-bracket-col" key={roundIdx}>
                    <div className="admin-bracket-round">
                      {roundName(round.length)}
                    </div>
                    {round.map((m, i) => (
                      <div className="admin-bracket-match" key={i}>
                        <span className="admin-bracket-slot">
                          {roundIdx === 0
                            ? m.a
                              ? m.a.label
                              : "BYE"
                            : "—"}
                        </span>
                        <span className="admin-bracket-slot">
                          {roundIdx === 0
                            ? m.b
                              ? m.b.label
                              : "BYE"
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

AdminTournamentDraw.propTypes = {
  tournaments: PropTypes.array.isRequired,
};

export default AdminTournamentDraw;
