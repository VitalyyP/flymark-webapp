"use client";

type Props = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

export function CustomCheckbox({ checked, onChange, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange();
      }}
      className={`w-5 h-5 rounded border flex items-center justify-center transition
        ${
          checked ? "bg-green-600 border-green-600" : "bg-white border-gray-400"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {checked && <span className="text-white text-xs leading-none">✓</span>}
    </button>
  );
}
