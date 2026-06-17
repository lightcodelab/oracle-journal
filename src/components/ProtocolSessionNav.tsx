import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Play, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProtocolStep {
  id: string;
  step_index: number;
  resource_id: string | null;
  is_completed: boolean | null;
  resource?: {
    id: string;
    title: string;
    modality: string;
    duration_sec: number | null;
  } | null;
}

interface ProtocolSessionNavProps {
  steps: ProtocolStep[];
  protocolId: string;
  currentStepIndex?: number;
  protocolTitle?: string;
  onStepClick: (stepIndex: number) => void;
}

export default function ProtocolSessionNav({
  steps,
  protocolId,
  currentStepIndex,
  protocolTitle,
  onStepClick,
}: ProtocolSessionNavProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleStepClick = (stepIndex: number) => {
    setIsMobileOpen(false);
    onStepClick(stepIndex);
  };

  const completedCount = steps.filter(s => s.is_completed).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "md:hidden fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-lg shadow-lg transition-opacity",
          isMobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 md:w-72 bg-card border-r border-border flex flex-col transition-transform duration-300",
          isMobileOpen ? "translate-x-0 z-50" : "-translate-x-full md:translate-x-0 z-40"
        )}
      >
        {/* Protocol Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between">
            {protocolTitle && (
              <h2 className="font-serif text-lg text-foreground leading-tight">
                {protocolTitle}
              </h2>
            )}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1 hover:bg-muted rounded ml-2"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{completedCount} of {steps.length} complete</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps List */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-0.5">
            {steps.map((step) => {
              const isActive = step.step_index === currentStepIndex;
              const isCompleted = step.is_completed;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.step_index)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-md text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mt-0.5",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      step.step_index
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm leading-tight block",
                      isActive && "font-medium"
                    )}>
                      {step.resource?.title || `Step ${step.step_index}`}
                    </span>
                    {step.resource?.modality && (
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] mt-1 capitalize"
                      >
                        {step.resource.modality}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
