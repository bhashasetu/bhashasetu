/**
 * Language / translate mark used in the mobile header.
 *
 * MOBILE-05-LanguageSelection.PNG shows a bell in this position, but a
 * notification bell has no behaviour behind it on this platform; the slot is
 * used for the language control instead.
 */
export function LanguageIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 5h11" />
      <path d="M8.5 3v2" />
      <path d="M11.5 5c0 4-3.4 7.5-7 9" />
      <path d="M6 9.5c1.2 2.4 3.4 4.3 6 5.5" />
      <path d="M13 21l4.5-10 4.5 10" />
      <path d="M14.7 17.5h5.6" />
    </svg>
  );
}
