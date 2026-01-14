import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

export default function Settings() {
  const { settings, updateSettings, t } = useSettings();
  const { user, refreshMe } = useAuth();
  const [fullName, setFullName] = useState(settings.fullName);
  const [email, setEmail] = useState(settings.email);
  const [company, setCompany] = useState(settings.company);
  const [language, setLanguage] = useState(settings.language);
  const [theme, setTheme] = useState(settings.theme);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setCompany(user.company || '');
      setLanguage(user.language || settings.language);
      setTheme(user.theme || settings.theme);
    }
  }, [user, settings.language, settings.theme]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    const payload: Record<string, string> = {
      fullName,
      email,
      company,
      language,
      theme,
    };
    if (currentPassword || newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    const response = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      setStatus(error.error || 'Failed to update settings');
      return;
    }

    const data = await response.json();
    updateSettings({
      fullName: data.fullName || '',
      email: data.email || '',
      company: data.company || '',
      language: data.language || language,
      theme: data.theme || theme,
    });
    setCurrentPassword('');
    setNewPassword('');
    setStatus('Saved');
    await refreshMe();
  };

  return (
    <div className="settings">
      <h2>{t('settings')}</h2>
      <form className="settings-form" onSubmit={handleSave}>
        <label>
          {t('fullName')}
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          {t('email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t('company')}
          <input value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
        <label>
          {t('language')}
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}>
            <option value="en">{t('english')}</option>
            <option value="es">{t('spanish')}</option>
          </select>
        </label>
        <label>
          {t('theme')}
          <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}>
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </label>
        <label>
          {t('currentPassword')}
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          {t('newPassword')}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="save-btn">
          {t('save')}
        </button>
        {status && <div className="status">{status === 'Saved' ? t('saved') : status}</div>}
      </form>
    </div>
  );
}
