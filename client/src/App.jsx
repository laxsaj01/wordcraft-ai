import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import AppLayout from './components/AppLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Landing from './pages/Landing.jsx';
import Install from './pages/Install.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Writer from './pages/Writer.jsx';
import Documents from './pages/Documents.jsx';
import Chat from './pages/Chat.jsx';
import Plans from './pages/Plans.jsx';
import BillingReturn from './pages/BillingReturn.jsx';
import Referral from './pages/Referral.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Tickets from './pages/Tickets.jsx';
import Profile from './pages/Profile.jsx';
import BlogList from './pages/BlogList.jsx';
import BlogPost from './pages/BlogPost.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminPlans from './pages/admin/AdminPlans.jsx';
import AdminPayments from './pages/admin/AdminPayments.jsx';
import AdminBlog from './pages/admin/AdminBlog.jsx';
import AdminTickets from './pages/admin/AdminTickets.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

function Protected({ children, admin }) {
  const { user, loading, system } = useAuth();
  if (loading) return <div className="fullpage-loader"><div className="spinner spinner-dark" style={{ width: 30, height: 30 }} /></div>;
  if (!system.installed) return <Navigate to="/install" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  const { system, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !system.installed && window.location.pathname !== '/install') {
      navigate('/install', { replace: true });
    }
  }, [loading, system.installed, navigate]);

  return (
    <ToastProvider>
      <Routes>
        <Route path="/install" element={<Install />} />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/plans" element={<Landing pricingAnchor />} />
        <Route path="/billing/return" element={<BillingReturn />} />

        <Route path="/app" element={<Protected><AppLayout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="writer" element={<Writer />} />
          <Route path="writer/:templateId" element={<Writer />} />
          <Route path="documents" element={<Documents />} />
          <Route path="chat" element={<Chat />} />
          <Route path="plans" element={<Plans />} />
          <Route path="referral" element={<Referral />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/admin" element={<Protected admin><AdminLayout /></Protected>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
