import PropTypes from "prop-types";

// Small admin tag next to a pair in the draw builders: its carrier number, if
// it's one of the top-ranked pairs.
const PairSeedTag = ({ pair }) =>
  pair.seed ? (
    <span className="admin-seed-badge" title="Carrier (seeded pair)">
      C{pair.seed}
    </span>
  ) : null;

PairSeedTag.propTypes = {
  pair: PropTypes.shape({
    seed: PropTypes.number,
  }).isRequired,
};

export default PairSeedTag;
