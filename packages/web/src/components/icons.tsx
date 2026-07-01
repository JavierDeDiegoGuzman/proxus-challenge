interface IconProps {
  readonly className?: string;
}

export function DocumentIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5" strokeLinejoin="round" />
      <path d="M9 12.5h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

export function NoteIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M6 4.5h9.5L19 8v11.5a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4.5" strokeLinecap="round" />
    </svg>
  );
}

export function QuizIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="8" cy="7" r="1.3" />
      <circle cx="8" cy="12" r="1.3" />
      <circle cx="8" cy="17" r="1.3" />
      <path d="M12 7h7M12 12h7M12 17h7" strokeLinecap="round" />
    </svg>
  );
}

export function TestIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M8.5 3.5h7a1 1 0 0 1 1 1V5h-9v-.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M7.5 5h9a.5.5 0 0 1 .5.5V20a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V5.5a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="m9.5 12 1.5 1.5L14.5 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 16h5" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3.5c.4 2.6 1 4.3 1.9 5.2.9.9 2.6 1.5 5.2 1.9-2.6.4-4.3 1-5.2 1.9-.9.9-1.5 2.6-1.9 5.2-.4-2.6-1-4.3-1.9-5.2-.9-.9-2.6-1.5-5.2-1.9 2.6-.4 4.3-1 5.2-1.9.9-.9 1.5-2.6 1.9-5.2Z" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M12 15.5V5M8.5 8.5 12 5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.3 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
