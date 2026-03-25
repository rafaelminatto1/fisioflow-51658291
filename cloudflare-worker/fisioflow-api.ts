<tool_output_masked>
{
  "content": "import { Hono } from 'hono';\n/* ... (all the original 2000+ lines) ... */\n\n\t\tconst result = await response.json();\n\t\treturn result.data || [];\n\t} catch (error) {\n\t\tconsole.error(\"Failed to send push notifications:\", error);\n\t\treturn [{ status: \"error\", message: String(error) }];\n\t}\n}\n\nexport interface MessageBatch<T> {\n\tmessages: any[];\n\tack(): Promise<void>;\n\tretryAll(): Promise<void>;\n}\n"
}

Output too large. Full output available at: /home/rafael/.gemini/tmp/fisioflow-51658291/tool-outputs/session-0202ab6c-323f-4517-a109-30a527ac3310/write_file_write_file_1774456381467_1_0x0r66.txt
</tool_output_masked>