import { useNavigate } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
}

const PageBreadcrumb = ({ items }: PageBreadcrumbProps) => {
  const navigate = useNavigate();

  const handleClick = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href && !item.href.startsWith('#')) {
      navigate(item.href);
    }
  };

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center gap-1.5 text-sm"
    >
      {/* Home - Temple */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Go to Temple"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Temple</span>
      </button>

      {/* Breadcrumb items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && (item.href || item.onClick);
        
        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            {isClickable ? (
              <button
                onClick={() => handleClick(item)}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                title={item.label}
              >
                {item.label}
              </button>
            ) : (
              <span 
                className={`${isLast ? 'text-foreground font-medium' : 'text-muted-foreground'} truncate max-w-[120px] sm:max-w-[200px]`}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default PageBreadcrumb;
