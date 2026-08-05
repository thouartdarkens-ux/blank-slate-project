
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import VouchersPage from "./pages/VouchersPage";
import TransactionsPage from "./pages/TransactionsPage";
import AlertsPage from "./pages/AlertsPage"; 
import BulkMessagesPage from "./pages/BulkMessagesPage";
import SettingsPage from "./pages/SettingsPage";
import ListPage from "./pages/ListPage";
import UniversityDataPage from "./pages/UniversityDataPage";
import AffiliatesControlPanelPage from "./pages/AffiliatesControlPanelPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/vouchers" element={<ProtectedRoute><VouchersPage /></ProtectedRoute>} />
            <Route path="/list" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
            <Route path="/bulk-messages" element={<ProtectedRoute><BulkMessagesPage /></ProtectedRoute>} />
            <Route path="/university-data" element={<ProtectedRoute><UniversityDataPage /></ProtectedRoute>} />
            <Route path="/affiliates-control-panel" element={<ProtectedRoute><AffiliatesControlPanelPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
