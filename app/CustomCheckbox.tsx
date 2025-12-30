export const CustomCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <label className="inline-flex items-center cursor-pointer gap-2">
    <input
      type="checkbox"
      className="hidden"
      checked={checked}
      onChange={onChange}
    />
    <span
      className={`w-5 h-5 border border-gray-300 rounded flex-shrink-0 relative transition-colors ${
        checked ? "bg-green-600" : "bg-white"
      }`}
    >
      {checked && (
        <svg
          className="absolute top-1/2 left-1/2 w-3 h-3 text-white -translate-x-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          viewBox="0 0 24 24"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  </label>
);
