import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CmsPage from './pages/CmsPage';
import Contact from './pages/Contact';
import Pricing from './pages/Pricing';
import AuthCallback from './pages/AuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Topics from './pages/Topics';
import Troll from './pages/Troll';
import Users from './pages/Users';
import Conversations from './pages/Conversations';
import ConversationDetail from './pages/ConversationDetail';
import Recommendations from './pages/Recommendations';
import Settings from './pages/Settings';
import SourceManagement from './pages/SourceManagement';
import ClientManagement from './pages/ClientManagement';
import AdminContent from './pages/AdminContent';
import AdminPayPal from './pages/AdminPayPal';
import AdminStatistics from './pages/AdminStatistics';
import AdminCostCalculator from './pages/AdminCostCalculator';
import YourAccount from './pages/YourAccount';
import MessageBoards from './pages/MessageBoards';
import AgentContext from './pages/AgentContext';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/about" element={<CmsPage slug="about-us" />} />
        <Route path="/how-it-works" element={<CmsPage slug="how-it-works" />} />
        <Route path="/privacy" element={<CmsPage slug="privacy-statement" />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="topics" element={<Topics />} />
          <Route path="troll" element={<Troll />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sources" element={<SourceManagement />} />
          <Route path="agent-context" element={<AgentContext />} />
          <Route path="account" element={<YourAccount />} />
          <Route path="admin/clients" element={<ClientManagement />} />
          <Route path="admin/content" element={<AdminContent />} />
          <Route path="admin/paypal" element={<AdminPayPal />} />
          <Route path="admin/statistics" element={<AdminStatistics />} />
          <Route path="admin/cost-calculator" element={<AdminCostCalculator />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversations/:id" element={<ConversationDetail />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="message-boards" element={<MessageBoards />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
