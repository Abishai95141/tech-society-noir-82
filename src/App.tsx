import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import MemberProfile from "@/pages/MemberProfile";
import Me from "@/pages/Me";
import AdminIndex from "@/pages/admin/Index";
import AdminApprovals from "@/pages/admin/Approvals";
import AdminRoles from "@/pages/admin/Roles";
import AdminProjects from "@/pages/admin/Projects";
import AdminEvents from "@/pages/admin/Events";
import ChangePassword from "@/pages/ChangePassword";
import RequireApproval from "@/components/auth/RequireApproval";
import Projects from "@/pages/Projects";
import ProjectCreate from "@/pages/ProjectCreate";
import ProjectDetail from "@/pages/ProjectDetail";
import Events from "@/pages/Events";
import EventCreate from "@/pages/EventCreate";
import EventDetail from "@/pages/EventDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RequireApproval><Dashboard /></RequireApproval>} />
        <Route path="/members" element={<RequireApproval><Members /></RequireApproval>} />
        <Route path="/me" element={<RequireApproval><Me /></RequireApproval>} />
        <Route path="/profile/:userId" element={<RequireApproval><MemberProfile /></RequireApproval>} />
        <Route path="/admin" element={<RequireApproval><AdminIndex /></RequireApproval>} />
        <Route path="/admin/approvals" element={<RequireApproval><AdminApprovals /></RequireApproval>} />
        <Route path="/admin/roles" element={<RequireApproval><AdminRoles /></RequireApproval>} />
        <Route path="/admin/projects" element={<RequireApproval><AdminProjects /></RequireApproval>} />
        <Route path="/admin/events" element={<RequireApproval><AdminEvents /></RequireApproval>} />
        <Route path="/account/change-password" element={<RequireApproval><ChangePassword /></RequireApproval>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/create" element={<RequireApproval><ProjectCreate /></RequireApproval>} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/create" element={<RequireApproval><EventCreate /></RequireApproval>} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
