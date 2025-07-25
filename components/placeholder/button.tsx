export function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`bg-blue-500 text-white rounded px-4 py-2 ${className}`} {...props}>
      {children}
    </button>
  );
}
