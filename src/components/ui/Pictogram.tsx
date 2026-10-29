import type { SVGProps } from "react";

export type StoryType = "conte" | "fable" | "legende" | "mythe_fondateur" | "recit_historique";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Calabash — conte, fable. */
export function Calebasse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M4 11c1.5-1.2 4.5-2 8-2s6.5.8 8 2" />
      <path d="M8 14.5c1.2.8 2.5 1.2 4 1.2s2.8-.4 4-1.2" />
    </Svg>
  );
}

/** Mask — légende. */
export function Masque(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c-4 0-6.5 3-6.5 7.5 0 5 3 10.5 6.5 11.5 3.5-1 6.5-6.5 6.5-11.5 0-4.5-2.5-7.5-6.5-7.5Z" />
      <path d="M8.5 10h2.5M13 10h2.5" />
      <path d="M12 12v3.5" />
      <path d="M10.5 18h3" />
    </Svg>
  );
}

/** Baobab — mythe fondateur. */
export function Baobab(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 21.5c.5-3 .5-6.5 0-10M14 21.5c-.5-3-.5-6.5 0-10" />
      <path d="M10 11.5c-1.5-1-3-1.5-4.5-1.5M14 11.5c1.5-1 3-1.5 4.5-1.5" />
      <path d="M10 11.5 8 6.5M14 11.5l2-5M12 11V5" />
      <path d="M5 10c-1-.5-1.5-1.5-1-2.5M19 10c1-.5 1.5-1.5 1-2.5M8 6.5c-.5-1 0-2 1-2.5M16 6.5c.5-1 0-2-1-2.5M12 5c-.8-.8-.8-2 0-2.5" />
      <path d="M7 21.5h10" />
    </Svg>
  );
}

/** Crown — récit historique. */
export function Couronne(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 17.5 3 8l5 4 4-6.5 4 6.5 5-4-1 9.5Z" />
      <path d="M4 20.5h16" />
      <circle cx="12" cy="13.5" r="1.2" />
    </Svg>
  );
}

/** Flame — logo and "story in progress" marker. */
export function Flamme(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.5c3.6 0 6-2.4 6-5.6 0-3.8-3-5.6-3.6-9.4-1.8 1.4-2.6 3.2-2.6 4.8-1-.8-1.6-2-1.6-3.6C7.6 9.5 6 12.5 6 15.9c0 3.2 2.4 5.6 6 5.6Z" />
      <path d="M12 21.5c-1.6 0-2.6-1-2.6-2.5 0-1.6 1.4-2.6 1.8-4 1 .8 3.4 2.3 3.4 4 0 1.5-1 2.5-2.6 2.5Z" />
    </Svg>
  );
}

const BY_TYPE: Record<StoryType, (props: IconProps) => React.JSX.Element> = {
  conte: Calebasse,
  fable: Calebasse,
  legende: Masque,
  mythe_fondateur: Baobab,
  recit_historique: Couronne,
};

export function StoryTypeIcon({ type, ...props }: IconProps & { type: StoryType }) {
  const Icon = BY_TYPE[type];
  return <Icon {...props} />;
}
