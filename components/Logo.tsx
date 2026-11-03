import Image from "next/image";

/**
 * Turtle Games logo. Set width/height to the image's real pixel size (keeps the aspect ratio),
 * then control the displayed size with the `className` height (e.g. "h-10 md:h-12").
 */
export default function Logo({
  className = "h-10 md:h-12",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Turtle Games"
      width={400}
      height={120}
      priority={priority}
      className={`${className} w-auto`}
    />
  );
}
