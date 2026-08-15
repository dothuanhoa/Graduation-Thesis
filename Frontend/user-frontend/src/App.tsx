import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import {
  clearVietnameseValidationMessage,
  setVietnameseValidationMessage,
} from "./utils/nativeValidation";
import { emitToast } from "./utils/toastBus";

function App() {
  useEffect(() => {
    let lastToastAt = 0;
    const handleInvalid = (event: Event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement)) {
        return;
      }

      field.scrollIntoView({ behavior: "smooth", block: "center" });
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
        setVietnameseValidationMessage(field);
        const now = Date.now();
        if (now - lastToastAt > 500) {
          lastToastAt = now;
          emitToast({
            variant: "error",
            message: field.validationMessage || "Vui lòng kiểm tra lại thông tin trong form.",
          });
        }
      }
    };
    const handleFormInput = (event: Event) => {
      clearVietnameseValidationMessage(event.target);
    };

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleFormInput, true);
    document.addEventListener("change", handleFormInput, true);
    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", handleFormInput, true);
      document.removeEventListener("change", handleFormInput, true);
    };
  }, []);

  return <AppRoutes />;
}
//thêm để commit

export default App;
