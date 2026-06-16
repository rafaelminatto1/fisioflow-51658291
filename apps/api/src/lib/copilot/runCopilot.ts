import type { CallModel, CopilotMessage, CopilotTool, ToolCall, ToolCtx } from "./types";

export async function runCopilot(opts: {
  callModel: CallModel;
  tools: CopilotTool[];
  ctx: ToolCtx;
  messages: CopilotMessage[];
  maxTurns?: number;
}): Promise<{ answer: string; toolCalls: ToolCall[] }> {
  const { callModel, tools, ctx, maxTurns = 4 } = opts;
  const messages = [...opts.messages];
  const executed: ToolCall[] = [];
  let lastContent = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const reply = await callModel(messages);
    lastContent = reply.content ?? lastContent;
    if (!reply.toolCalls || reply.toolCalls.length === 0) {
      return { answer: reply.content ?? lastContent, toolCalls: executed };
    }
    for (const call of reply.toolCalls) {
      executed.push(call);
      const tool = tools.find((t) => t.name === call.name);
      let result: unknown;
      if (!tool) {
        result = { error: `Ferramenta desconhecida: ${call.name}` };
      } else {
        const parsed = tool.parameters.safeParse(call.arguments);
        if (!parsed.success) {
          result = { error: `Args inválidos: ${parsed.error.message}` };
        } else {
          try {
            result = await tool.execute(ctx, parsed.data as Record<string, unknown>);
          } catch (e) {
            result = { error: String((e as Error)?.message ?? e) };
          }
        }
      }
      messages.push({ role: "tool", name: call.name, content: JSON.stringify(result) });
    }
  }
  return { answer: lastContent || "Não foi possível concluir.", toolCalls: executed };
}
