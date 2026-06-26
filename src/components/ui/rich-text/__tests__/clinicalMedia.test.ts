import { describe, expect, it } from "vitest";
import {
  buildClinicalMediaNode,
  DEFAULT_CLINICAL_MEDIA_ALIGN,
  DEFAULT_CLINICAL_MEDIA_WIDTH,
  getClinicalMediaAttrsFromElement,
  getClinicalMediaFigureAttrs,
  getClinicalMediaImageAttrs,
  normalizeClinicalMediaAlign,
  normalizeClinicalMediaWidth,
} from "../clinicalMedia";

describe("clinical media helpers", () => {
  it("normaliza largura inválida para 100%", () => {
    expect(normalizeClinicalMediaWidth(undefined)).toBe(DEFAULT_CLINICAL_MEDIA_WIDTH);
    expect(normalizeClinicalMediaWidth("abc")).toBe(DEFAULT_CLINICAL_MEDIA_WIDTH);
    expect(normalizeClinicalMediaWidth("999%")).toBe("100%");
    expect(normalizeClinicalMediaWidth("10%")).toBe("20%");
    expect(normalizeClinicalMediaWidth("80px")).toBe("120px");
  });

  it("normaliza alinhamento inválido para center", () => {
    expect(normalizeClinicalMediaAlign(undefined)).toBe(DEFAULT_CLINICAL_MEDIA_ALIGN);
    expect(normalizeClinicalMediaAlign("weird")).toBe(DEFAULT_CLINICAL_MEDIA_ALIGN);
    expect(normalizeClinicalMediaAlign("left")).toBe("left");
  });

  it("extrai atributos de markup legado em img", () => {
    const img = document.createElement("img");
    img.setAttribute("src", "https://cdn.example.com/legado.png");
    img.setAttribute("alt", "ombro");
    img.setAttribute("title", "Pré");
    img.setAttribute("data-width", "75%");
    img.setAttribute("data-align", "right");

    expect(getClinicalMediaAttrsFromElement(img)).toEqual({
      src: "https://cdn.example.com/legado.png",
      alt: "ombro",
      title: "Pré",
      width: "75%",
      align: "right",
    });
  });

  it("extrai atributos de figure semântica", () => {
    const figure = document.createElement("figure");
    figure.setAttribute("data-type", "clinical-media");
    figure.setAttribute("data-width", "720px");
    figure.setAttribute("data-align", "left");

    const img = document.createElement("img");
    img.setAttribute("src", "/media/teste.png");
    figure.appendChild(img);

    expect(getClinicalMediaAttrsFromElement(figure)).toEqual({
      src: "/media/teste.png",
      alt: undefined,
      title: undefined,
      width: "720px",
      align: "left",
    });
  });

  it("gera node block com caption inline", () => {
    expect(
      buildClinicalMediaNode(
        {
          src: "/a.png",
          width: "75%",
          align: "center",
        },
        "Legenda clínica",
      ),
    ).toEqual({
      type: "clinicalMedia",
      attrs: {
        src: "/a.png",
        width: "75%",
        align: "center",
      },
      content: [{ type: "text", text: "Legenda clínica" }],
    });
  });

  it("gera attrs de render do figure e do img", () => {
    expect(
      getClinicalMediaFigureAttrs({
        width: "80%",
        align: "right",
      }),
    ).toEqual({
      "data-type": "clinical-media",
      "data-align": "right",
      "data-width": "80%",
    });

    expect(
      getClinicalMediaImageAttrs({
        src: "/render.png",
        alt: "render",
      }),
    ).toEqual({
      src: "/render.png",
      alt: "render",
      title: "",
      "data-rich-text-image": "true",
    });
  });
});
