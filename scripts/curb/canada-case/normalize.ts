/** Evidence normalization only: no access verdict, unit conversion, or inferred value. */
export interface NormalizedMeasurement {
  raw: string;
  unit: string;
  lower: number | null;
  upper: number | null;
}

const missing = /^(?:|N\/?A|UNKNOWN|NOT\s+(?:MEASURED|RECORDED)|UNDER\s+CONSTRUCTION|REF)$/i;
const decimal = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";

export function normalizeMeasurement(raw: string, unit: string): NormalizedMeasurement {
  if (typeof raw !== "string" || typeof unit !== "string" || !unit.trim()) {
    throw new Error("Measurement requires raw text and a named unit");
  }
  const text = raw.trim();
  if (missing.test(text)) return { raw, unit, lower: null, upper: null };
  const suffix = unit === "%" ? "%" : unit === "in" ? '(?:in(?:ches)?|["″])' : unit === "ft" ? "(?:ft|feet|foot|['′])" : unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^(${decimal})\\s*(?:${suffix})?\\s*(?:(?:-|–|—|to)\\s*(${decimal})\\s*(?:${suffix})?)?$`, "i");
  const match = pattern.exec(text);
  if (!match) throw new Error(`Unsupported measurement syntax: ${JSON.stringify(raw)}`);
  const lower = Number(match[1]);
  const upper = match[2] === undefined ? lower : Number(match[2]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || lower > upper) {
    throw new Error(`Invalid measurement interval: ${JSON.stringify(raw)}`);
  }
  return { raw, unit, lower, upper };
}

/** Dollar text -> exact integer cents. REF/blank/unknown never becomes a free job. */
export function normalizeUsd(raw: string): number | null {
  if (typeof raw !== "string") throw new Error("Cost requires raw text");
  const text = raw.trim();
  if (missing.test(text)) return null;
  const match = /^\$?\s*((?:0|[1-9]\d*)|(?:[1-9]\d{0,2}(?:,\d{3})+))(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error(`Unsupported USD amount: ${JSON.stringify(raw)}`);
  const cents = BigInt(match[1].replaceAll(",", "")) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("USD cents exceed safe integer range");
  return Number(cents);
}

/** Callers must document the threshold and its units; a crossing interval stays unresolved. */
export function classifyMaximum(value: Pick<NormalizedMeasurement, "lower" | "upper">, maximum: number): "within" | "exceeds" | "unresolved" {
  if (!Number.isFinite(maximum) || maximum < 0) throw new Error("Maximum must be finite and nonnegative");
  if (value.lower === null || value.upper === null) return "unresolved";
  if (!Number.isFinite(value.lower) || !Number.isFinite(value.upper) || value.lower < 0 || value.lower > value.upper) {
    throw new Error("Invalid measurement interval");
  }
  if (value.upper <= maximum) return "within";
  if (value.lower > maximum) return "exceeds";
  return "unresolved";
}
