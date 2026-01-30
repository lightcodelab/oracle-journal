import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveSession } from '@/hooks/useLiveSessions';
import { getSessionTypeConfig } from '@/lib/sessionTypeConfig';
import { cn } from '@/lib/utils';

interface SessionCalendarProps {
  sessions: LiveSession[];
  onSessionClick: (session: LiveSession) => void;
}

export function SessionCalendar({ sessions, onSessionClick }: SessionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, LiveSession[]>();
    sessions.forEach(session => {
      const dateKey = format(new Date(session.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(session);
    });
    return map;
  }, [sessions]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {(['reading', 'class', 'workshop'] as const).map(type => {
          const config = getSessionTypeConfig(type);
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded', config.bgColor, config.borderColor, 'border')} />
              <Icon className={cn('h-4 w-4', config.textColor)} />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDay.get(dateKey) || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] p-1 border rounded-md',
                isCurrentMonth ? 'bg-background' : 'bg-muted/30',
                isToday && 'ring-2 ring-primary'
              )}
            >
              <div className={cn(
                'text-sm font-medium mb-1 px-1',
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                isToday && 'text-primary'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {daySessions.slice(0, 3).map(session => {
                  const config = getSessionTypeConfig(session.session_type);
                  const Icon = config.icon;
                  
                  return (
                    <button
                      key={session.id}
                      onClick={() => onSessionClick(session)}
                      className={cn(
                        'w-full text-left p-1.5 rounded text-xs transition-colors',
                        config.calendarClass
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className={cn('h-3 w-3 flex-shrink-0', config.textColor)} />
                        <span className="truncate font-medium">{session.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{format(new Date(session.scheduled_at), 'h:mm a')}</span>
                      </div>
                    </button>
                  );
                })}
                {daySessions.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{daySessions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
