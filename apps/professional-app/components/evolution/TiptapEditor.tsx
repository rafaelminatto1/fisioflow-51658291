import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

interface TiptapEditorProps {
  content: string;
  onChangeContent: (content: string) => void;
  placeholder?: string;
  colors: any;
}

export function TiptapEditor({
  content,
  onChangeContent,
  placeholder = "Comece a escrever a evolução...",
  colors,
}: TiptapEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 16px;
          background-color: transparent;
          color: ${colors.text};
        }
        .ProseMirror {
          min-height: 200px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${colors.textMuted};
          pointer-events: none;
          height: 0;
        }
        table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        table td, table th {
          min-width: 1em;
          border: 1px solid ${colors.border};
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        ul[data-type="taskList"] input[type="checkbox"] {
          margin-right: 8px;
          margin-top: 4px;
        }
        hr {
          border: none;
          border-top: 1px solid ${colors.border};
          margin: 20px 0;
        }
        blockquote {
          border-left: 3px solid ${colors.primary};
          padding-left: 16px;
          color: ${colors.textSecondary};
          margin-left: 0;
        }
        iframe {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 8px;
          border: none;
        }
      </style>
      <script src="https://unpkg.com/@tiptap/standalone@latest"></script>
    </head>
    <body>
      <div id="editor"></div>
      <script>
        const { Editor, StarterKit, Table, TableRow, TableHeader, TableCell, Youtube, TaskList, TaskItem, Placeholder, Underline } = Tiptap;

        const editor = new Editor({
          element: document.querySelector('#editor'),
          extensions: [
            StarterKit,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Youtube,
            TaskList,
            TaskItem.configure({ nested: true }),
            Placeholder.configure({ placeholder: '${placeholder}' }),
            Underline
          ],
          content: \`${content}\`,
          onUpdate({ editor }) {
            const html = editor.getHTML();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'UPDATE',
              content: html
            }));
          }
        });

        window.addEventListener('message', (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'SET_CONTENT') {
            editor.commands.setContent(message.content);
          } else if (message.type === 'EXEC_COMMAND') {
            const { command, args } = message;
            if (command === 'bold') editor.chain().focus().toggleBold().run();
            if (command === 'italic') editor.chain().focus().toggleItalic().run();
            if (command === 'underline') editor.chain().focus().toggleUnderline().run();
            if (command === 'bulletList') editor.chain().focus().toggleBulletList().run();
            if (command === 'orderedList') editor.chain().focus().toggleOrderedList().run();
            if (command === 'taskList') editor.chain().focus().toggleTaskList().run();
            if (command === 'table') editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            if (command === 'youtube') editor.chain().focus().setYoutubeVideo({ src: args.url }).run();
            if (command === 'heading') editor.chain().focus().toggleHeading({ level: args.level }).run();
          }
        });
      </script>
    </body>
    </html>
  `;

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "UPDATE") {
        onChangeContent(data.content);
      }
    } catch (e) {
      console.error("WebView message error:", e);
    }
  };

  const execCommand = (command: string, args: any = {}) => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "EXEC_COMMAND", command, args }));
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={onMessage}
        onLoadEnd={() => setIsLoaded(true)}
        style={{ backgroundColor: "transparent" }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      {!isLoaded && (
        <View style={StyleSheet.absoluteFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
});
