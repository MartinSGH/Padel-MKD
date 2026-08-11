import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  getTournamentRegistrations,
  getPlayerDirectory,
  adminSetPair,
  adminAddPair,
  withdrawRegistration,
} from "../services/registrations";
import { updateTournament } from "../services/tournaments";
import { buildBracket, roundName } from "../lib/draw";
import {
  formatDateRange,
  isRegistrationDeadlinePassed,
} from "../lib/tournamentUtils";

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// How many first-round matches for n pairs: two-by-two, so an odd count leaves
// exactly one bye (never a bracket full of empty "/" slots).
const matchCountFor = (n) => Math.max(1, Math.ceil(n / 2));

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
  // Admin rescue (manual pairing of disqualified players after the deadline).
  const [rescuePartner, setRescuePartner] = useState({});
  const [rescueBusyId, setRescueBusyId] = useState(null);
  const [rescueMsg, setRescueMsg] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [deleteMsg, setDeleteMsg] = useState("");
  // Admin "add a pair" form.
  const [addPlayerMode, setAddPlayerMode] = useState("account"); // account | guest
  const [addPartnerMode, setAddPartnerMode] = useState("account");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addPlayerName, setAddPlayerName] = useState("");
  const [addPartnerId, setAddPartnerId] = useState("");
  const [addPartnerName, setAddPartnerName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  // Draw mode + manual drag & drop bracket.
  const [drawMode, setDrawMode] = useState("auto"); // auto | manual
  const [manualMatches, setManualMatches] = useState([]);

  const selectedTournament =
    tournaments.find((tn) => tn.id === selectedId) || null;

  const loadRegs = async (id) => {
    const [dir, regs] = await Promise.all([
      getPlayerDirectory().catch(() => []),
      getTournamentRegistrations(id).catch(() => []),
    ]);
    setDirectory(dir);
    setRegistrations(regs);
  };

  const handleSelect = async (id) => {
    setSelectedId(id);
    setBracket(null);
    setCategory("all");
    setPublishMsg("");
    setRescueMsg("");
    setRescuePartner({});
    setAddMsg("");
    setDrawMode("auto");
    setManualMatches([]);
    setPublished(!!tournaments.find((tn) => tn.id === id)?.draw);
    if (!id) {
      setRegistrations([]);
      return;
    }
    setLoading(true);
    try {
      await loadRegs(id);
    } finally {
      setLoading(false);
    }
  };

  const nameMap = new Map(
    directory.map((p) => [p.id, p.full_name || "Player"])
  );

  const nameFor = (id, storedName, fallback) =>
    storedName || (id ? nameMap.get(id) : null) || fallback;

  const pairLabel = (reg) => {
    const a = nameFor(reg.player_id, reg.player_name, "Player");
    const hasPartner = reg.partner_id || reg.partner_name;
    const b = hasPartner
      ? nameFor(reg.partner_id, reg.partner_name, "Player")
      : "—";
    return `${a} & ${b}`;
  };

  const categories = Array.from(
    new Set(registrations.map((reg) => reg.category).filter(Boolean))
  );

  // A pair counts as confirmed once it's accepted AND has a partner — either an
  // account partner (partner_id) or a guest partner (partner_name only).
  const isConfirmed = (reg) =>
    reg.partner_status === "accepted" &&
    (!!reg.partner_id || !!reg.partner_name);

  const filteredRegs =
    category === "all"
      ? registrations
      : registrations.filter((reg) => reg.category === category);

  // Competing pairs for the draw: ONLY confirmed pairs (solo / unpaired /
  // pending players are left out entirely). Guard against listing a player twice
  // (guests have no id, so we only dedupe on the ids that exist).
  const usedPlayers = new Set();
  const pairs = filteredRegs
    .filter(isConfirmed)
    .filter((reg) => {
      if (reg.player_id && usedPlayers.has(reg.player_id)) return false;
      if (reg.partner_id && usedPlayers.has(reg.partner_id)) return false;
      if (reg.player_id) usedPlayers.add(reg.player_id);
      if (reg.partner_id) usedPlayers.add(reg.partner_id);
      return true;
    })
    .map((reg) => ({ id: reg.id, label: pairLabel(reg) }));

  const handleGenerate = () => {
    setBracket(buildBracket(pairs));
  };

  // ---- Draw mode ----------------------------------------------------------
  // Reset the draw whenever the tournament or category changes.
  useEffect(() => {
    setDrawMode("auto");
    setManualMatches([]);
    setBracket(null);
  }, [selectedId, category]);

  const enterManual = () => {
    setManualMatches(
      Array.from({ length: matchCountFor(pairs.length) }, () => ({
        a: null,
        b: null,
      }))
    );
    setBracket(null);
    setDrawMode("manual");
  };

  const enterAuto = () => {
    setDrawMode("auto");
    setBracket(null);
  };

  const autoFillManual = () => {
    const ms = Array.from({ length: matchCountFor(pairs.length) }, () => ({
      a: null,
      b: null,
    }));
    pairs.forEach((p, i) => {
      ms[Math.floor(i / 2)][i % 2 === 0 ? "a" : "b"] = p;
    });
    setManualMatches(ms);
  };

  const clearManual = () => {
    setManualMatches((prev) => prev.map(() => ({ a: null, b: null })));
  };

  // Pairs not yet placed in a manual slot.
  const placedIds = new Set();
  manualMatches.forEach((m) => {
    if (m.a) placedIds.add(m.a.id);
    if (m.b) placedIds.add(m.b.id);
  });
  const poolPairs = pairs.filter((p) => !placedIds.has(p.id));
  const placedCount = pairs.length - poolPairs.length;

  const movePair = (pairId, targetIdx, targetSlot) => {
    setManualMatches((prev) => {
      const next = prev.map((m) => ({ ...m }));
      const pairObj = pairs.find((p) => p.id === pairId);
      if (!pairObj) return prev;
      // Where is it now (if already placed)?
      let curIdx = -1;
      let curSlot = null;
      next.forEach((m, i) => {
        if (m.a && m.a.id === pairId) {
          curIdx = i;
          curSlot = "a";
        }
        if (m.b && m.b.id === pairId) {
          curIdx = i;
          curSlot = "b";
        }
      });
      const occupant = next[targetIdx][targetSlot];
      next[targetIdx][targetSlot] = pairObj;
      if (curIdx >= 0) {
        // Moving from another slot → swap the occupant back into the old slot.
        next[curIdx][curSlot] = occupant || null;
      }
      // If it came from the pool, any occupant is simply bumped back to the pool.
      return next;
    });
  };

  const removeFromSlots = (pairId) => {
    setManualMatches((prev) =>
      prev.map((m) => ({
        a: m.a && m.a.id === pairId ? null : m.a,
        b: m.b && m.b.id === pairId ? null : m.b,
      }))
    );
  };

  const onChipDragStart = (e, pairId) => {
    e.dataTransfer.setData("text/plain", pairId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onSlotDrop = (e, idx, slot) => {
    e.preventDefault();
    const pairId = e.dataTransfer.getData("text/plain");
    if (pairId) movePair(pairId, idx, slot);
  };
  const onPoolDrop = (e) => {
    e.preventDefault();
    const pairId = e.dataTransfer.getData("text/plain");
    if (pairId) removeFromSlots(pairId);
  };
  const allowDrop = (e) => e.preventDefault();

  // Build a bracket object (same shape as the auto draw) from the manual matches.
  const buildManualBracket = () => {
    if (!manualMatches.length) return null;
    const rounds = [
      manualMatches.map((m) => ({ a: m.a || null, b: m.b || null })),
    ];
    let mc = manualMatches.length;
    while (mc > 1) {
      mc = Math.ceil(mc / 2);
      rounds.push(Array.from({ length: mc }, () => ({ a: null, b: null })));
    }
    return {
      size: manualMatches.length * 2,
      byes: manualMatches.length * 2 - placedCount,
      count: placedCount,
      rounds,
    };
  };

  const currentBracket = () =>
    drawMode === "manual" ? buildManualBracket() : bracket;
  // Empty first-round slots always read "/" (never "BYE"), in both draw modes.
  const emptyLabel = "/";

  // ---- Disqualified players (admin rescue) --------------------------------
  // After the deadline, any entry that isn't a confirmed pair is disqualified.
  const deadlinePassed =
    !!selectedTournament && isRegistrationDeadlinePassed(selectedTournament);
  const disqualified = registrations.filter((reg) => !isConfirmed(reg));

  // Players already locked in a confirmed pair (per category) can't be picked
  // as a rescue partner.
  const acceptedByCategory = new Map();
  registrations.forEach((reg) => {
    if (!isConfirmed(reg)) return;
    const key = reg.category || "";
    if (!acceptedByCategory.has(key)) acceptedByCategory.set(key, new Set());
    if (reg.player_id) acceptedByCategory.get(key).add(reg.player_id);
    if (reg.partner_id) acceptedByCategory.get(key).add(reg.partner_id);
  });
  const availablePartners = (reg) => {
    const taken = acceptedByCategory.get(reg.category || "") || new Set();
    return directory.filter((p) => p.id !== reg.player_id && !taken.has(p.id));
  };

  const handleRescue = async (reg, partnerId) => {
    if (!partnerId) return;
    setRescueBusyId(reg.id);
    setRescueMsg("");
    try {
      await adminSetPair(reg.id, partnerId);
      await loadRegs(selectedId);
      setRescuePartner((m) => ({ ...m, [reg.id]: "" }));
    } catch (err) {
      setRescueMsg(err.message || "Failed to add the pair.");
    } finally {
      setRescueBusyId(null);
    }
  };

  const handleDeleteReg = async (reg) => {
    const label = pairLabel(reg);
    const catTag = reg.category ? ` (${reg.category})` : "";
    if (
      !window.confirm(
        `Delete "${label}"${catTag} from this tournament? This only removes ` +
          `this entry — if the player is registered in another category, that ` +
          `entry stays.`
      )
    ) {
      return;
    }
    setDeleteBusyId(reg.id);
    setDeleteMsg("");
    try {
      await withdrawRegistration(reg.id);
      await loadRegs(selectedId);
    } catch (err) {
      setDeleteMsg(err.message || "Failed to delete the entry.");
    } finally {
      setDeleteBusyId(null);
    }
  };

  // Confirmed pairs currently in the tournament (any category) — each can be
  // deleted, including pairs added manually through the form above.
  const confirmedPairs = registrations.filter(isConfirmed);

  // ---- Add a pair ---------------------------------------------------------
  const addCategories =
    selectedTournament?.categories?.length
      ? selectedTournament.categories
      : categories;

  const handleAddPair = async (e) => {
    e.preventDefault();
    setAddMsg("");
    const payload = {
      tournamentId: selectedId,
      category: addCategory || null,
      playerId: addPlayerMode === "account" ? addPlayerId : null,
      playerName: addPlayerMode === "guest" ? addPlayerName.trim() : null,
      partnerId: addPartnerMode === "account" ? addPartnerId : null,
      partnerName: addPartnerMode === "guest" ? addPartnerName.trim() : null,
    };
    if (addPlayerMode === "account" && !payload.playerId) {
      setAddMsg("Pick the first player, or switch to a typed name.");
      return;
    }
    if (addPlayerMode === "guest" && !payload.playerName) {
      setAddMsg("Enter the first player's name.");
      return;
    }
    if (addPartnerMode === "account" && !payload.partnerId) {
      setAddMsg("Pick the partner, or switch to a typed name.");
      return;
    }
    if (addPartnerMode === "guest" && !payload.partnerName) {
      setAddMsg("Enter the partner's name.");
      return;
    }
    setAddBusy(true);
    try {
      await adminAddPair(payload);
      await loadRegs(selectedId);
      setAddPlayerId("");
      setAddPlayerName("");
      setAddPartnerId("");
      setAddPartnerName("");
      setAddMsg("Pair added.");
    } catch (err) {
      setAddMsg(err.message || "Failed to add the pair.");
    } finally {
      setAddBusy(false);
    }
  };

  // Serialize the bracket down to plain labels for storage / public display.
  const serializeBracket = (b) => ({
    generatedAt: new Date().toISOString(),
    size: b.size,
    byes: b.byes,
    count: b.count,
    category: category !== "all" ? category : null,
    rounds: b.rounds.map((round, ri) =>
      round.map((m) => ({
        // Empty first-round slots are stored as "/" (both modes) so the public
        // page shows exactly that instead of a "BYE".
        a: m.a ? m.a.label : ri === 0 ? "/" : null,
        b: m.b ? m.b.label : ri === 0 ? "/" : null,
      }))
    ),
  });

  const handlePublish = async () => {
    const b = currentBracket();
    if (!b || !selectedId) return;
    setPublishing(true);
    setPublishMsg("");
    try {
      await updateTournament(selectedId, { draw: serializeBracket(b) });
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
    const b = currentBracket();
    if (!b || !selectedTournament) return;

    const rows = b.rounds[0]
      .map((m, i) => {
        const a = m.a ? m.a.label : emptyLabel;
        const bb = m.b ? m.b.label : emptyLabel;
        return `<tr><td class="num">${i + 1}</td><td>${escapeHtml(
          a
        )}</td><td class="vs">vs</td><td>${escapeHtml(bb)}</td></tr>`;
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
  <p class="foot">${b.count} pairs · ${b.byes} bye(s) · bracket of ${b.size}</p>
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

  const canPublish =
    drawMode === "manual" ? placedCount >= 2 : !!bracket;

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

        {selectedId && !loading && (
          <div className="admin-rescue admin-addpair">
            <div className="admin-rescue-head">
              <h3>Add a pair</h3>
              <p>
                Manually add a confirmed pair. Pick each side from the registered
                players, or switch to “No account” to type a name for someone
                without a profile.
              </p>
            </div>

            <form className="admin-addpair-form" onSubmit={handleAddPair}>
              {addCategories.length > 0 && (
                <label className="admin-field">
                  <span>Category</span>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                  >
                    <option value="">No category</option>
                    {addCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="admin-addpair-side">
                <div className="admin-addpair-side-head">
                  <span>Player 1</span>
                  <div className="admin-addpair-modes">
                    <button
                      type="button"
                      className={`admin-mode-btn${
                        addPlayerMode === "account" ? " active" : ""
                      }`}
                      onClick={() => setAddPlayerMode("account")}
                    >
                      Account
                    </button>
                    <button
                      type="button"
                      className={`admin-mode-btn${
                        addPlayerMode === "guest" ? " active" : ""
                      }`}
                      onClick={() => setAddPlayerMode("guest")}
                    >
                      No account
                    </button>
                  </div>
                </div>
                {addPlayerMode === "account" ? (
                  <select
                    value={addPlayerId}
                    onChange={(e) => setAddPlayerId(e.target.value)}
                  >
                    <option value="">Select a player…</option>
                    {directory.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Name Last name"
                    value={addPlayerName}
                    onChange={(e) => setAddPlayerName(e.target.value)}
                  />
                )}
              </div>

              <div className="admin-addpair-side">
                <div className="admin-addpair-side-head">
                  <span>Partner</span>
                  <div className="admin-addpair-modes">
                    <button
                      type="button"
                      className={`admin-mode-btn${
                        addPartnerMode === "account" ? " active" : ""
                      }`}
                      onClick={() => setAddPartnerMode("account")}
                    >
                      Account
                    </button>
                    <button
                      type="button"
                      className={`admin-mode-btn${
                        addPartnerMode === "guest" ? " active" : ""
                      }`}
                      onClick={() => setAddPartnerMode("guest")}
                    >
                      No account
                    </button>
                  </div>
                </div>
                {addPartnerMode === "account" ? (
                  <select
                    value={addPartnerId}
                    onChange={(e) => setAddPartnerId(e.target.value)}
                  >
                    <option value="">Select a partner…</option>
                    {directory.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Name Last name"
                    value={addPartnerName}
                    onChange={(e) => setAddPartnerName(e.target.value)}
                  />
                )}
              </div>

              <button
                type="submit"
                className="admin-btn approve"
                disabled={addBusy}
              >
                {addBusy ? "Adding…" : "Add pair"}
              </button>
            </form>

            {addMsg && <p className="admin-draw-publish-msg">{addMsg}</p>}

            <div className="admin-addpair-list">
              <div className="admin-addpair-list-head">
                Current pairs ({confirmedPairs.length})
              </div>
              {confirmedPairs.length === 0 ? (
                <p className="admin-empty-state">No confirmed pairs yet.</p>
              ) : (
                <div className="admin-rescue-list">
                  {confirmedPairs.map((reg) => {
                    const deleting = deleteBusyId === reg.id;
                    return (
                      <div className="admin-rescue-row" key={reg.id}>
                        <div className="admin-rescue-info">
                          <strong>{pairLabel(reg)}</strong>
                          {reg.category && (
                            <span className="admin-rescue-tag">
                              {reg.category}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="admin-btn decline"
                          disabled={deleting}
                          onClick={() => handleDeleteReg(reg)}
                        >
                          {deleting ? "Deleting…" : "Delete pair"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {deleteMsg && (
              <p className="admin-draw-publish-msg">{deleteMsg}</p>
            )}
          </div>
        )}

        {selectedId && !loading && deadlinePassed && (
          <div className="admin-rescue">
            <div className="admin-rescue-head">
              <h3>Disqualified players</h3>
              <p>
                The deadline has passed. These players are hidden from the public
                list because they have no confirmed partner. Until the draw is
                published you can pair them up manually — confirm a pending
                request, pick a partner for a solo player, or delete an entry.
              </p>
            </div>

            {published ? (
              <p className="admin-empty-state">
                The draw is published. Remove it first (below) to rescue players,
                then re-publish.
              </p>
            ) : disqualified.length === 0 ? (
              <p className="admin-empty-state">
                No disqualified players — everyone has a confirmed partner.
              </p>
            ) : (
              <div className="admin-rescue-list">
                {disqualified.map((reg) => {
                  const playerName = nameFor(
                    reg.player_id,
                    reg.player_name,
                    "Player"
                  );
                  const catTag = reg.category ? ` · ${reg.category}` : "";
                  const busy = rescueBusyId === reg.id;
                  const deleting = deleteBusyId === reg.id;
                  const hasPartner = reg.partner_id || reg.partner_name;
                  // Pending pair: the invited partner never accepted.
                  if (hasPartner) {
                    const partnerName = nameFor(
                      reg.partner_id,
                      reg.partner_name,
                      "Player"
                    );
                    return (
                      <div className="admin-rescue-row" key={reg.id}>
                        <div className="admin-rescue-info">
                          <strong>
                            {playerName} &amp; {partnerName}
                          </strong>
                          <span className="admin-rescue-tag">
                            partner not accepted{catTag}
                          </span>
                        </div>
                        <div className="admin-rescue-actions">
                          {reg.partner_id && (
                            <button
                              type="button"
                              className="admin-btn approve"
                              disabled={busy || deleting}
                              onClick={() => handleRescue(reg, reg.partner_id)}
                            >
                              {busy ? "Confirming…" : "Confirm pair"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn decline"
                            disabled={busy || deleting}
                            onClick={() => handleDeleteReg(reg)}
                          >
                            {deleting ? "Deleting…" : "Delete from list"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  // Solo: admin assigns a partner.
                  const options = availablePartners(reg);
                  const chosen = rescuePartner[reg.id] || "";
                  return (
                    <div className="admin-rescue-row" key={reg.id}>
                      <div className="admin-rescue-info">
                        <strong>{playerName}</strong>
                        <span className="admin-rescue-tag">
                          no partner{catTag}
                        </span>
                      </div>
                      <div className="admin-rescue-actions">
                        <select
                          value={chosen}
                          onChange={(e) =>
                            setRescuePartner((m) => ({
                              ...m,
                              [reg.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select a partner…</option>
                          {options.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="admin-btn approve"
                          disabled={busy || deleting || !chosen}
                          onClick={() => handleRescue(reg, chosen)}
                        >
                          {busy ? "Adding…" : "Add & confirm"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn decline"
                          disabled={busy || deleting}
                          onClick={() => handleDeleteReg(reg)}
                        >
                          {deleting ? "Deleting…" : "Delete from list"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {rescueMsg && <p className="admin-draw-publish-msg">{rescueMsg}</p>}
            {deleteMsg && (
              <p className="admin-draw-publish-msg">{deleteMsg}</p>
            )}
          </div>
        )}

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

              <div className="admin-draw-modes">
                <button
                  type="button"
                  className={`admin-mode-btn${
                    drawMode === "auto" ? " active" : ""
                  }`}
                  onClick={enterAuto}
                >
                  Automatic
                </button>
                <button
                  type="button"
                  className={`admin-mode-btn${
                    drawMode === "manual" ? " active" : ""
                  }`}
                  onClick={enterManual}
                >
                  Manual
                </button>
              </div>

              {drawMode === "auto" && pairs.length >= 2 && (
                <button
                  type="button"
                  className="admin-btn approve"
                  onClick={handleGenerate}
                >
                  {bracket ? "Re-shuffle draw" : "Generate draw"}
                </button>
              )}

              {drawMode === "manual" && pairs.length >= 2 && (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-edit-btn"
                    onClick={autoFillManual}
                  >
                    Auto-fill
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-edit-btn"
                    onClick={clearManual}
                  >
                    Clear
                  </button>
                </>
              )}

              {canPublish && (
                <button
                  type="button"
                  className="admin-btn admin-edit-btn"
                  onClick={handlePrint}
                >
                  Export PDF
                </button>
              )}
              {canPublish && (
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
                At least 2 confirmed pairs are needed to generate a draw.
              </p>
            ) : drawMode === "manual" ? (
              <div className="admin-manual-draw">
                <div
                  className="admin-manual-pool"
                  onDragOver={allowDrop}
                  onDrop={onPoolDrop}
                >
                  <div className="admin-manual-pool-head">
                    Unplaced pairs ({poolPairs.length})
                  </div>
                  {poolPairs.length === 0 ? (
                    <span className="admin-manual-pool-empty">
                      All pairs placed.
                    </span>
                  ) : (
                    poolPairs.map((p) => (
                      <div
                        key={p.id}
                        className="admin-manual-chip"
                        draggable
                        onDragStart={(e) => onChipDragStart(e, p.id)}
                      >
                        {p.label}
                      </div>
                    ))
                  )}
                </div>

                <div className="admin-manual-matches">
                  {manualMatches.map((m, idx) => (
                    <div className="admin-manual-match" key={idx}>
                      <span className="admin-manual-match-num">{idx + 1}</span>
                      {["a", "b"].map((slot) => {
                        const pair = m[slot];
                        return (
                          <div
                            key={slot}
                            className={`admin-manual-slot${
                              pair ? " filled" : ""
                            }`}
                            onDragOver={allowDrop}
                            onDrop={(e) => onSlotDrop(e, idx, slot)}
                          >
                            {pair ? (
                              <div
                                className="admin-manual-chip"
                                draggable
                                onDragStart={(e) =>
                                  onChipDragStart(e, pair.id)
                                }
                              >
                                <span>{pair.label}</span>
                                <button
                                  type="button"
                                  className="admin-manual-remove"
                                  onClick={() => removeFromSlots(pair.id)}
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="admin-manual-empty">/</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
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
                              : emptyLabel
                            : "—"}
                        </span>
                        <span className="admin-bracket-slot">
                          {roundIdx === 0
                            ? m.b
                              ? m.b.label
                              : emptyLabel
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
