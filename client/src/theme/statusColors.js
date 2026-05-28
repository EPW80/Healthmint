// Single source of truth for status → className mappings.
//
// Multiple components (TransactionHistory, Dashboard activity feed, etc.)
// historically duplicated their own switch statements mapping status strings
// to Tailwind colors. That made palette changes a search-and-replace exercise
// and let the mappings drift apart. Consume from here instead.
//
// All classes resolve to semantic tokens (see tailwind.config.js + index.css)
// so they automatically follow light/dark theme.

// Canonical statuses. Components should normalize their raw status strings
// to one of these before looking up styles.
export const STATUS = Object.freeze({
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  INFO: "info",
  NEUTRAL: "neutral",
});

const BADGE_BASE =
  "inline-flex items-center px-2 py-0.5 rounded-token-sm text-xs font-medium";

// Soft tinted backgrounds with strong-tinted text — used for inline badges,
// chips, and pill labels next to data.
const SOFT_BADGE = {
  [STATUS.SUCCESS]: `${BADGE_BASE} bg-success-soft text-success`,
  [STATUS.PENDING]: `${BADGE_BASE} bg-warning-soft text-warning`,
  [STATUS.FAILED]: `${BADGE_BASE} bg-danger-soft text-danger`,
  [STATUS.INFO]: `${BADGE_BASE} bg-info-soft text-info`,
  [STATUS.NEUTRAL]: `${BADGE_BASE} bg-surface-raised text-fg-muted`,
};

// Bare text-color classes — used for status icons, inline status text inside
// table rows, or anywhere a chip would be too heavy.
const TEXT_ONLY = {
  [STATUS.SUCCESS]: "text-success",
  [STATUS.PENDING]: "text-warning",
  [STATUS.FAILED]: "text-danger",
  [STATUS.INFO]: "text-info",
  [STATUS.NEUTRAL]: "text-fg-muted",
};

// Solid backgrounds — for emphatic surfaces like progress bar fills or
// status dot indicators. Pair with text-* classes for contrast as needed.
const SOLID_BG = {
  [STATUS.SUCCESS]: "bg-success",
  [STATUS.PENDING]: "bg-warning",
  [STATUS.FAILED]: "bg-danger",
  [STATUS.INFO]: "bg-info",
  [STATUS.NEUTRAL]: "bg-fg-subtle",
};

// Map free-form / legacy status strings to the canonical set above.
// Add new aliases here, not in consumer components.
const ALIASES = {
  success: STATUS.SUCCESS,
  succeeded: STATUS.SUCCESS,
  completed: STATUS.SUCCESS,
  complete: STATUS.SUCCESS,
  verified: STATUS.SUCCESS,
  active: STATUS.SUCCESS,
  approved: STATUS.SUCCESS,

  pending: STATUS.PENDING,
  processing: STATUS.PENDING,
  in_progress: STATUS.PENDING,
  inprogress: STATUS.PENDING,
  awaiting: STATUS.PENDING,

  failed: STATUS.FAILED,
  failure: STATUS.FAILED,
  error: STATUS.FAILED,
  rejected: STATUS.FAILED,
  denied: STATUS.FAILED,
  cancelled: STATUS.FAILED,
  canceled: STATUS.FAILED,

  info: STATUS.INFO,
  scheduled: STATUS.INFO,
  draft: STATUS.INFO,

  unknown: STATUS.NEUTRAL,
  neutral: STATUS.NEUTRAL,
};

export const normalizeStatus = (raw) => {
  if (!raw) return STATUS.NEUTRAL;
  const key = String(raw).toLowerCase().trim();
  return ALIASES[key] || STATUS.NEUTRAL;
};

export const statusBadgeClass = (raw) => SOFT_BADGE[normalizeStatus(raw)];
export const statusTextClass = (raw) => TEXT_ONLY[normalizeStatus(raw)];
export const statusBgClass = (raw) => SOLID_BG[normalizeStatus(raw)];

const statusColors = {
  STATUS,
  normalizeStatus,
  statusBadgeClass,
  statusTextClass,
  statusBgClass,
};

export default statusColors;
