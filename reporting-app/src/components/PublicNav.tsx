import { Link } from 'react-router-dom';

export default function PublicNav() {
  return (
    <nav className="public-nav">
      <strong>AI Chat Platform</strong>
      <div>
        <Link to="/about">About Us</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign up</Link>
      </div>
    </nav>
  );
}
