export type ClinicalMediaAlign = "left" | "center" | "right";
export type ClinicalMediaWrap = "none" | "left" | "right" | "inline" | "behind" | "front";

export type ClinicalMediaAttrs = {
  src: string;
  alt?: string;
  title?: string;
  width?: string | null;
  align?: ClinicalMediaAlign;
  wrap?: ClinicalMediaWrap;
  top?: string | null;
  left?: string | null;
};

export const DEFAULT_CLINICAL_MEDIA_WIDTH = "350px"; // Começa menor e mais compatível
export const DEFAULT_CLINICAL_MEDIA_ALIGN: ClinicalMediaAlign = "center";
export const DEFAULT_CLINICAL_MEDIA_WRAP: ClinicalMediaWrap = "none";

const WIDTH_PATTERN = /^(\d+(?:\.\d+)?)(px|%)$/i;
const SAFE_PROTOCOL_PATTERN = /^(https?:|blob:|data:image\/|\/|\.\/|\.\.\/)/i;

function normalizeClinicalMediaText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 500) : undefined;
}

export function normalizeClinicalMediaSrc(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (!SAFE_PROTOCOL_PATTERN.test(normalized)) return "";
  return normalized;
}

export function normalizeClinicalMediaAlign(value: unknown): ClinicalMediaAlign {
  return value === "left" || value === "right" || value === "center"
    ? value
    : DEFAULT_CLINICAL_MEDIA_ALIGN;
}

export function normalizeClinicalMediaWrap(value: unknown): ClinicalMediaWrap {
  const v = String(value).trim();
  if (v === "left" || v === "right" || v === "inline" || v === "behind" || v === "front") {
    return v;
  }
  return DEFAULT_CLINICAL_MEDIA_WRAP;
}

export function normalizeClinicalMediaCoord(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^-?\d+px$/.test(v)) return v;
  return null;
}

export function normalizeClinicalMediaWidth(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_CLINICAL_MEDIA_WIDTH;
  const normalized = value.trim();
  const match = normalized.match(WIDTH_PATTERN);
  if (!match) return DEFAULT_CLINICAL_MEDIA_WIDTH;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_CLINICAL_MEDIA_WIDTH;

  if (unit === "%") {
    return `${Math.min(100, Math.max(20, Math.round(amount)))}%`;
  }

  return `${Math.min(2400, Math.max(120, Math.round(amount)))}px`;
}

export function getClinicalMediaAttrsFromElement(element: HTMLElement): ClinicalMediaAttrs | false {
  const image =
    element.tagName === "IMG"
      ? (element as HTMLImageElement)
      : (element.querySelector("img") as HTMLImageElement | null);

  const src = normalizeClinicalMediaSrc(image?.getAttribute("src"));
  if (!src) return false;

  const alt = normalizeClinicalMediaText(image.getAttribute("alt"));
  const title = normalizeClinicalMediaText(image.getAttribute("title"));
  const widthSource =
    element.getAttribute("data-width") ||
    image.getAttribute("data-width") ||
    image.style.width ||
    image.getAttribute("width");
  const alignSource = element.getAttribute("data-align") || image.getAttribute("data-align");

  const wrapSource = element.getAttribute("data-wrap") || image.getAttribute("data-wrap");
  const topSource = element.getAttribute("data-top") || image.getAttribute("data-top");
  const leftSource = element.getAttribute("data-left") || image.getAttribute("data-left");

  return {
    src,
    alt,
    title,
    width: normalizeClinicalMediaWidth(widthSource),
    align: normalizeClinicalMediaAlign(alignSource),
    wrap: normalizeClinicalMediaWrap(wrapSource),
    top: normalizeClinicalMediaCoord(topSource),
    left: normalizeClinicalMediaCoord(leftSource),
  };
}

export function buildClinicalMediaNode(attrs: ClinicalMediaAttrs, caption = "") {
  const src = normalizeClinicalMediaSrc(attrs.src);
  if (!src) {
    throw new Error("clinical media requires a safe src");
  }

  const normalizedAttrs = {
    src,
    alt: normalizeClinicalMediaText(attrs.alt),
    title: normalizeClinicalMediaText(attrs.title),
    width: normalizeClinicalMediaWidth(attrs.width),
    align: normalizeClinicalMediaAlign(attrs.align),
    wrap: normalizeClinicalMediaWrap(attrs.wrap),
    top: normalizeClinicalMediaCoord(attrs.top),
    left: normalizeClinicalMediaCoord(attrs.left),
  };

  return {
    type: "clinicalMedia",
    attrs: normalizedAttrs,
    content: caption.trim()
      ? [
          {
            type: "text",
            text: caption,
          },
        ]
      : [],
  };
}

export function getClinicalMediaFigureAttrs(attrs: Partial<ClinicalMediaAttrs>) {
  return {
    "data-type": "clinical-media",
    "data-align": normalizeClinicalMediaAlign(attrs.align),
    "data-width": normalizeClinicalMediaWidth(attrs.width),
    "data-wrap": normalizeClinicalMediaWrap(attrs.wrap),
    "data-top": normalizeClinicalMediaCoord(attrs.top) || "",
    "data-left": normalizeClinicalMediaCoord(attrs.left) || "",
  };
}

export function getClinicalMediaImageAttrs(attrs: Partial<ClinicalMediaAttrs>) {
  return {
    src: normalizeClinicalMediaSrc(attrs.src),
    alt: normalizeClinicalMediaText(attrs.alt) || "",
    title: normalizeClinicalMediaText(attrs.title) || "",
    "data-rich-text-image": "true",
  };
}
