import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery('');
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-foreground/70 hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources…"
        className="h-8 w-40 md:w-56 text-sm bg-card"
        onBlur={() => {
          if (!query.trim()) setIsOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
            setQuery('');
          }
        }}
      />
      <Button type="submit" variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground">
        <Search className="w-4 h-4" />
      </Button>
    </form>
  );
};

export default GlobalSearch;
