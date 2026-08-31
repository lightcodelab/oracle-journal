import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchTheTempleCard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-8 h-full flex flex-col">
      <h3 className="font-serif text-2xl text-foreground mb-1">
        Search The Temple
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Find teachings, resources, and pathways by symptom, resources name, or keyword. Use this if you can't remember the resources name, or you know your symptoms but not which resources will help.
      </p>
      <form onSubmit={handleSearch} className="flex items-center gap-2 mt-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search The Temple"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!searchQuery.trim()}>
          Search
        </Button>
      </form>
    </div>
  );
}
