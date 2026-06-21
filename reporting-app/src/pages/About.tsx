import { Link } from 'react-router-dom';
import './PublicPages.css';

export default function About() {
  return (
    <main className="public-page">
      <nav className="public-nav">
        <strong>AI Chat Platform</strong>
        <div>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign up</Link>
        </div>
      </nav>
      <section className="public-hero">
        <div>
          <h1>Client-ready chatbot operations for web, SMS, and WhatsApp.</h1>
          <p>
            Launch branded AI assistants for different customers, connect them to common messaging
            channels, and manage the knowledge, usage, and reporting behind every conversation.
          </p>
          <Link className="primary-link" to="/signup">Create an account</Link>
        </div>
      </section>
      <section className="public-band">
        <h2>Built for service teams and agencies</h2>
        <div className="feature-grid">
          <article>
            <h3>Multi-client setup</h3>
            <p>Separate accounts, source configuration, model destinations, and reporting keep each customer isolated.</p>
          </article>
          <article>
            <h3>Channel coverage</h3>
            <p>Connect web chat, WhatsApp, SMS, and direct API integrations from one management surface.</p>
          </article>
          <article>
            <h3>Context control</h3>
            <p>Upload customer context so each agent can answer with the right tone, policies, and business details.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
