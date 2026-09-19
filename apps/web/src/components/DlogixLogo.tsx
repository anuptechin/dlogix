/**
 * Dlogix brand logo — globe + orbit/plane icon and the "Dlogix" wordmark.
 * `tone="light"` for dark backgrounds (white text), `tone="dark"` for light.
 */
export function DlogixLogo({
  tone = 'light',
  showWord = true,
  size = 34,
}: {
  tone?: 'light' | 'dark';
  showWord?: boolean;
  size?: number;
}) {
  const word = tone === 'light' ? '#ffffff' : '#0a2a4e';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.28 }}>
      <DlogixMark size={size} />
      {showWord && (
        <span
          className="dlx-wordmark"
          style={{
            fontWeight: 700,
            fontSize: size * 0.82,
            letterSpacing: '0.2px',
            lineHeight: 1,
            color: word,
          }}
        >
          <span style={{ color: '#1e7fe6' }}>D</span>
          logi
          <span style={{ color: '#46a8ff' }}>x</span>
        </span>
      )}
    </span>
  );
}

/** The icon alone (globe with orbiting plane), usable as an avatar/favicon. */
export function DlogixMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Dlogix"
      role="img"
    >
      <defs>
        <linearGradient id="dlx-globe" x1="10" y1="10" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#46a8ff" />
          <stop offset="1" stopColor="#1e7fe6" />
        </linearGradient>
        <linearGradient id="dlx-orbit" x1="6" y1="14" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7fc4ff" />
          <stop offset="1" stopColor="#1e7fe6" />
        </linearGradient>
      </defs>
      {/* globe */}
      <circle cx="23" cy="24" r="12" fill="url(#dlx-globe)" />
      {/* meridians / parallels */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.1" fill="none">
        <ellipse cx="23" cy="24" rx="5" ry="12" />
        <path d="M11.4 20.5h23.2M12 28h22M23 12v24" />
      </g>
      {/* orbit ring */}
      <ellipse
        cx="24"
        cy="24"
        rx="18.5"
        ry="8"
        stroke="url(#dlx-orbit)"
        strokeWidth="2.4"
        transform="rotate(-24 24 24)"
        strokeLinecap="round"
        strokeDasharray="70 12"
      />
      {/* plane travelling the orbit (top-right) */}
      <path
        d="M35.5 12.8l6.2-1.2-3.4 4.1 1.3 4.3-2.8-2.4-3.9 1.6 2.1-3.6-1.6-3.3z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default DlogixLogo;
