import "./AnimatedLogo.css";

export default function AnimatedLogo() {
  return (
    <div className="dm-logo">
      <div className="dm-mascot">
        {/* Soft animated glow */}
        <div className="dm-glow" />

        {/* Twinkling stars */}
        <span className="dm-star dm-star-one">✦</span>
        <span className="dm-star dm-star-two">✧</span>
        <span className="dm-star dm-star-three">✦</span>
        <span className="dm-star dm-star-four">✧</span>

        {/* Orbiting ring */}
        <div className="dm-orbit">
          <span className="dm-orbit-dot" />
        </div>

        {/* Document mascot */}
        <svg
          className="dm-document"
          viewBox="0 0 200 220"
          role="img"
          aria-label="DocuMind AI animated document mascot"
        >
          <defs>
            <linearGradient
              id="dm-paper-gradient"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dce9ff" />
            </linearGradient>

            <linearGradient
              id="dm-edge-gradient"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#42e8d4" />
              <stop offset="100%" stopColor="#6757ff" />
            </linearGradient>
          </defs>

          {/* Document shape */}
          <path
            d="M48 17 H117 L157 57 V176 Q157 191 142 191 H48 Q33 191 33 176 V32 Q33 17 48 17 Z"
            fill="url(#dm-paper-gradient)"
            stroke="url(#dm-edge-gradient)"
            strokeWidth="4"
          />

          {/* Folded corner */}
          <path
            d="M117 17 V47 Q117 57 127 57 H157"
            fill="#c7d5ff"
            stroke="#9aafff"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Left eye — always open */}
          <path
            className="dm-eye"
            d="M53 91 Q63 75 73 91"
            fill="none"
            stroke="#172746"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Right eye — winks periodically */}
          <g className="dm-winking-eye">
            <path
              className="dm-open-eye"
              d="M96 91 Q106 75 116 91"
              fill="none"
              stroke="#172746"
              strokeWidth="9"
              strokeLinecap="round"
            />

            <path
              className="dm-closed-eye"
              d="M96 91 Q106 101 116 91"
              fill="none"
              stroke="#172746"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>

          {/* Document text lines */}
          <rect
            x="53"
            y="115"
            width="77"
            height="10"
            rx="5"
            fill="#5d9fff"
          />

          <rect
            x="53"
            y="136"
            width="59"
            height="10"
            rx="5"
            fill="#8b9fff"
          />

          <rect
            x="53"
            y="157"
            width="69"
            height="10"
            rx="5"
            fill="#b0bbff"
          />
        </svg>

        {/* Floating AI chat bubble */}
        <div className="dm-chat-bubble" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Wordmark */}
      <div className="dm-brand">
        <div className="dm-wordmark">
          <span className="dm-word-docu">Docu</span>
          <span className="dm-word-mind">Mind</span>
          <span className="dm-word-ai"> AI</span>
          <span className="dm-word-sparkle">✦</span>
        </div>

        <p className="dm-tagline">
          Your Documents. Smarter Answers.
        </p>
      </div>
    </div>
  );
}