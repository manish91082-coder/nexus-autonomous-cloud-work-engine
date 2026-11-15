/**
 * Phase 59.42 — GitHub secondary/primary rate-limit response classification.
 * Pure policy parser: it never retries or sends network requests.
 */
function readHeader(headers, name) {
  if (headers && typeof headers.get === "function") {
    const value = headers.get(name);
    return value === null ? undefined : value;
  }
  if (headers && typeof headers === "object") {
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key === undefined ? undefined : headers[key];
  }
  return undefined;
}

function integerHeader(headers, name) {
  const raw = readHeader(headers, name);
  if (raw === undefined || raw === null || raw === "") return null;
  if (!/^\d+$/.test(String(raw))) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function parseRetryAfter(value, nowEpoch) {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86400
      ? seconds : null;
  }
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return null;
  const seconds = Math.ceil(dateMs / 1000 - nowEpoch);
  return Math.max(0, Math.min(86400, seconds));
}

/**
 * GitHub uses 403/429 for primary and secondary limits. A permission-only 403
 * is not classified as rate limiting unless headers/body provide evidence.
 */
export function classifyGitHubRateLimitResponse({
  status, headers, message = "", nowEpoch = Math.floor(Date.now() / 1000)
}) {
  if (status !== 403 && status !== 429) {
    return { rateLimited: false, reason: "NOT_A_RATE_LIMIT_STATUS" };
  }
  if (!Number.isSafeInteger(nowEpoch) || nowEpoch < 0) {
    throw new TypeError("nowEpoch must be a non-negative safe integer");
  }

  const remaining = integerHeader(headers, "x-ratelimit-remaining");
  const resetAtEpoch = integerHeader(headers, "x-ratelimit-reset");
  const retryAfterSeconds = parseRetryAfter(readHeader(headers, "retry-after"), nowEpoch);
  const messageText = typeof message === "string" ? message.toLowerCase() : "";
  const messageSignalsLimit = /secondary rate limit|rate limit exceeded|abuse detection/.test(messageText);
  const primaryExhausted = remaining === 0 && resetAtEpoch !== null && resetAtEpoch > nowEpoch;
  const rateLimited = status === 429 || retryAfterSeconds !== null || primaryExhausted || messageSignalsLimit;

  if (!rateLimited) {
    return { rateLimited: false, reason: "FORBIDDEN_WITHOUT_RATE_LIMIT_EVIDENCE" };
  }

  const kind = primaryExhausted && retryAfterSeconds === null
    ? "PRIMARY_LIMIT"
    : "SECONDARY_LIMIT";
  const minimumWaitSeconds = kind === "SECONDARY_LIMIT"
    && retryAfterSeconds === null && !primaryExhausted ? 60 : 0;

  return {
    rateLimited: true,
    kind,
    status,
    retryAfterSeconds,
    resetAtEpoch: primaryExhausted ? resetAtEpoch : null,
    minimumWaitSeconds,
    reason: primaryExhausted
      ? "PRIMARY_REMAINING_ZERO"
      : retryAfterSeconds !== null
        ? "RETRY_AFTER_HEADER"
        : "SECONDARY_RATE_LIMIT_RESPONSE"
  };
}

/** Bounded exponential delay for repeated secondary-limit responses. */
export function secondaryBackoffSeconds(consecutiveHits, {
  baseSeconds = 60,
  maxSeconds = 900
} = {}) {
  if (!Number.isSafeInteger(consecutiveHits) || consecutiveHits < 1) {
    throw new TypeError("consecutiveHits must be a positive safe integer");
  }
  if (!Number.isSafeInteger(baseSeconds) || baseSeconds < 1
    || !Number.isSafeInteger(maxSeconds) || maxSeconds < baseSeconds) {
    throw new TypeError("invalid backoff bounds");
  }
  const exponent = Math.min(consecutiveHits - 1, 30);
  return Math.min(maxSeconds, baseSeconds * (2 ** exponent));
}
