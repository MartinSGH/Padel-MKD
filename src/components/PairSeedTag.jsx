import PropTypes from "prop-types";

// Small admin tag next to a pair in the draw builders: its carrier number (if
// it's one of the top-ranked pairs) and its combined ranking points.
const PairSeedTag = ({ pair }) => (
  <>
    {pair.seed ? (
      <span className="admin-seed-badge" title="Carrier (seeded pair)">
        C{pair.seed}
      </span>
    ) : null}
    {pair.points != null && (
      <span className="admin-pair-points">{pair.points} pts</span>
    )}
  </>
);

PairSeedTag.propTypes = {
  pair: PropTypes.shape({
    seed: PropTypes.number,
    points: PropTypes.number,
  }).isRequired,
};

export default PairSeedTag;
