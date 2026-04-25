import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { RichTextEditor } from "./RichTextEditor";
import { RichTextContextProvider } from "@/contexts/RichTextContext";

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <RichTextContextProvider>
    <div className="max-w-2xl border rounded-lg overflow-hidden">{children}</div>
  </RichTextContextProvider>
);

const ControlledEditor = (args: any) => {
  const [content, setContent] = useState(args.value ?? "");
  return (
    <Wrapper>
      <RichTextEditor {...args} value={content} onChange={setContent} />
    </Wrapper>
  );
};

const meta = {
  title: "UI/RichTextEditor",
  component: RichTextEditor,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  render: (args) => <ControlledEditor {...args} />,
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    placeholder: "Escreva aqui...",
    value: "",
  },
};

export const Preloaded: Story = {
  args: {
    value:
      "<h2>Avaliação do Paciente</h2><p>Paciente apresenta <strong>lombalgia crônica</strong> há 6 meses.</p><ul><li>Dor nível 6/10</li><li>Mobilidade reduzida</li></ul>",
    placeholder: "Escreva aqui...",
  },
};

export const ReadOnly: Story = {
  args: {
    value: "<p>Este conteúdo é <strong>somente leitura</strong>.</p>",
    editable: false,
  },
};
