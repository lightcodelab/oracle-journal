import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface EditorInfo {
  userId: string;
  email: string;
  startedAt: string;
}

interface ResourceEditLockWarningProps {
  lockedBy: EditorInfo;
  onGoBack: () => void;
}

const ResourceEditLockWarning = ({ lockedBy, onGoBack }: ResourceEditLockWarningProps) => {
  const startedAt = new Date(lockedBy.startedAt);
  const formattedTime = format(startedAt, 'h:mm a');

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md w-full bg-destructive/10 border border-destructive/30 rounded-lg p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-serif text-foreground">
            Resource Currently Being Edited
          </h2>
          <p className="text-muted-foreground">
            This resource is currently being edited by another administrator.
          </p>
        </div>

        <div className="bg-background/50 rounded-md p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-medium">{lockedBy.email}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Started editing at {formattedTime}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Please wait for them to finish or coordinate with them directly before making changes.
        </p>

        <Button onClick={onGoBack} variant="outline" className="w-full">
          Go Back to Library
        </Button>
      </div>
    </div>
  );
};

export default ResourceEditLockWarning;
