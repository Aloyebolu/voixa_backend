export function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="border rounded p-2 w-full" {...props} />;
}
