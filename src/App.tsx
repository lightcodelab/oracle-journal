import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EncryptionProvider } from "@/hooks/useEncryption";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Temple from "./pages/Temple";
import ImportCards from "./pages/ImportCards";
import NotFound from "./pages/NotFound";
import DoorOfDevotion from "./pages/DoorOfDevotion";
import HealingBot from "./pages/HealingBot";
import MyProtocols from "./pages/MyProtocols";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import DevotionCourses from "./pages/DevotionCourses";
import DevotionCoursePage from "./pages/DevotionCoursePage";
import DevotionLessonPage from "./pages/DevotionLessonPage";
import Journal from "./pages/Journal";
import MyReadings from "./pages/MyReadings";
import AreekeeraBot from "./pages/AreekeeraBot";
import AreekeeraAdmin from "./pages/AreekeeraAdmin";
import ContentAdmin from "./pages/ContentAdmin";
import CourseAdmin from "./pages/CourseAdmin";
import LiveSessions from "./pages/LiveSessions";
import LiveSessionJoin from "./pages/LiveSessionJoin";
import AdminLiveSessions from "./pages/AdminLiveSessions";
import DoorOfCommunion from "./pages/DoorOfCommunion";
import CommunionLiveReadings from "./pages/CommunionLiveReadings";
import CommunionLiveClasses from "./pages/CommunionLiveClasses";
import CommunionLiveWorkshops from "./pages/CommunionLiveWorkshops";
import CommunionLiveMeditations from "./pages/CommunionLiveMeditations";
import LiveReplays from "./pages/LiveReplays";
import AdminSessionReplays from "./pages/AdminSessionReplays";
import MyCalendar from "./pages/MyCalendar";
import Membership from "./pages/Membership";
import MembershipSuccess from "./pages/MembershipSuccess";
import MyAccount from "./pages/MyAccount";
import DevotionSectionPage from "./pages/DevotionSectionPage";
import DevotionResourcePage from "./pages/DevotionResourcePage";
import ProtocolDetailPage from "./pages/ProtocolDetailPage";
import RemembranceSectionPage from "./pages/RemembranceSectionPage";
import MyPlaylists from "./pages/MyPlaylists";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EncryptionProvider>
          <Toaster />
          <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Membership />} />
            <Route path="/temple" element={<Temple />} />
            <Route path="/decks" element={<Index />} />
            <Route path="/decks/section/:section" element={<RemembranceSectionPage />} />
            <Route path="/decks/resources/:slug" element={<DevotionResourcePage />} />
            <Route path="/decks/courses/:slug" element={<DevotionCoursePage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/import-cards" element={<ImportCards />} />
            <Route path="/devotion" element={<DoorOfDevotion />} />
            <Route path="/devotion/healing-bot" element={<HealingBot />} />
            <Route path="/devotion/protocols" element={<MyProtocols />} />
            <Route path="/devotion/protocols/:protocolId" element={<ProtocolDetailPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/content" element={<ContentAdmin />} />
            <Route path="/admin/courses" element={<CourseAdmin />} />
            <Route path="/devotion/energy-hygiene" element={<DevotionCourses />} />
            <Route path="/devotion/section/energy-hygiene-practices" element={<DevotionCourses />} />
            <Route path="/devotion/section/:section" element={<DevotionSectionPage />} />
            <Route path="/devotion/resources/:slug" element={<DevotionResourcePage />} />
            <Route path="/devotion/courses/:slug" element={<DevotionCoursePage />} />
            <Route path="/devotion/course/:courseId" element={<DevotionCoursePage />} />
            <Route path="/devotion/course/:courseId/lesson/:lessonId" element={<DevotionLessonPage />} />
            <Route path="/devotion/areekeera" element={<AreekeeraBot />} />
            <Route path="/admin/areekeera" element={<AreekeeraAdmin />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/readings" element={<MyReadings />} />
            <Route path="/playlists" element={<MyPlaylists />} />
            <Route path="/my-calendar" element={<MyCalendar />} />
            <Route path="/all-live-sessions" element={<LiveSessions />} />
            <Route path="/all-live-sessions/:sessionId/join" element={<LiveSessionJoin />} />
            <Route path="/admin/live-sessions" element={<AdminLiveSessions />} />
            <Route path="/admin/session-replays" element={<AdminSessionReplays />} />
            <Route path="/communion" element={<DoorOfCommunion />} />
            <Route path="/communion/live-readings" element={<CommunionLiveReadings />} />
            <Route path="/communion/live-classes" element={<CommunionLiveClasses />} />
            <Route path="/communion/live-workshops" element={<CommunionLiveWorkshops />} />
            <Route path="/communion/live-meditations" element={<CommunionLiveMeditations />} />
            <Route path="/communion/live-replays" element={<LiveReplays />} />
            <Route path="/membership/success" element={<MembershipSuccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </EncryptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
