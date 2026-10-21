import { useId } from "react";

type BrandLogoProps = {
  compact?: boolean;
  showWordmark?: boolean;
  className?: string;
  textClassName?: string;
};

export default function BrandLogo({
  compact = false,
  showWordmark = true,
  className = "",
  textClassName = "",
}: BrandLogoProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className={`brand-logo inline-flex items-center ${compact ? "gap-2" : "gap-3"} ${className}`}>
      <div className="brand-mark">
        <svg
          viewBox="0 0 220 180"
          className={compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-16 w-16 sm:h-20 sm:w-20"}
          aria-label="NextGen"
          role="img"
        >
          <defs>
            <linearGradient id={`${gradientId}-mark`} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#8ad9ff" />
              <stop offset="35%" stopColor="#52a7e8" />
              <stop offset="100%" stopColor="#123a5a" />
            </linearGradient>
          </defs>

          <g transform="translate(8 8)">
            <path d="M16 140V16h36l48 64V16h34v124H98L52 76v64H16Z" fill={`url(#${gradientId}-mark)`} />
            <path d="M128 18h28v122h-28V18Z" fill={`url(#${gradientId}-mark)`} opacity="0.98" />
            <path d="M129 18h58l-44 46h44v28H101l40-42V18Z" fill={`url(#${gradientId}-mark)`} />
            <path d="M134 18h24v32h-24V18Z" fill="#dff6ff" opacity="0.9" />
            <path d="M146 72H188V98H146V72Z" fill={`url(#${gradientId}-mark)`} />
            <path d="M154 18L196 18L170 0L196 0L196 66L154 66L154 18Z" fill={`url(#${gradientId}-mark)`} />
          </g>
        </svg>
      </div>

      {showWordmark && (
        <span
          className={
            compact
              ? `wordmark text-lg font-black tracking-[-0.06em] text-[#123a5a] sm:text-xl ${textClassName}`
              : `wordmark text-4xl font-black tracking-[-0.08em] text-[#123a5a] sm:text-[4.3rem] ${textClassName}`
          }
          aria-label="NextGen"
        >
          {"NextGen".split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className={`wordmark-letter ${letter === "G" || letter === "e" || letter === "n" ? "text-[#2a9df4]" : "text-[#123a5a]"}`}
              style={{ transitionDelay: `${index * 18}ms` }}
            >
              {letter}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
