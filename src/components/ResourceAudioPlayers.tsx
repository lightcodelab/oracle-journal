import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';

interface AudioFile {
  id: string;
  file_url: string;
  file_name: string;
  display_order: number;
}

interface ResourceAudioPlayersProps {
  resourceId: string;
  /** Storage bucket name for resolving file URLs */
  bucket: string;
  /** Legacy single audio URL fallback */
  legacyAudioUrl?: string | null;
  /** Table to query: 'healing_resource_audio_files' or 'lesson_audio_files' */
  table: 'healing_resource_audio_files' | 'lesson_audio_files';
  /** Foreign key column name */
  foreignKey: 'resource_id' | 'lesson_id';
  /** Animation delay offset */
  delayOffset?: number;
  /** Extra content to render in each card (e.g. playlist button) */
  renderActions?: (audioFile: AudioFile, index: number) => React.ReactNode;
}

const ResourceAudioPlayers = ({
  resourceId,
  bucket,
  legacyAudioUrl,
  table,
  foreignKey,
  delayOffset = 0.15,
  renderActions,
}: ResourceAudioPlayersProps) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!resourceId) return;
    const query = table === 'healing_resource_audio_files'
      ? supabase.from('healing_resource_audio_files').select('*').eq('resource_id', resourceId).order('display_order')
      : supabase.from('lesson_audio_files').select('*').eq('lesson_id', resourceId).order('display_order');
    
    query.then(({ data }) => {
      if (data && data.length > 0) {
        setAudioFiles(data.map(d => ({ id: d.id, file_url: d.file_url, file_name: d.file_name, display_order: d.display_order })));
      }
      setLoaded(true);
    });
  }, [resourceId, table, foreignKey]);

  const getPublicUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  if (!loaded) return null;

  // If we have multi-audio files, render them
  if (audioFiles.length > 0) {
    return (
      <div className="space-y-4 mb-8">
        {audioFiles.map((af, idx) => (
          <motion.div
            key={af.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: delayOffset + idx * 0.05 }}
          >
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{af.file_name}</span>
                    {audioFiles.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        Audio {idx + 1} of {audioFiles.length}
                      </p>
                    )}
                  </div>
                </div>
                {renderActions?.(af, idx)}
              </div>
              <audio
                controls
                controlsList="nodownload noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                className="w-full"
              >
                <source src={getPublicUrl(af.file_url)} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Legacy fallback: single audio URL
  if (legacyAudioUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: delayOffset }}
        className="mb-8"
      >
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-medium text-foreground">Audio</span>
                <p className="text-xs text-muted-foreground">Listen to this resource</p>
              </div>
            </div>
            {renderActions?.({ id: '', file_url: legacyAudioUrl, file_name: 'Audio', display_order: 0 }, 0)}
          </div>
          <audio
            controls
            controlsList="nodownload noplaybackrate"
            onContextMenu={(e) => e.preventDefault()}
            className="w-full"
          >
            <source src={getPublicUrl(legacyAudioUrl)} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default ResourceAudioPlayers;
