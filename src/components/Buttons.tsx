import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

export function PrimaryButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={[
        "inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 font-medium text-white",
        "bg-gradient-to-r from-[#1d71c6] to-[#0a50a8] hover:opacity-95",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 font-medium",
        "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
