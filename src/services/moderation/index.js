import axiosInstance from '..';

const MODERATION_DECISIONS = ['ALLOW', 'WARN', 'REVIEW', 'BLOCK'];

const DECISION_KEYS = [
  'decision',
  'action',
  'moderation_action',
  'moderationAction',
  'moderation_status',
  'moderationStatus',
  'moderation_result',
  'moderationResult',
  'moderation_decision',
  'moderationDecision',
  'verdict',
  'outcome',
  'recommendation',
  'result',
  'label',
  'status',
];

const REASON_KEYS = [
  'reason',
  'reasons',
  'category',
  'categories',
  'violation',
  'violations',
  'labels',
  'policy',
  'policies',
  'flags',
  'rule',
  'rules',
];

const normalizeDecision = (value) => {
  const decision = String(value || '').trim().toUpperCase();
  return MODERATION_DECISIONS.includes(decision) ? decision : null;
};

const SAFE_REASON_CODES = new Set([
  'SAFE_APPROVED',
  'SAFE',
  'APPROVED',
  'NONE',
  'OK',
]);

const humanizeReason = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const code = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if (normalizeDecision(raw) || SAFE_REASON_CODES.has(code)) return '';
  const text = raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getModerationPayload = (response) => {
  const data = response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.decision === 'string' || Array.isArray(data.categories) || data.reason_code) {
      return data;
    }
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data;
    }
    return data;
  }
  return response && typeof response === 'object' ? response : {};
};

const SKIP_DECISION_STRING_KEYS = new Set(['message', 'error', 'msg', 'errorMessage']);

const findDecision = (node, depth = 0) => {
  if (node == null || depth > 5) return null;
  if (typeof node === 'string') return normalizeDecision(node);
  if (typeof node !== 'object') return null;

  const entries = Array.isArray(node)
    ? node.map(value => ['', value])
    : Object.entries(node);

  for (const [key, value] of entries) {
    if (DECISION_KEYS.includes(key) && typeof value === 'string') {
      const decision = normalizeDecision(value);
      if (decision) return decision;
    }
  }

  for (const [, value] of entries) {
    if (value && typeof value === 'object') {
      const decision = findDecision(value, depth + 1);
      if (decision) return decision;
    }
  }

  for (const [key, value] of entries) {
    if (typeof value === 'string' && !SKIP_DECISION_STRING_KEYS.has(key) && !DECISION_KEYS.includes(key)) {
      const decision = normalizeDecision(value);
      if (decision) return decision;
    }
  }

  return null;
};

const pushReason = (bucket, value) => {
  if (value == null) return;
  if (typeof value === 'string' || typeof value === 'number') {
    const reason = humanizeReason(value);
    if (reason) bucket.push(reason);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => pushReason(bucket, item));
    return;
  }
  if (typeof value === 'object') {
    pushReason(
      bucket,
      value.label || value.name || value.reason || value.category || value.title || value.message,
    );
  }
};

const collectReasons = (node, bucket, depth = 0) => {
  if (!node || typeof node !== 'object' || depth > 5) return;

  if (Array.isArray(node)) {
    node.forEach(item => {
      if (item && typeof item === 'object') collectReasons(item, bucket, depth + 1);
    });
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (REASON_KEYS.includes(key)) {
      pushReason(bucket, value);
    } else if (value && typeof value === 'object') {
      collectReasons(value, bucket, depth + 1);
    }
  }
};

const uniqueReasons = (reasons) => {
  const unique = [];
  const seen = new Set();
  reasons.forEach(reason => {
    const key = reason.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(reason);
  });
  return unique;
};

export const parseModerationResult = (response) => {
  const payload = getModerationPayload(response);
  const decision = normalizeDecision(payload?.decision)
    || (payload?.human_review_required === true ? 'REVIEW' : null)
    || findDecision(response);

  const reasons = [];
  if (Array.isArray(payload?.categories) && payload.categories.length) {
    pushReason(reasons, payload.categories);
  } else {
    pushReason(reasons, payload?.reason_code || payload?.reasonCode);
  }

  if (!reasons.length) {
    collectReasons(payload, reasons);
  }

  return {
    decision,
    reason: uniqueReasons(reasons).join('/'),
    humanReviewRequired: payload?.human_review_required === true,
  };
};

export const checkContentModeration = async (payload) => {
  return axiosInstance.post('v1/moderation/check', payload);
};
