import { HashRouter, Navigate, Route, Routes } from 'react-router';

import { Layout, Toasts } from './components/Layout';
import { AdminProvider, useAdmin } from './lib/admin';
import { Categories } from './pages/Categories';
import { ContentEditor } from './pages/ContentEditor';
import { ContentList } from './pages/ContentList';
import { Dashboard } from './pages/Dashboard';
import { Login, NotAdmin } from './pages/Login';
import { Monetization } from './pages/Monetization';
import { Readers } from './pages/Readers';
import { Settings } from './pages/Settings';

function Gate() {
  const { connection, session, isAdmin, authReady } = useAdmin();
  if (!authReady) return <div className="login" />;
  if (connection.mode === 'supabase' && !session) {
    return (
      <>
        <Login />
        <Toasts />
      </>
    );
  }
  if (connection.mode === 'supabase' && isAdmin === false) return <NotAdmin />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="content" element={<ContentList />} />
        <Route path="content/:id" element={<ContentEditor />} />
        <Route path="categories" element={<Categories />} />
        <Route path="monetization" element={<Monetization />} />
        <Route path="readers" element={<Readers />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AdminProvider>
        <Gate />
      </AdminProvider>
    </HashRouter>
  );
}
