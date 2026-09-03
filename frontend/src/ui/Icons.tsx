import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BookIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M3 5.5A4.5 4.5 0 0 1 7.5 4H11v16H7.5A4.5 4.5 0 0 0 3 21.5ZM21 5.5A4.5 4.5 0 0 0 16.5 4H13v16h3.5a4.5 4.5 0 0 1 4.5 1.5Z" /></svg>;
}

export function CalendarIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M14 14h2M8 18h2" /></svg>;
}

export function SparkIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4ZM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z" /></svg>;
}

export function AlertIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M12 3.5 21 20H3Z" /><path d="M12 9v5M12 17.2v.1" /></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>;
}

export function ThemeIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>;
}
