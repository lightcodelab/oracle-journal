import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Video, Play, Clock, Sparkles, GraduationCap, Users, Flower2 } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { VimeoEmbed } from '@/components/VimeoEmbed';
import { useTierAccess } from '@/hooks/useTierAccess';
import { TempleAccessGate } from '@/components/temple/TempleAccessGate';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SessionReplay {
  id: string;
  title: string;
  description: string | null;
  replay_type: 'reading' | 'class' | 'workshop' | 'meditation';
  video_url: string | null;
  video_file_path: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  published_at: string | null;
}

const replayTypeConfig = {
  reading: {
    label: 'Reading Replay',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  class: {
    label: 'Class Replay',
    icon: GraduationCap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  workshop: {
    label: 'Workshop Replay',
    icon: Users,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  meditation: {
    label: 'Meditation Replay',
    icon: Flower2,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
};

export default function LiveReplays() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'reading' | 'class' | 'workshop' | 'meditation'>('all');
  const [selectedReplay, setSelectedReplay] = useState<SessionReplay | null>(null);
  const { loading: tierLoading } = useTierAccess();

  const { data: replays, isLoading } = useQuery({
    queryKey: ['session-replays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_replays')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data as SessionReplay[];
    },
    enabled: true,
  });

  const filteredReplays = replays?.filter(replay => 
    filter === 'all' || replay.replay_type === filter
  ) || [];

  const getVideoId = (url: string | null) => {
    if (!url) return null;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) return { type: 'youtube', id: youtubeMatch[1] };
    return null;
  };

  if (tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading...
        </div>
      </div>
    );
  }

  return (
   <TempleAccessGate>
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[
          { label: 'Communion', href: '/communion' },
          { label: 'Live Replays' }
        ]} />
        <ProfileDropdown />
      </div>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif text-foreground flex items-center justify-center gap-3">
              <Video className="h-8 w-8 text-primary" />
              Live Replays
            </h1>
            <p className="text-muted-foreground">
              Watch recordings of past live sessions
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All Replays</TabsTrigger>
                <TabsTrigger value="reading" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Readings
                </TabsTrigger>
                <TabsTrigger value="class" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Classes
                </TabsTrigger>
                <TabsTrigger value="workshop" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Workshops
                </TabsTrigger>
                <TabsTrigger value="meditation" className="flex items-center gap-1">
                  <Flower2 className="h-3 w-3" />
                  Meditations
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredReplays.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReplays.map((replay, index) => {
                const config = replayTypeConfig[replay.replay_type];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={replay.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] h-full border ${config.borderColor}`}
                      onClick={() => setSelectedReplay(replay)}
                    >
                      {/* Thumbnail */}
                      {replay.thumbnail_url ? (
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                          <img 
                            src={replay.thumbnail_url} 
                            alt={replay.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Play className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className={`aspect-video flex items-center justify-center ${config.bgColor} rounded-t-lg`}>
                          <Play className={`h-12 w-12 ${config.color}`} />
                        </div>
                      )}
                      
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={`${config.color} border-current`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {replay.duration_minutes && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {replay.duration_minutes} min
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-serif line-clamp-2">
                          {replay.title}
                        </CardTitle>
                      </CardHeader>
                      
                      {replay.description && (
                        <CardContent className="pt-0">
                          <CardDescription className="line-clamp-2">
                            {replay.description}
                          </CardDescription>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-serif mb-2">No replays available</h2>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'Check back soon for recordings of live sessions'
                    : `No ${filter} replays available yet`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedReplay} onOpenChange={(open) => !open && setSelectedReplay(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-serif">{selectedReplay?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedReplay && (
            <div className="space-y-4">
              {selectedReplay.video_url ? (
                (() => {
                  const videoInfo = getVideoId(selectedReplay.video_url);
                  if (videoInfo?.type === 'vimeo') {
                    return <VimeoEmbed videoId={videoInfo.id} />;
                  } else if (videoInfo?.type === 'youtube') {
                    return (
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoInfo.id}`}
                          className="w-full h-full rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Video format not supported</p>
                    </div>
                  );
                })()
              ) : selectedReplay.video_file_path ? (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Video playback coming soon</p>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No video available</p>
                </div>
              )}
              
              {selectedReplay.description && (
                <p className="text-muted-foreground">{selectedReplay.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
   </TempleAccessGate>
  );
}
