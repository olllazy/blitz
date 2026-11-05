const line = {
  stroke: 'var(--ink)',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
const fill = { fill: 'currentColor', ...line }

export function OptionIcon({ index, size = 24 }: { index: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {index === 0 && (
        <>
          <circle cx="12" cy="12" r="4.5" {...fill} />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
            {...line}
          />
        </>
      )}
      {index === 1 && <path d="M15 3a9 9 0 1 0 6 15.5A7.5 7.5 0 0 1 15 3z" {...fill} />}
      {index === 2 && <path d="M7 19h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.4-1.4A4.8 4.8 0 0 0 7 19z" {...fill} />}
      {index === 3 && (
        <>
          <circle cx="12" cy="6.5" r="3.5" {...fill} />
          <circle cx="17.2" cy="10.3" r="3.5" {...fill} />
          <circle cx="15.2" cy="16.4" r="3.5" {...fill} />
          <circle cx="8.8" cy="16.4" r="3.5" {...fill} />
          <circle cx="6.8" cy="10.3" r="3.5" {...fill} />
          <circle cx="12" cy="12" r="2.6" fill="var(--sun)" {...line} />
        </>
      )}
    </svg>
  )
}
