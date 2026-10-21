import { DoorSectionBand } from '@/components/temple/DoorSectionBand';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DoorOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import NavActions from "@/components/NavActions";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { DoorHeader } from "@/components/temple/DoorHeader";
import { BecomingCoursesSection } from "@/components/becoming/BecomingCoursesSection";
import becomingHeader from "@/assets/companion-courses-header.png.asset.json";

export default function DoorOfBecoming() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    };

    void checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse font-serif text-xl text-primary">Opening the Door of Becoming...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background px-4 py-12">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between">
        <PageBreadcrumb items={[{ label: "The Door of Becoming", icon: DoorOpen }]} />
        <NavActions />
      </div>

      <div className="mx-auto max-w-6xl pt-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          <DoorHeader image={becomingHeader.url} imageKey="door-becoming-header" title="The Door of Becoming" />
          <div className="mx-auto max-w-2xl space-y-3 font-sans text-base text-muted-foreground">
            <p className="font-bold text-primary-strong">A space for self-awareness, identity integration, and conscious evolution.</p>
            <p>Mini-courses and deep-dive journeys to integrate what is revealed in the silence.</p>
          </div>
        </motion.div>

        <DoorSectionBand door="becoming" index={0} legacyLocations={['loc-remembrance-courses']} />
        <DoorSectionBand door="becoming" index={1} />
        <DoorSectionBand door="becoming" index={2} />
      </div>
    </div>
  );
}