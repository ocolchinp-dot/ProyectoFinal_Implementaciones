import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DirectoryPage } from './pages/DirectoryPage';
import { InventoryPage } from './pages/InventoryPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditPage } from './pages/AuditPage';
import { api } from './lib/api';
import { User } from './types';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    api<{ user: User }>('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <div className="loading-page"><div className="spinner" /> Verificando sesión…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const can = (roles: User['role'][]) => roles.includes(user.role);
  const content = page === 'dashboard' ? <Dashboard onNavigate={setPage} /> : page === 'clients' ? <DirectoryPage kind="clients" canEdit={can(['ADMIN', 'VENTAS'])} /> : page === 'suppliers' ? <DirectoryPage kind="suppliers" canEdit={can(['ADMIN', 'BODEGA'])} /> : page === 'products' ? <DirectoryPage kind="products" canEdit={can(['ADMIN', 'BODEGA'])} /> : page === 'inventory' ? <InventoryPage canEdit={can(['ADMIN', 'BODEGA'])} /> : page === 'sales' ? <TransactionsPage type="sales" canEdit={can(['ADMIN', 'VENTAS'])} /> : page === 'purchases' ? <TransactionsPage type="purchases" canEdit={can(['ADMIN', 'BODEGA'])} /> : page === 'reports' ? <ReportsPage /> : page === 'users' ? <UsersPage /> : page === 'audit' ? <AuditPage /> : <Dashboard onNavigate={setPage} />;
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { setUser(null); } };
  return <Layout user={user} page={page} setPage={setPage} onLogout={() => void logout()}>{content}</Layout>;
}
