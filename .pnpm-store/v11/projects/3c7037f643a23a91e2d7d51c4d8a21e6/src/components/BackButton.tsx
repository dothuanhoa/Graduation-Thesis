import { ArrowLeft } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type BackButtonProps = {
  children?: ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

const backButtonClass =
  "inline-flex w-fit max-w-full self-start items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-primary shadow-panel transition hover:bg-surface-container-low focus-ring";

function BackButton({ children = "Quay lại", to, onClick, className = "", type = "button" }: BackButtonProps) {
  const content = (
    <>
      <ArrowLeft className="h-4 w-4" />
      {children}
    </>
  );

  if (to) {
    return (
      <Link className={`${backButtonClass} ${className}`} to={to}>
        {content}
      </Link>
    );
  }

  return (
    <button className={`${backButtonClass} ${className}`} onClick={onClick} type={type}>
      {content}
    </button>
  );
}

export default BackButton;
