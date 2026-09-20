import RichTextEditor from './RichTextEditor';

interface CourseDescriptionEditorProps {
  /** HTML string */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const CourseDescriptionEditor = ({
  value,
  onChange,
  placeholder = 'Description of the course — headings, lists and links are supported',
}: CourseDescriptionEditorProps) => (
  <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
);

export default CourseDescriptionEditor;
