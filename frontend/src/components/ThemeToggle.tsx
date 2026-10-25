import { Moon, Sun } from 'lucide-react';

type ThemeToggleProps = {
  dark: boolean;
  onToggle: () => void;
  className?: string;
};

export default function ThemeToggle({
  dark,
  onToggle,
  className = '',
}: ThemeToggleProps) {
  return (
    <button
      className={`theme-toggle ${className}`}
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
      aria-pressed={!dark}
      title={`Switch to ${dark ? 'light' : 'dark'} theme`}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{dark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
