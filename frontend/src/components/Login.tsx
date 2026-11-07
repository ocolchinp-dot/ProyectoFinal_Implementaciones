import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { Logo } from './Logo';
import { User } from '../types';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Demo1234!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      onLogin(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-page">
    <div className="login-visual"><div className="visual-grid" /><div className="visual-copy"><span className="eyebrow">GESTIÓN · CONTROL · CRECIMIENTO</span><h1>Tu operación,<br /><em>en orden.</em></h1><p>Una forma más clara de administrar el día a día de Distribuidora Costa Sur.</p><div className="visual-quote"><span>“</span><div>La información correcta<br />en el momento correcto.</div></div></div><div className="visual-footer">RETALHULEU · GUATEMALA <span>●</span> SISTEMA 1.0</div></div>
    <div className="login-panel"><div className="login-head"><Logo compact /><div className="login-kicker">PORTAL ADMINISTRATIVO</div></div><form onSubmit={submit} className="login-form"><h2>Bienvenido de nuevo</h2><p>Ingresa tus credenciales para continuar.</p>{error && <div className="form-alert">{error}</div>}<label>Usuario<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="usuario" /></label><label>Contraseña<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="••••••••" /></label><div className="login-meta"><label className="check"><input type="checkbox" defaultChecked /> Recordarme</label><span>Sesión protegida</span></div><button className="primary-button login-button" disabled={loading}>{loading ? 'Validando…' : 'Iniciar sesión'} <span>→</span></button></form><div className="demo-note"><strong>Acceso de demostración</strong><span>admin · ventas · bodega · gerencia</span><small>Contraseña: Demo1234!</small></div><div className="login-bottom">© 2026 Distribuidora Costa Sur</div></div>
  </div>;
}
