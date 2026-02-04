import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SelectableImage from '@/components/admin/SelectableImage';

export const SelectableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.style.width || element.getAttribute('width') || '100%',
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SelectableImage);
  },
  
  addKeyboardShortcuts() {
    return {
      // Delete the image when pressing Delete or Backspace while selected
      'Backspace': () => {
        const { selection } = this.editor.state;
        const node = this.editor.state.doc.nodeAt(selection.from);
        if (node?.type.name === 'image') {
          this.editor.commands.deleteSelection();
          return true;
        }
        return false;
      },
      'Delete': () => {
        const { selection } = this.editor.state;
        const node = this.editor.state.doc.nodeAt(selection.from);
        if (node?.type.name === 'image') {
          this.editor.commands.deleteSelection();
          return true;
        }
        return false;
      },
    };
  },
});
