import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, X, Music } from 'lucide-react';

export interface AudioFileItem {
  id?: string;
  file_url: string;
  file_name: string;
  display_order: number;
}

interface AudioFileListProps {
  audioFiles: AudioFileItem[];
  onChange: (files: AudioFileItem[]) => void;
  /** Resolve a stored path to a playable URL */
  getPublicUrl: (path: string) => string;
}

const AudioFileList = ({ audioFiles, onChange, getPublicUrl }: AudioFileListProps) => {
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...audioFiles];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    onChange(updated.map((f, i) => ({ ...f, display_order: i })));
  };

  const moveDown = (idx: number) => {
    if (idx === audioFiles.length - 1) return;
    const updated = [...audioFiles];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    onChange(updated.map((f, i) => ({ ...f, display_order: i })));
  };

  const rename = (idx: number, name: string) => {
    const updated = [...audioFiles];
    updated[idx] = { ...updated[idx], file_name: name };
    onChange(updated);
  };

  const remove = (idx: number) => {
    onChange(audioFiles.filter((_, i) => i !== idx).map((f, i) => ({ ...f, display_order: i })));
  };

  if (audioFiles.length === 0) return null;

  return (
    <div className="space-y-3 mb-4">
      {audioFiles.map((af, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-md">
          {/* Reorder arrows */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={idx === 0}
              onClick={() => moveUp(idx)}
              title="Move up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={idx === audioFiles.length - 1}
              onClick={() => moveDown(idx)}
              title="Move down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Music className="w-4 h-4 text-primary shrink-0" />

          <div className="flex-1 min-w-0">
            <Input
              value={af.file_name}
              onChange={(e) => rename(idx, e.target.value)}
              className="mb-1 text-sm h-8"
              placeholder="Display name"
            />
            <audio src={getPublicUrl(af.file_url)} controls className="w-full" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(idx)}
          >
            <X className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default AudioFileList;
