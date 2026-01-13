import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './Settings.css';

export default function Settings() {
  const { settings, updateSettings, t } = useSettings();
  const [fullName, setFullName] = useState(settings.fullName);
  const [email, setEmail] = useState(settings.email);
  const [language, setLanguage] = useState(settings.language);
  const [theme, setTheme] = useState(settings.theme);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateSettings({ fullName, email, language, theme });
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
        <button type="submit" className="save-btn">
          {t('save')}
        </button>
      </form>
    </div>
  );
}
