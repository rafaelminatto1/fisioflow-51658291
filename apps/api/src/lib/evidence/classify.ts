export function classifyEvidenceLevel(pubTypes: string[], studyDesign: string): string {
  const types = pubTypes.map((t) => t.toLowerCase());
  const design = studyDesign.toLowerCase();

  if (types.includes("meta-analysis") || types.includes("systematic review") || types.includes("systematic-review"))
    return "1a";
  if (types.includes("randomized controlled trial") || types.includes("randomized") || types.includes("rct"))
    return "1b";
  if (types.includes("controlled clinical trial") || types.includes("controlled trial"))
    return "2b";
  if (types.includes("cohort studies") || types.includes("cohort") || design.includes("cohort"))
    return "2b";
  if (types.includes("case-control studies") || types.includes("case-control") || design.includes("case-control"))
    return "3b";
  if (types.includes("case reports") || types.includes("case series") || types.includes("case report"))
    return "4";
  return "5";
}
