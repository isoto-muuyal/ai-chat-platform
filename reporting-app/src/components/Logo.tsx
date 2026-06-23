type LogoProps = {
  withWordmark?: boolean;
  size?: number;
};

export default function Logo({ withWordmark = true, size = 28 }: LogoProps) {
  return (
    <span className="brand-logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b0764" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#brandGradient)" />
        <path
          d="M12 32V16l8 8 8-8v16"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="34" cy="14" r="3" fill="#ffffff" />
      </svg>
      {withWordmark && <strong className="brand-wordmark">Muuyal EZChat</strong>}
    </span>
  );
}
