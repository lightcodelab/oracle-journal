import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, Headphones, FileText, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ContentResource } from '@/hooks/useContentByLocation';

interface ResourceCardProps {
  resource: ContentResource;
  index: number;
}

const ResourceCard = ({ resource, index }: ResourceCardProps) => {
  const navigate = useNavigate();

  const getMediaIcon = () => {
    switch (resource.main_media_kind) {
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'audio':
        return <Headphones className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleClick = () => {
    if (resource.is_course) {
      navigate(`/devotion/courses/${resource.slug}`);
    } else {
      navigate(`/devotion/resources/${resource.slug}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={handleClick}
      className="group cursor-pointer"
    >
      <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:border-primary/30">
        {/* Thumbnail */}
        {resource.thumbnail_url && (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={resource.thumbnail_url}
              alt={resource.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

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
            {resource.is_course && (
              <Badge variant="secondary" className="text-xs">
                Course
              </Badge>
            )}
            {resource.resource_type && (
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
