import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RichTextEditorToolbar from './RichTextEditorToolbar';

interface CourseDescriptionEditorProps {
  /** HTML string */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const isEmptyHtml = (html: string) =>
  !html || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';

/** Plain text (legacy descriptions) is wrapped into paragraphs so it loads cleanly. */
const toHtml = (value: string) => {
  if (!value) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

const CourseDescriptionEditor = ({
  value,
  onChange,
  placeholder = 'Description of the course — headings, lists and links are supported',
}: CourseDescriptionEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[140px] focus:outline-none p-4',
      },
    },
    content: toHtml(value),
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(isEmptyHtml(html) ? '' : html);
    },
  });

  // Sync external loads (e.g. when an existing course finishes fetching).
  useEffect(() => {
    if (!editor) return;
    const next = toHtml(value);
    const current = editor.getHTML();
    if (isEmptyHtml(next) && isEmptyHtml(current)) return;
    if (next === current) return;
    editor.commands.setContent(next, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  return (
    <div className="border rounded-md overflow-hidden">
      {editor && <RichTextEditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default CourseDescriptionEditor;
