import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DiffChunk {
  file: string;
  content: string;
}

/**
 * Parses a standard git diff string into chunks per file.
 */
export function parseDiff(diff: string): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  const files = diff.split(/^diff --git /m).slice(1);

  for (const fileDiff of files) {
    const lines = fileDiff.split('\n');
    const fileNameMatch = lines[0].match(/a\/(.+) b\//);
    if (!fileNameMatch) continue;

    chunks.push({
      file: fileNameMatch[1],
      content: fileDiff,
    });
  }

  return chunks;
}

/**
 * Jules AI Provider for review generation.
 */
export class JulesAI {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async summarizeChanges(diff: string): Promise<string> {
    const prompt = `Analyze this git diff and provide a high-level summary of the changes. Focus on what was added, changed, or removed. Be concise but informative.

Diff:
${diff}`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (e: any) {
      console.error(`[JulesAI Error]: ${e.message}`);
      throw e;
    }
  }

  async reviewFile(file: string, content: string): Promise<string> {
    const prompt = `Review the changes in the following file diff.
Identify bugs, performance issues (N+1 queries, large rendering loops), and readability improvements.
Suggest better patterns if applicable.
Use a professional, encouraging tone.

File: ${file}
Diff Content:
${content}`;

    try {
      console.log(`[JulesAI] Sending request to ${this.model.model}...`);
      const result = await this.model.generateContent(prompt);
      console.log(`[JulesAI] Received response.`);
      return result.response.text();
    } catch (e: any) {
      console.error(`[JulesAI Error]: ${e.message}`);
      throw e;
    }
  }
}
