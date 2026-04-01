import React from "react";

// Inline the cn utility just in case it doesn't exist to prevent crashes
export function clsx(...inputs) {
  return inputs.filter(Boolean).join(" ");
}

export const CometCard = ({
  children,
  className,
  containerClassName,
}) => {
  return (
    <div
      className={clsx(
        "relative mx-auto flex w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl p-[1px] transition-transform duration-300 hover:scale-[1.02]",
        containerClassName
      )}
    >
      <div
        className="absolute inset-0 animate-spin-slow"
        style={{
          background: "conic-gradient(from 90deg at 50% 50%, #00000000 50%, var(--bg-main) 0%, var(--accent-yellow) 50%, #00000000 100%)",
          animation: "spin 3s linear infinite",
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
        }}
      />
      <div
        className={clsx(
          "relative flex h-full w-full flex-col rounded-2xl backdrop-blur-xl z-10",
          className
        )}
        style={{ background: "var(--bg-card)" }}
      >
        {children}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
