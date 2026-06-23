import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function PublicNav() {
  return (
    <nav className="public-nav">
      <Link to="/about" className="brand-link">
        <Logo />
      </Link>
      <div>
        <Link to="/about">About Us</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup" className="nav-cta">Sign up</Link>
      </div>
    </nav>
  );
}
