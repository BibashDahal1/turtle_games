import type { ReactNode } from "react";

/**
 * A link to a section of the HOME page, e.g. <HomeLink hash="games">Back to all games</HomeLink>.
 *
 * This is deliberately a plain <a>, not next/link. A <Link> changes the page without reloading it (client-side
 * navigation), so anything on the home page that is set up only when the site is first opened (the background,
 * scroll effects, reveal animations, the 3D scenes) is not set up again and the page comes back misaligned.
 * A plain link makes the browser load "/" from scratch, exactly like the first visit, and then jump to
 * the section: the sections are in the server-rendered HTML, so the browser can scroll to #hash on its own.
 */
export default function HomeLink({
  hash,
  className,
  children,
}: {
  /** id of the section on the home page, without the # */
  hash: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href={`/#${hash}`} className={className}>
      {children}
    </a>
  );
}
