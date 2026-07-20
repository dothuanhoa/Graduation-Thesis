import { useMemo, useState } from "react";

export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
};

type AutocompleteInputProps = {
  label: string;
  value: string;
  options: AutocompleteOption[];
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
};

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function AutocompleteInput({
  label,
  value,
  options,
  placeholder,
  hint,
  disabled,
  required,
  emptyMessage = "Không tìm thấy dữ liệu phù hợp.",
  onChange,
  onSelect,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const keyword = normalize(value);
    if (!keyword) return options.slice(0, 80);

    return options
      .filter((option) =>
        normalize(`${option.value} ${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`).includes(keyword),
      )
      .slice(0, 80);
  }, [options, value]);

  return (
    <label className="relative flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <input
        autoComplete="off"
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus-ring disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
        disabled={disabled}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-raised">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-on-surface-variant">{emptyMessage}</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-surface-container-low"
                key={`${option.value}-${option.label}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="font-semibold text-on-surface">{option.label}</span>
                {option.description && <span className="text-xs text-on-surface-variant">{option.description}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </label>
  );
}

export default AutocompleteInput;
