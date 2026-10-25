import { useEffect, useState } from 'react';
import Orb from '../three/Orb';
import ThemeToggle from './ThemeToggle';

export default function Splash({
  dark,
  onToggleTheme,
}: {
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="splash">
      <ThemeToggle
        dark={dark}
        onToggle={onToggleTheme}
        className="welcome-theme-toggle"
      />
      <div
        className="splash-orb"
        style={{ display: 'grid', placeItems: 'center' }}
      >
        <Orb />
      </div>
      <div className="splash-title">
        DOCUMIND <b>AI</b>
      </div>
      <p>Your documents. Your intelligence.</p>
      <div className="loading-line" />
    </div>
  );
}
