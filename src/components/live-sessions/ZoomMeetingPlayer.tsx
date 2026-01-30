import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ZoomMeetingPlayerProps {
  sessionId: string;
  meetingNumber: string;
  onLeave?: () => void;
}

declare global {
  interface Window {
    ZoomMtg: any;
  }
}

export function ZoomMeetingPlayer({ sessionId, meetingNumber, onLeave }: ZoomMeetingPlayerProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadZoomSDK = async () => {
      try {
        // Load Zoom Web SDK
        const script = document.createElement('script');
        script.src = 'https://source.zoom.us/2.18.2/lib/vendor/react.min.js';
        document.head.appendChild(script);

        const script2 = document.createElement('script');
        script2.src = 'https://source.zoom.us/2.18.2/lib/vendor/react-dom.min.js';
        document.head.appendChild(script2);

        const script3 = document.createElement('script');
        script3.src = 'https://source.zoom.us/2.18.2/lib/vendor/redux.min.js';
        document.head.appendChild(script3);

        const script4 = document.createElement('script');
        script4.src = 'https://source.zoom.us/2.18.2/lib/vendor/redux-thunk.min.js';
        document.head.appendChild(script4);

        const script5 = document.createElement('script');
        script5.src = 'https://source.zoom.us/2.18.2/lib/vendor/lodash.min.js';
        document.head.appendChild(script5);

        const zoomScript = document.createElement('script');
        zoomScript.src = 'https://source.zoom.us/2.18.2/zoom-meeting-embedded-2.18.2.min.js';
        document.head.appendChild(zoomScript);

        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://source.zoom.us/2.18.2/css/bootstrap.css';
        document.head.appendChild(cssLink);

        const cssLink2 = document.createElement('link');
        cssLink2.rel = 'stylesheet';
        cssLink2.href = 'https://source.zoom.us/2.18.2/css/react-select.css';
        document.head.appendChild(cssLink2);

        // Wait for SDK to load
        await new Promise((resolve) => {
          zoomScript.onload = resolve;
        });

        // Give it a moment to initialize
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await initializeMeeting();
      } catch (err) {
        console.error('Error loading Zoom SDK:', err);
        setError('Failed to load video conferencing. Please refresh the page.');
        setIsLoading(false);
      }
    };

    const initializeMeeting = async () => {
      try {
        if (!window.ZoomMtg) {
          throw new Error('Zoom SDK not loaded');
        }

        // Get signature from our edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const response = await supabase.functions.invoke('zoom-sdk-signature', {
          body: { meetingNumber, sessionId },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to get meeting signature');
        }

        const { signature, sdkKey, password, role } = response.data;

        // Initialize Zoom
        window.ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.2/lib', '/av');
        window.ZoomMtg.preLoadWasm();
        window.ZoomMtg.prepareWebSDK();

        window.ZoomMtg.init({
          leaveUrl: window.location.origin + '/all-live-sessions',
          isSupportAV: true,
          success: () => {
            console.log('Zoom SDK initialized');
            
            window.ZoomMtg.join({
              signature,
              sdkKey,
              meetingNumber,
              passWord: password,
              userName: user?.email?.split('@')[0] || 'Guest',
              userEmail: user?.email || '',
              tk: '',
              zak: '', // Not needed for participants
              success: () => {
                console.log('Joined meeting successfully');
                setIsLoading(false);
              },
              error: (err: any) => {
                console.error('Error joining meeting:', err);
                setError('Failed to join the meeting. Please try again.');
                setIsLoading(false);
              },
            });
          },
          error: (err: any) => {
            console.error('Error initializing Zoom:', err);
            setError('Failed to initialize video. Please refresh the page.');
            setIsLoading(false);
          },
        });

      } catch (err: any) {
        console.error('Meeting initialization error:', err);
        setError(err.message || 'Failed to join meeting');
        setIsLoading(false);
      }
    };

    loadZoomSDK();

    return () => {
      if (window.ZoomMtg) {
        try {
          window.ZoomMtg.leaveMeeting({});
        } catch (e) {
          console.log('Could not leave meeting cleanly');
        }
      }
    };
  }, [meetingNumber, sessionId, user]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-center">{error}</p>
        <Button onClick={onLeave}>Go Back</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg">Connecting to session...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} id="zmmtg-root" className="min-h-screen">
      {/* Zoom SDK will render here */}
    </div>
  );
}
