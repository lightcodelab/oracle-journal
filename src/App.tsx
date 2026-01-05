import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Temple from "./pages/Temple";
import ImportCards from "./pages/ImportCards";
import NotFound from "./pages/NotFound";
import DoorOfSeeing from "./pages/DoorOfSeeing";
import SeeingCourses from "./pages/SeeingCourses";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Temple />} />
          <Route path="/decks" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/import-cards" element={<ImportCards />} />
          <Route path="/seeing" element={<DoorOfSeeing />} />
          <Route path="/seeing/courses" element={<SeeingCourses />} />
          <Route path="/seeing/course/:courseId" element={<CoursePage />} />
          <Route path="/seeing/course/:courseId/lesson/:lessonId" element={<LessonPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
