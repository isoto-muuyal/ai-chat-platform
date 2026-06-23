import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import './PublicPages.css';

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price_usd: string;
};

export default function Pricing() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/billing/packages')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load');
        return response.json();
      })
      .then((data) => setPackages(data.packages || []))
      .catch(() => setError('Pricing is not available right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="public-page">
      <PublicNav />
      <section className="public-band">
        <h1>Simple, pay-as-you-go pricing</h1>
        <p>No subscriptions. Buy a credit pack, and each customer message uses one credit.</p>

        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}

        <div className="pricing-grid">
          {packages.map((pkg) => {
            const rate = Number(pkg.price_usd) / pkg.credits;
            return (
              <div className="pricing-card" key={pkg.id}>
                <h3>{pkg.name}</h3>
                <div className="pricing-price">${Number(pkg.price_usd).toFixed(2)}</div>
                <div className="pricing-credits">{pkg.credits.toLocaleString()} credits</div>
                <div className="pricing-rate">${rate.toFixed(3)} per message</div>
              </div>
            );
          })}
        </div>

        <p className="pricing-note">
          Need a recurring volume plan instead? Once you're chatting regularly, you can switch to a Pro
          plan from <Link to="/account">Your Account</Link> after signing up.
        </p>
      </section>
    </main>
  );
}
