import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MobileBottomNav from "./components/MobileBottomNav";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import AnimeDetail from "./pages/AnimeDetail";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import History from "./pages/History";
import News from "./pages/News";
import Manga from "./pages/Manga";
import MangaDetail from "./pages/MangaDetail";
import Requests from "./pages/Requests";
import Shop from "./pages/Shop";
import ShopProduct from "./pages/ShopProduct";
import ShopAdmin from "./pages/ShopAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/anime/:slug" element={<ProtectedRoute><AnimeDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
            <Route path="/manga" element={<ProtectedRoute><Manga /></ProtectedRoute>} />
            <Route path="/manga/:id" element={<ProtectedRoute><MangaDetail /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:id" element={<ShopProduct />} />
            <Route path="/shop-admin" element={<ProtectedRoute><ShopAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
