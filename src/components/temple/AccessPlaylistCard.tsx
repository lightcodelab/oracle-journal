import { Link } from "react-router-dom";
import { ListMusic, Plus, Headphones } from "lucide-react";
import { usePlaylists } from "@/hooks/usePlaylists";

export function AccessPlaylistCard() {
  const { playlists, loading } = usePlaylists();

  if (loading) return null;

  const hasPlaylists = playlists.length > 0;
  const visiblePlaylists = playlists.slice(0, 5);

  return (
    <section
      id="access-playlist"
      aria-labelledby="access-playlist-heading"
      className="mb-12"
    >
      <h2
        id="access-playlist-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Access a Playlist
      </h2>
      {hasPlaylists ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visiblePlaylists.map((playlist) => (
            <Link
              key={playlist.id}
              to="/playlists"
              className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[64px]"
            >
              <ListMusic
                className="h-5 w-5 text-primary flex-shrink-0"
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block font-serif text-foreground text-sm sm:text-base truncate">
                  {playlist.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {playlist.track_count}{" "}
                  {playlist.track_count === 1 ? "track" : "tracks"}
                </span>
              </span>
            </Link>
          ))}
          <Link
            to="/playlists"
            className="group flex items-center gap-3 p-4 rounded-lg border border-dashed border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[64px]"
          >
            <Plus className="h-5 w-5 text-primary flex-shrink-0" aria-hidden />
            <span className="font-serif text-foreground text-sm sm:text-base">
              New playlist
            </span>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Headphones
              className="h-5 w-5 text-primary flex-shrink-0"
              aria-hidden
            />
            <p className="font-serif text-foreground text-sm sm:text-base">
              You don't have a playlist yet. Here is how to create one:
            </p>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Open any audio resource or lesson in the Door of Devotion.
            </li>
            <li>
              Choose <span className="text-foreground">Add to Playlist</span>{" "}
              and pick the playlist you would like it in — or create a new one
              on the spot.
            </li>
            <li>
              Return to{" "}
              <Link
                to="/playlists"
                className="text-primary underline underline-offset-2 hover:text-primary-strong"
              >
                My Playlists
              </Link>{" "}
              whenever you want to listen.
            </li>
          </ol>
          <Link
            to="/playlists"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-strong"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Start a playlist
          </Link>
        </div>
      )}
    </section>
  );
}
