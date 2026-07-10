import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type BaseProps = {
  label: string;
  hint?: string;
  icon?: ReactNode;
};

type FormFieldProps =
  | (BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: "input" })
  | (BaseProps &
      TextareaHTMLAttributes<HTMLTextAreaElement> & { as: "textarea" })
  | (BaseProps &
      SelectHTMLAttributes<HTMLSelectElement> & {
        as: "select";
        options: string[];
      });

function FormField(props: FormFieldProps) {
  const {
    label,
    hint,
    icon,
    as = "input",
    className = "",
    ...fieldProps
  } = props;
  const inputClass = `w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus-ring ${icon ? "pl-10" : ""} ${className}`;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <span className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {icon}
          </span>
        )}
        {as === "textarea" ? (
          <textarea
            {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className={inputClass}
            rows={5}
          />
        ) : as === "select" ? (
          <select
            {...(fieldProps as SelectHTMLAttributes<HTMLSelectElement>)}
            className={inputClass}
          >
            <option value="">-------</option>
            {(props as BaseProps & { options: string[] }).options.map(
              (option) => (
                <option key={option}>{option}</option>
              ),
            )}
          </select>
        ) : (
          <input
            {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)}
            className={inputClass}
          />
        )}
      </span>
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </label>
  );
}

export default FormField;
