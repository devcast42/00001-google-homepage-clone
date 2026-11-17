export function Logo({ size = 'large' }: { readonly size?: 'large' | 'small' }) {
  return (
    <span className={`logo logo--${size}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="logo__icon">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <circle cx="14" cy="14" r="6.5" fill="none" stroke="#fff" strokeWidth="2.6" />
        <path d="m19 19 5.5 5.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="m12.3 11.8-1.8 2.2 1.8 2.2M15.7 11.8l1.8 2.2-1.8 2.2"
          fill="none"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="logo__text">
        Doc<strong>Seek</strong>
      </span>
    </span>
  );
}
