import '../AnimatedLogo.css';
import Orb from './three/Orb';

export default function AnimatedLogo() {
  return (
    <div className="dm-logo">
      <Orb />
      <div className="dm-brand">
        <div className="dm-wordmark">
          <span className="dm-word-docu">Docu</span>
          <span className="dm-word-mind">Mind</span>
          <span className="dm-word-ai"> AI</span>
        </div>
        <p className="dm-tagline">Your Documents. Smarter Answers.</p>
      </div>
    </div>
  );
}
