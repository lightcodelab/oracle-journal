import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface MembershipInviteProps {
  heading?: string;
  body?: string;
  className?: string;
}

/**
 * Shown to free accounts under their reading and on locked spreads.
 */
const MembershipInvite = ({
  heading = 'There is more waiting for you',
  body = 'Your free reading is yours to keep. Membership opens the other five spreads, every card deck, the courses, the Remembrance Letters, Living Pattern and your private journal.',
  className = '',
}: MembershipInviteProps) => {
  return (
    <div
      className={`rounded-lg border border-primary/30 bg-primary/5 p-6 text-center ${className}`}
    >
      <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" aria-hidden />
      <h3 className="font-serif text-xl text-foreground">{heading}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/#membership">Join THE TEMPLE</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/readings">View your saved reading</Link>
        </Button>
      </div>
    </div>
  );
};

export default MembershipInvite;
