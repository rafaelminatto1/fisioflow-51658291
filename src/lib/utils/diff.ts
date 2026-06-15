export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

/**
 * Computa a diferença entre dois blocos de texto linha a linha usando LCS.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");
  const oldLength = oldLines.length;
  const newLength = newLines.length;

  const dp: number[][] = Array.from({ length: oldLength + 1 }, () => Array(newLength + 1).fill(0));

  for (let i = oldLength - 1; i >= 0; i -= 1) {
    for (let j = newLength - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < oldLength && j < newLength) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "same", text: oldLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: "added", text: newLines[j] });
      j += 1;
    }
  }

  while (i < oldLength) {
    result.push({ type: "removed", text: oldLines[i] });
    i += 1;
  }

  while (j < newLength) {
    result.push({ type: "added", text: newLines[j] });
    j += 1;
  }

  return result;
}
