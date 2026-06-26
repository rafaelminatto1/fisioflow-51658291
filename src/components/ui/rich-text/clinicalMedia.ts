export type ClinicalMediaAlign = "left" | "center" | "right";

export type ClinicalMediaAttrs = {
  src: string;
  alt?: string;
  title?: string;
  width?: string | null;
  align?: ClinicalMediaAlign;
};

export const DEFAULT_CLINICAL_MEDIA_WIDTH = "100%";
export const DEFAULT_CLINICAL_MEDIA_ALIGN: ClinicalMediaAlign = "center";

const WIDTH_PATTERN = /^(\d+(?:\.\d+)?)(px|%)$/i;

export function normalizeClinicalMediaAlign(value: unknown): ClinicalMediaAlign {
  return value === "left" || value === "right" || value === "center"
    ? value
    : DEFAULT_CLINICAL_MEDIA_ALIGN;
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

  const src = image?.getAttribute("src")?.trim();
  if (!src) return false;

  const alt = image.getAttribute("alt") || undefined;
  const title = image.getAttribute("title") || undefined;
  const widthSource =
    element.getAttribute("data-width") ||
    image.getAttribute("data-width") ||
    image.style.width ||
    image.getAttribute("width");
  const alignSource = element.getAttribute("data-align") || image.getAttribute("data-align");

  return {
    src,
    alt,
    title,
    width: normalizeClinicalMediaWidth(widthSource),
    align: normalizeClinicalMediaAlign(alignSource),
  };
}

export function buildClinicalMediaNode(attrs: ClinicalMediaAttrs, caption = "") {
  const normalizedAttrs = {
    ...attrs,
    width: normalizeClinicalMediaWidth(attrs.width),
    align: normalizeClinicalMediaAlign(attrs.align),
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
  };
}

export function getClinicalMediaImageAttrs(attrs: Partial<ClinicalMediaAttrs>) {
  return {
    src: attrs.src || "",
    alt: attrs.alt || "",
    title: attrs.title || "",
    "data-rich-text-image": "true",
  };
}
