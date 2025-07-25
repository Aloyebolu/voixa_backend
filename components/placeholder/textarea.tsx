export function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="border rounded p-2 w-full" {...props} />;
}
