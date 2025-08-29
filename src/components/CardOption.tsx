import React from "react";

type Props = {
  title: string;
  description?: string;
  active?: boolean;
  checkbox?: boolean;
  onClick?: () => void;
};

export default function CardOption({
  title,
  description,
  active,
  checkbox,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border p-4 sm:p-5 transition",
        "bg-white shadow-sm",
        active
          ? "border-[#1d71c6] ring-2 ring-[#1d71c6]/20"
          : "border-gray-200 hover:border-[#1d71c6]/50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {checkbox ? (
          <span
            className={[
              "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border",
              active ? "bg-[#2b8a22] border-[#2b8a22]" : "bg-white border-gray-300",
            ].join(" ")}
          >
            {active && (
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            )}
          </span>
        ) : (
          <span
            className={[
              "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border",
              active ? "border-[#1d71c6]" : "border-gray-300",
            ].join(" ")}
          >
            <span
              className={[
                "h-2.5 w-2.5 rounded-full",
                active ? "bg-[#1d71c6]" : "bg-transparent",
              ].join(" ")}
            />
          </span>
        )}

        <div className="min-w-0">
          <div className="font-medium text-gray-900">{title}</div>
          {description && (
            <div className="text-sm text-gray-600">{description}</div>
          )}
        </div>
      </div>
    </button>
  );
}
