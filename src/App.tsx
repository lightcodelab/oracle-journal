import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EncryptionProvider } from "@/hooks/useEncryption";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Temple from "./pages/Temple";
import ImportCards from "./pages/ImportCards";
import NotFound from "./pages/NotFound";
import DoorOfDevotion from "./pages/DoorOfDevotion";
// HealingBot / Maelin retired 2026-07-20 — see docs/DEPRECATED_MAELIN.md
// Route redirected to the AreekeerA Protocol Builder. Data + file preserved
// for retention review.
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
import CardDeckAdmin from "./pages/CardDeckAdmin";
import SnailMailAdmin from "./pages/SnailMailAdmin";
import Tools from "./pages/Tools";
import ToolDetail from "./pages/ToolDetail";
import ToolReflection from "./pages/ToolReflection";
import TransformationToolsAdmin from "./pages/TransformationToolsAdmin";
import MyTracking from "./pages/MyTracking";
import LiveSessions from "./pages/LiveSessions";
import LiveSessionJoin from "./pages/LiveSessionJoin";
import AdminLiveSessions from "./pages/AdminLiveSessions";
import DoorOfCommunion from "./pages/DoorOfCommunion";
import CommunionLiveReadings from "./pages/CommunionLiveReadings";
import CommunionLiveClasses from "./pages/CommunionLiveClasses";
import CommunionLiveWorkshops from "./pages/CommunionLiveWorkshops";
import CommunionLiveMeditations from "./pages/CommunionLiveMeditations";
import LiveReplays from "./pages/LiveReplays";
import MirrorExchange from "./pages/MirrorExchange";
import AdminSessionReplays from "./pages/AdminSessionReplays";
import UserManagement from "./pages/UserManagement";
import MyCalendar from "./pages/MyCalendar";
import Membership from "./pages/Membership";
import MembershipSuccess from "./pages/MembershipSuccess";
import MyAccount from "./pages/MyAccount";
import DevotionSectionPage from "./pages/DevotionSectionPage";
import DevotionResourcePage from "./pages/DevotionResourcePage";
import ProtocolDetailPage from "./pages/ProtocolDetailPage";
import RemembranceSectionPage from "./pages/RemembranceSectionPage";
import MyPlaylists from "./pages/MyPlaylists";
import SacredSpreads from "./pages/SacredSpreads";
import SearchResults from "./pages/SearchResults";
import FeatureSuggestions from "./pages/FeatureSuggestions";
import BugReports from "./pages/BugReports";
import InstallAppProvider from "./components/InstallAppDialog";
import NewsletterBanner from "./components/NewsletterBanner";
import AffiliateRedirect from "./pages/AffiliateRedirect";
import AffiliatePortal from "./pages/AffiliatePortal";
import AdminAffiliates from "./pages/AdminAffiliates";
import AdminQuizzes from "./pages/AdminQuizzes";
import AdminQuizEditor from "./pages/AdminQuizEditor";
import AdminQuizAnalytics from "./pages/AdminQuizAnalytics";
import QuizPlayer from "./pages/QuizPlayer";
import OAuthConsent from "./pages/OAuthConsent";
import AdminHomeRecommendations from "./pages/AdminHomeRecommendations";
import { captureRefFromQueryString } from "@/lib/affiliateTracking";
import { useEffect } from "react";
const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    void captureRefFromQueryString();
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EncryptionProvider>
          <Toaster />
          <Sonner />
          <InstallAppProvider>
          <NewsletterBanner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Membership />} />
            <Route path="/membership" element={<Navigate to="/" replace />} />
            <Route path="/temple" element={<Temple />} />
            <Route path="/decks" element={<Index />} />
            <Route path="/decks/section/:section" element={<RemembranceSectionPage />} />
            <Route path="/decks/spreads" element={<SacredSpreads />} />
            <Route path="/decks/resources/:slug" element={<DevotionResourcePage />} />
            <Route path="/decks/courses/:slug" element={<DevotionCoursePage />} />
            <Route path="/decks/course/:courseId" element={<DevotionCoursePage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/import-cards" element={<ImportCards />} />
            <Route path="/devotion" element={<DoorOfDevotion />} />
            <Route path="/devotion/healing-bot" element={<Navigate to="/devotion/areekeera" replace />} />
            <Route path="/devotion/protocols" element={<MyProtocols />} />
            <Route path="/devotion/protocols/:protocolId" element={<ProtocolDetailPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/content" element={<ContentAdmin />} />
            <Route path="/admin/courses" element={<CourseAdmin />} />
            <Route path="/admin/card-decks" element={<CardDeckAdmin />} />
            <Route path="/admin/snail-mail" element={<SnailMailAdmin />} />
            <Route path="/admin/transformation-tools" element={<TransformationToolsAdmin />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/:slug" element={<ToolDetail />} />
            <Route path="/tools/:slug/new" element={<ToolReflection />} />
            <Route path="/tracking" element={<MyTracking />} />
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
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/communion" element={<DoorOfCommunion />} />
            <Route path="/communion/live-readings" element={<CommunionLiveReadings />} />
            <Route path="/communion/live-classes" element={<CommunionLiveClasses />} />
            <Route path="/communion/live-workshops" element={<CommunionLiveWorkshops />} />
            <Route path="/communion/live-meditations" element={<CommunionLiveMeditations />} />
            <Route path="/communion/live-replays" element={<LiveReplays />} />
            <Route path="/communion/mirror-exchange" element={<MirrorExchange />} />
            <Route path="/membership/success" element={<MembershipSuccess />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/suggestions" element={<FeatureSuggestions />} />
            <Route path="/bugs" element={<BugReports />} />
            <Route path="/r/:code" element={<AffiliateRedirect />} />
            <Route path="/affiliate" element={<AffiliatePortal />} />
            <Route path="/admin/affiliates" element={<AdminAffiliates />} />
            <Route path="/admin/quizzes" element={<AdminQuizzes />} />
            <Route path="/admin/quizzes/:id" element={<AdminQuizEditor />} />
            <Route path="/admin/quizzes/:id/analytics" element={<AdminQuizAnalytics />} />
            <Route path="/admin/home-recommendations" element={<AdminHomeRecommendations />} />
            <Route path="/quiz/:slug" element={<QuizPlayer />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </InstallAppProvider>
        </EncryptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
