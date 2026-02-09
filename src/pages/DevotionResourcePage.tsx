import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import ProfileDropdown from '@/components/ProfileDropdown';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, ArrowUpRight, ArrowLeft, Play, Headphones, FileText, Download, ListMusic } from 'lucide-react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { VimeoEmbed } from '@/components/VimeoEmbed';
import ContextualJournal from '@/components/journal/ContextualJournal';
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog';

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
  secondary_audio_url: string | null;
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
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
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

      // Check if this is a healing resource (slug starts with "healing-")
      const isHealingResource = slug.startsWith('healing-');
      
      if (isHealingResource) {
        // Extract the identifier (could be a slug or an ID)
        const healingIdentifier = slug.replace('healing-', '');
        
        const healingSelect = `
            id,
            title,
            slug,
            summary,
            teaching_description,
            body_richtext,
            display_image_url,
            audio_file_url,
            vimeo_embed_url,
            status,
            modality,
            location:content_categories!location_id (
              id,
              name,
              slug
            )
        `;

        // Try slug first, then fall back to ID
        let healingQuery = supabase
          .from('healing_resources')
          .select(healingSelect)
          .eq('slug', healingIdentifier);

        if (!userIsAdmin) {
          healingQuery = healingQuery.eq('status', 'published');
        }

        let { data: healingData, error: healingError } = await healingQuery.maybeSingle();

        // If not found by slug, try by ID
        if (!healingData) {
          let idQuery = supabase
            .from('healing_resources')
            .select(healingSelect)
            .eq('id', healingIdentifier);

          if (!userIsAdmin) {
            idQuery = idQuery.eq('status', 'published');
          }

          const idResult = await idQuery.maybeSingle();
          healingData = idResult.data;
          healingError = idResult.error;
        }

        if (healingError || !healingData) {
          setError('Resource not found');
          setLoading(false);
          return;
        }

        // Determine media kind based on available fields
        let mediaKind: 'file' | 'video_embed' | 'none' | null = null;
        let mediaFileUrl: string | null = null;
        let mediaEmbedUrl: string | null = null;
        let secondaryAudioUrl: string | null = null;

        const audioUrl = healingData.audio_file_url ? getPublicUrl('healing-resource-images', healingData.audio_file_url) : null;

        if (healingData.vimeo_embed_url) {
          mediaKind = 'video_embed';
          mediaEmbedUrl = healingData.vimeo_embed_url;
          // If both video and audio exist, audio becomes secondary
          secondaryAudioUrl = audioUrl;
        } else if (audioUrl) {
          mediaKind = 'file';
          mediaFileUrl = audioUrl;
        }

        // Transform healing resource to match ContentResource shape
        const transformedResource: ContentResource = {
          id: healingData.id,
          title: healingData.title,
          slug: slug,
          summary: (healingData as any).summary || healingData.teaching_description || null,
          body_richtext: healingData.body_richtext,
          thumbnail_url: getPublicUrl('healing-resource-images', healingData.display_image_url),
          main_media_kind: mediaKind,
          main_media_file_url: mediaFileUrl,
          main_media_embed_url: mediaEmbedUrl,
          secondary_audio_url: secondaryAudioUrl,
          status: healingData.status as 'draft' | 'published',
          location: healingData.location as ContentResource['location'],
          resource_type: {
            id: healingData.modality,
            name: healingData.modality.charAt(0).toUpperCase() + healingData.modality.slice(1),
            slug: healingData.modality,
          },
        };

        setResource(transformedResource);
        // Healing resources don't have attachments in the same way
        setAttachments([]);
        setLoading(false);
        return;
      }

      // Standard content_resources query
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
        secondary_audio_url: null as string | null,
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

  // Render inline text with marks (bold, italic, links, underline, strike)
  const renderTextWithMarks = (textNodes: any[]): React.ReactNode => {
    if (!textNodes || textNodes.length === 0) return null;
    
    return textNodes.map((node: any, idx: number) => {
      if (!node.text) return null;
      
      let content: React.ReactNode = node.text;
      
      if (node.marks && node.marks.length > 0) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') {
            content = <strong key={`bold-${idx}`}>{content}</strong>;
          }
          if (mark.type === 'italic') {
            content = <em key={`italic-${idx}`}>{content}</em>;
          }
          if (mark.type === 'underline') {
            content = <u key={`underline-${idx}`}>{content}</u>;
          }
          if (mark.type === 'strike') {
            content = <s key={`strike-${idx}`}>{content}</s>;
          }
          if (mark.type === 'link') {
            content = (
              <a 
                key={`link-${idx}`}
                href={mark.attrs?.href || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                {content}
              </a>
            );
          }
        });
      }
      
      return <span key={idx}>{content}</span>;
    });
  };

  // Render rich text content with brand typography
  const renderRichText = (content: any) => {
    if (!content || !content.content) return null;

    return content.content.map((node: any, index: number) => {
      // Image node
      if (node.type === 'image') {
        const src = node.attrs?.src;
        const alt = node.attrs?.alt || 'Content image';
        const width = node.attrs?.width || '100%';
        if (!src) return null;
        return (
          <figure key={index} className="my-6" style={{ width, maxWidth: '100%' }}>
            <img 
              src={src} 
              alt={alt} 
              className="w-full rounded-lg"
            />
            {node.attrs?.title && (
              <figcaption className="text-center text-sm text-muted-foreground mt-2">
                {node.attrs.title}
              </figcaption>
            )}
          </figure>
        );
      }

      // Horizontal rule
      if (node.type === 'horizontalRule') {
        return <hr key={index} className="my-6 border-t border-border" />;
      }

      if (node.type === 'paragraph') {
        if (!node.content || node.content.length === 0) return <br key={index} />;
        // p: Inter (sans), foreground, 0.75rem bottom margin
        return (
          <p key={index} className="font-sans mb-3 text-foreground">
            {renderTextWithMarks(node.content)}
          </p>
        );
      }

      if (node.type === 'heading') {
        const level = node.attrs?.level || 2;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        // h1: Playfair (serif), 1.75rem, 700 weight, foreground, 1.5rem top, 0.5rem bottom
        // h2: Playfair (serif), 1.375rem, 600 weight, PRIMARY (gold), 1.25rem top, 0.5rem bottom
        // h3: Inter (sans), 1.125rem, 600 weight, foreground, 1rem top, 0.5rem bottom
        let headingClass = "";
        if (level === 1) {
          headingClass = "font-serif text-[1.75rem] font-bold mt-6 mb-2 text-foreground";
        } else if (level === 2) {
          headingClass = "font-serif text-[1.375rem] font-semibold mt-5 mb-2 text-primary";
        } else {
          headingClass = "font-sans text-[1.125rem] font-semibold mt-4 mb-2 text-foreground";
        }
        return (
          <HeadingTag key={index} className={headingClass}>
            {renderTextWithMarks(node.content)}
          </HeadingTag>
        );
      }

      if (node.type === 'bulletList') {
        return (
          <ul key={index} className="list-disc pl-6 mb-3 space-y-1">
            {node.content?.map((li: any, liIndex: number) => (
              <li key={liIndex} className="font-sans text-foreground">
                {renderTextWithMarks(li.content?.[0]?.content)}
              </li>
            ))}
          </ul>
        );
      }

      if (node.type === 'orderedList') {
        return (
          <ol key={index} className="list-decimal pl-6 mb-3 space-y-1">
            {node.content?.map((li: any, liIndex: number) => (
              <li key={liIndex} className="font-sans text-foreground">
                {renderTextWithMarks(li.content?.[0]?.content)}
              </li>
            ))}
          </ol>
        );
      }

      if (node.type === 'blockquote') {
        return (
          <blockquote key={index} className="border-l-[3px] border-primary pl-4 my-3 italic text-muted-foreground">
            {node.content?.map((p: any, pIndex: number) => (
              <p key={pIndex}>{renderTextWithMarks(p.content)}</p>
            ))}
          </blockquote>
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
        </motion.div>

        {/* Summary - displayed in gold above media */}
        {resource.summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mb-8"
          >
            <p className="text-primary text-lg leading-relaxed">
              {resource.summary}
            </p>
          </motion.div>
        )}

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

        {/* Secondary Audio Player (when resource has both video and audio) */}
        {resource.secondary_audio_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlaylistDialogOpen(true)}
                >
                  <ListMusic className="w-4 h-4 mr-2" />
                  Add to Playlist
                </Button>
              </div>
              <audio controls className="w-full">
                <source src={resource.secondary_audio_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </motion.div>
        )}
        {resource.main_media_kind === 'file' && resource.main_media_file_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            {(() => {
              const fileUrl = resource.main_media_file_url;
              const isAudio = fileUrl.match(/\.(mp3|wav|ogg|m4a|aac|flac)/i) || fileUrl.includes('healing-resource-images') || fileUrl.includes('content-main-media');
              const isVideo = fileUrl.match(/\.(mp4|webm|mov|avi|mkv)/i);

              if (isAudio) {
                return (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlaylistDialogOpen(true)}
                      >
                        <ListMusic className="w-4 h-4 mr-2" />
                        Add to Playlist
                      </Button>
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

        {/* Journal Reflections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ContextualJournal
            contextType="resource"
            contextId={resource.id}
            contextTitle={resource.title}
            placeholder="Capture your reflections on this resource..."
          />
        </motion.div>

        {/* Playlist Dialog */}
        {resource && (resource.secondary_audio_url || (resource.main_media_kind === 'file' && resource.main_media_file_url)) && (
          <AddToPlaylistDialog
            open={playlistDialogOpen}
            onOpenChange={setPlaylistDialogOpen}
            resourceId={resource.id}
            resourceTitle={resource.title}
          />
        )}
      </div>
    </div>
  );
};

export default DevotionResourcePage;
