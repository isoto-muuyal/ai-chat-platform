import { useState } from 'react';
import PublicNav from '../components/PublicNav';
import './PublicPages.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Failed to submit');
      setForm({ name: '', email: '', message: '' });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="public-page">
      <PublicNav />
      <section className="public-band">
        <h1>Contact Us</h1>
        {status === 'sent' ? (
          <p>Thanks for reaching out — we'll get back to you shortly.</p>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            {status === 'error' && <div className="error">Something went wrong. Please try again.</div>}
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
            <label>
              Message
              <textarea
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                rows={6}
                required
              />
            </label>
            <button type="submit" className="primary-button" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
