import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, ArrowUpRight, ArrowLeft, Play, Headphones, FileText, Download } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { VimeoEmbed } from '@/components/VimeoEmbed';

interface ResourceAttachment {
  id: string;
  name: string | null;
  file_url: string;
  file_type: string;
}

interface ContentResource {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body_richtext: any;
  thumbnail_url: string | null;
  main_media_kind: 'file' | 'video_embed' | 'none' | null;
  main_media_file_url: string | null;
  main_media_embed_url: string | null;
  status: 'draft' | 'published';
  location: {
    id: string;
    name: string;
    slug: string;
  } | null;
  resource_type: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const DevotionResourcePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState<ContentResource | null>(null);
  const [attachments, setAttachments] = useState<ResourceAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { hasAccess, tierName, subscriptionStatus, loading: tierLoading } = useTierAccess();

  const canAccessDevotion = hasAccess('devotion');
  const isActiveMember = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  // Helper to get public URL for storage files
  const getPublicUrl = (bucket: string, path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      if (!slug) {
        navigate('/devotion');
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      const userIsAdmin = !!roleData;
      setIsAdmin(userIsAdmin);

      // Build query - admins can see drafts too
      let query = supabase
        .from('content_resources')
        .select(`
          id,
          title,
          slug,
          summary,
          body_richtext,
          thumbnail_url,
          main_media_kind,
          main_media_file_url,
          main_media_embed_url,
          status,
          location:content_categories!location_id (
            id,
            name,
            slug
          ),
          resource_type:content_categories!resource_type_id (
            id,
            name,
            slug
          )
        `)
        .eq('slug', slug);

      // Non-admins can only see published resources
      if (!userIsAdmin) {
        query = query.eq('status', 'published');
      }

      const { data: resourceData, error: resourceError } = await query.single();

      if (resourceError || !resourceData) {
        setError('Resource not found');
        setLoading(false);
        return;
      }

      // Transform URLs to public URLs
      const transformedResource = {
        ...resourceData,
        thumbnail_url: getPublicUrl('content-thumbnails', resourceData.thumbnail_url),
        main_media_file_url: getPublicUrl('content-main-media', resourceData.main_media_file_url),
      };

      setResource(transformedResource as unknown as ContentResource);

      // Fetch attachments
      const { data: attachmentData } = await supabase
        .from('content_resource_attachments')
        .select('id, name, file_url, file_type')
        .eq('resource_id', resourceData.id);

      if (attachmentData) {
        setAttachments(attachmentData);
      }

      setLoading(false);
    };

    checkAuthAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, slug]);

  // Render rich text content
  const renderRichText = (content: any) => {
    if (!content || !content.content) return null;

    return content.content.map((node: any, index: number) => {
      if (node.type === 'paragraph') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        if (!text) return <br key={index} />;
        return <p key={index} className="mb-4 text-foreground/90">{text}</p>;
      }
      if (node.type === 'heading') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        const level = node.attrs?.level || 2;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag key={index} className="font-serif text-xl mb-3 mt-6 text-foreground">{text}</HeadingTag>;
      }
      if (node.type === 'bulletList') {
        return (
          <ul key={index} className="list-disc pl-6 mb-4 space-y-1">
            {node.content?.map((li: any, liIndex: number) => (
              <li key={liIndex} className="text-foreground/90">
                {li.content?.[0]?.content?.map((c: any) => c.text).join('')}
              </li>
            ))}
          </ul>
        );
      }
      return null;
    });
  };

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'Door of Devotion', href: '/devotion' },
            { label: 'Resource' }
          ]} />
          <ProfileDropdown />
        </div>

        <div className="max-w-lg mx-auto pt-24 text-center">
          <p className="text-muted-foreground">Resource not found.</p>
          <Button variant="ghost" onClick={() => navigate('/devotion')} className="mt-4">
            Return to Door of Devotion
          </Button>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have devotion access
  if (!canAccessDevotion) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 relative">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <PageBreadcrumb items={[
            { label: 'Door of Devotion', href: '/devotion' },
            { label: resource.title }
          ]} />
          <ProfileDropdown />
        </div>

        <div className="max-w-lg mx-auto pt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="font-serif text-3xl text-foreground">
              {resource.title}
            </h1>
            <p className="text-muted-foreground">
              This content requires The Devotee membership tier or higher to access.
            </p>
            {tierName && (
              <p className="text-sm text-muted-foreground">
                Your current tier: <Badge variant="outline">{tierName}</Badge>
              </p>
            )}
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => navigate('/membership')} size="lg">
                {isActiveMember ? 'Upgrade Membership' : 'View Memberships'}
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/devotion')}>
                Return to Door of Devotion
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const getBackPath = () => {
    if (resource.location?.slug) {
      // Map location slug to section path
      const sectionMap: Record<string, string> = {
        'loc-guided-meditation': 'guided-meditations',
        'loc-altar-practices': 'altar-practices',
        'loc-somatic-rituals': 'somatic-rituals',
        'loc-healing-templates': 'healing-templates',
      };
      const section = sectionMap[resource.location.slug];
      return section ? `/devotion/section/${section}` : '/devotion';
    }
    return '/devotion';
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative">
      {/* Navigation Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[
          { label: 'Door of Devotion', href: '/devotion' },
          { label: resource.location?.name || 'Resource', href: getBackPath() },
          { label: resource.title }
        ]} />
        <div className="flex items-center gap-3">
          {tierName && (
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              {tierName}
            </Badge>
          )}
          <ProfileDropdown />
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-12">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(getBackPath())}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            {isAdmin && resource.status === 'draft' && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                Draft
              </Badge>
            )}
            {resource.resource_type && (
              <Badge variant="outline">{resource.resource_type.name}</Badge>
            )}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            {resource.title}
          </h1>
          {resource.summary && (
            <p className="text-muted-foreground text-lg">
              {resource.summary}
            </p>
          )}
        </motion.div>

        {/* Main Media - Video Embed (Vimeo/YouTube) */}
        {resource.main_media_kind === 'video_embed' && resource.main_media_embed_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            {(() => {
              // Extract Vimeo video ID from URL
              const vimeoMatch = resource.main_media_embed_url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
              const videoId = vimeoMatch ? vimeoMatch[1] : null;
              if (videoId) {
                return <VimeoEmbed videoId={videoId} title={resource.title} />;
              }
              // Fallback for YouTube or other embed URLs
              const youtubeMatch = resource.main_media_embed_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
              if (youtubeMatch) {
                const ytId = youtubeMatch[1];
                return (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={resource.title}
                    />
                  </div>
                );
              }
              // Generic iframe fallback
              return (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={resource.main_media_embed_url}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={resource.title}
                  />
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Main Media - Uploaded File (Audio/Video) */}
        {resource.main_media_kind === 'file' && resource.main_media_file_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            {(() => {
              const fileUrl = resource.main_media_file_url;
              const isAudio = fileUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
              const isVideo = fileUrl.match(/\.(mp4|webm|mov|avi|mkv)$/i);

              if (isAudio) {
                return (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Headphones className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Audio</span>
                        <p className="text-xs text-muted-foreground">Listen to this resource</p>
                      </div>
                    </div>
                    <audio controls className="w-full">
                      <source src={fileUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                );
              }

              if (isVideo) {
                return (
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                    <video controls className="w-full h-full">
                      <source src={fileUrl} type="video/mp4" />
                      Your browser does not support the video element.
                    </video>
                  </div>
                );
              }

              // Unknown file type - provide download link
              return (
                <div className="bg-card border border-border rounded-lg p-4">
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-primary hover:underline"
                  >
                    <Play className="w-5 h-5" />
                    <span>View Media File</span>
                  </a>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Body Content */}
        {resource.body_richtext && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="prose prose-invert max-w-none mb-8"
          >
            {renderRichText(resource.body_richtext)}
          </motion.div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="border-t border-border pt-8"
          >
            <h2 className="font-serif text-xl mb-4">Downloads</h2>
            <div className="grid gap-3">
              {attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{attachment.name || 'Download'}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {attachment.file_type}
                  </Badge>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DevotionResourcePage;
