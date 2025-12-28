export default function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = ''
}) {
  const base =
    'w-full py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2';

  const variants = {
    primary:
      'bg-primary text-white hover:bg-indigo-600 focus:ring-indigo-400',
    secondary:
      'bg-gray-500 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
    disabled:
      'bg-gray-200 text-gray-400 cursor-not-allowed'
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${
        disabled ? variants.disabled : variants[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
}
