import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Headphones, FileText, BookOpen, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContentResource } from '@/hooks/useContentByLocation';

interface ResourceCardProps {
  resource: ContentResource;
  index: number;
  showDraftBadge?: boolean;
  basePath?: string; // e.g., '/devotion' or '/remembrance'
  comingSoon?: boolean;
  squareThumb?: boolean;
}

const ResourceCard = ({ resource, index, showDraftBadge = false, basePath = '/devotion', comingSoon = false, squareThumb = false }: ResourceCardProps) => {
  const navigate = useNavigate();

  const getMediaIcon = () => {
    if (resource.main_media_kind === 'video_embed') {
      return <Play className="w-4 h-4" />;
    }
    if (resource.main_media_kind === 'file' && resource.main_media_file_url) {
      // Check file extension for audio
      if (resource.main_media_file_url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
        return <Headphones className="w-4 h-4" />;
      }
      // Video files
      if (resource.main_media_file_url.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
        return <Play className="w-4 h-4" />;
      }
    }
    return <FileText className="w-4 h-4" />;
  };

  const handleClick = () => {
    // Legacy courses from the courses table use a different route
    if (resource.slug.startsWith('legacy-course-')) {
      const courseId = resource.slug.replace('legacy-course-', '');
      navigate(`${basePath}/course/${courseId}`);
    } else if (resource.is_course) {
      navigate(`${basePath}/courses/${resource.slug}`);
    } else {
      navigate(`${basePath}/resources/${resource.slug}`);
    }
  };

  const isDraft = resource.status === 'draft';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={comingSoon ? undefined : handleClick}
      className={`group ${comingSoon ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className={`bg-card border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30 ${
        isDraft ? 'border-amber-500/50' : 'border-border'
      }`}>
        {/* Thumbnail */}
        <div className={`${squareThumb ? 'aspect-square' : 'aspect-video'} w-full overflow-hidden bg-muted relative`}>
          {resource.thumbnail_url ? (
            <img
              src={resource.thumbnail_url}
              alt={resource.title}
              className={`w-full h-full object-cover transition-transform duration-300 ${comingSoon ? 'grayscale opacity-60' : 'group-hover:scale-105'}`}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${comingSoon ? 'opacity-60' : ''}`}>
              <div className="text-muted-foreground">
                {resource.is_course ? <BookOpen className="w-12 h-12" /> : getMediaIcon()}
              </div>
            </div>
          )}

          {/* Coming Soon overlay */}
          {comingSoon && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
              <Badge className="bg-muted text-muted-foreground border border-border text-sm px-4 py-1.5 font-serif">
                Coming Soon
              </Badge>
            </div>
          )}
          
          {/* Draft badge and edit button overlay */}
          {showDraftBadge && isDraft && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 bg-white/90 hover:bg-white text-zinc-800 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/content?edit=${resource.id}`);
                }}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                Draft
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-serif text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {resource.title}
            </h3>
            <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              {resource.is_course ? <BookOpen className="w-4 h-4" /> : getMediaIcon()}
            </div>
          </div>

          {resource.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {resource.summary}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {comingSoon && (
              <Badge className="bg-muted text-muted-foreground border border-border text-xs font-serif">
                Coming Soon
              </Badge>
            )}
            {resource.is_course && (
              <Badge variant="secondary" className="text-xs">
                Course
              </Badge>
            )}
            {resource.resource_type && !(resource.is_course && resource.resource_type.slug === 'course') && (
              <Badge variant="outline" className="text-xs">
                {resource.resource_type.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResourceCard;
