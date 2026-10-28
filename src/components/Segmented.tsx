interface Option<T extends string | number> {
  value: T;
  label: string;
}

/** A row of mutually exclusive buttons (iOS-style segmented control). */
export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.value} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
