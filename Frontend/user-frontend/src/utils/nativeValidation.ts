type NativeFormControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

const isInput = (field: NativeFormControl): field is HTMLInputElement =>
  field instanceof HTMLInputElement;

const hasTextLength = (
  field: NativeFormControl,
): field is HTMLInputElement | HTMLTextAreaElement =>
  field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement;

const getControlLabel = (field: NativeFormControl) => {
  const ariaLabel = field.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  if (field.id) {
    const explicitLabel = document
      .querySelector<HTMLLabelElement>(`label[for="${CSS.escape(field.id)}"]`)
      ?.textContent?.trim();
    if (explicitLabel) return explicitLabel;
  }

  const wrappingLabel = field.closest("label");
  const labelText =
    wrappingLabel?.querySelector("span")?.textContent?.trim() ||
    wrappingLabel?.textContent?.trim();
  if (labelText) return labelText.replace(/\s+/g, " ");

  const placeholder = field.getAttribute("placeholder")?.trim();
  if (placeholder) return placeholder;

  const name = field.getAttribute("name")?.trim();
  return name || "trường này";
};

const isSelectionControl = (field: NativeFormControl) =>
  field instanceof HTMLSelectElement ||
  (isInput(field) &&
    ["checkbox", "radio", "file", "date", "datetime-local", "month", "time"].includes(field.type));

const formatLabel = (field: NativeFormControl) => getControlLabel(field);

export const getVietnameseValidationMessage = (field: NativeFormControl) => {
  const validity = field.validity;
  const label = formatLabel(field);

  if (validity.valueMissing) {
    if (isInput(field) && field.type === "checkbox") {
      return `Vui lòng xác nhận ${label}.`;
    }
    return isSelectionControl(field)
      ? `Vui lòng chọn ${label}.`
      : `Vui lòng nhập ${label}.`;
  }

  if (validity.typeMismatch) {
    if (isInput(field) && field.type === "email") {
      return `Vui lòng nhập email hợp lệ cho ${label}.`;
    }
    if (isInput(field) && field.type === "url") {
      return `Vui lòng nhập đường dẫn hợp lệ cho ${label}.`;
    }
    return `Giá trị của ${label} chưa đúng định dạng.`;
  }

  if (validity.patternMismatch) {
    return field.title?.trim() || `${label} chưa đúng định dạng yêu cầu.`;
  }

  if (validity.tooShort) {
    const minLength = hasTextLength(field) ? field.minLength : undefined;
    return `Vui lòng nhập ${label}${minLength ? ` ít nhất ${minLength} ký tự` : " dài hơn"}.`;
  }

  if (validity.tooLong) {
    const maxLength = hasTextLength(field) ? field.maxLength : undefined;
    return `Vui lòng nhập ${label}${maxLength ? ` không quá ${maxLength} ký tự` : " ngắn hơn"}.`;
  }

  if (validity.rangeUnderflow) {
    return `Giá trị của ${label} phải từ ${field.getAttribute("min")} trở lên.`;
  }

  if (validity.rangeOverflow) {
    return `Giá trị của ${label} không được vượt quá ${field.getAttribute("max")}.`;
  }

  if (validity.stepMismatch) {
    return `Giá trị của ${label} chưa đúng bước tăng cho phép.`;
  }

  if (validity.badInput) {
    return `Vui lòng nhập giá trị hợp lệ cho ${label}.`;
  }

  return field.validationMessage || "Vui lòng kiểm tra lại thông tin trong form.";
};

export const setVietnameseValidationMessage = (field: NativeFormControl) => {
  field.setCustomValidity("");
  if (!field.validity.valid) {
    field.setCustomValidity(getVietnameseValidationMessage(field));
  }
};

export const clearVietnameseValidationMessage = (field: EventTarget | null) => {
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.setCustomValidity("");
  }
};
