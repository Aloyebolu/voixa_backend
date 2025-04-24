'use client'
import { useState } from "react";

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    console.log(formData)
    formData.append("audio", file);

    const res = await fetch("/api/image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      setMessage(`Image uploaded! ID: ${data.imageId}`);
    } else {
      setMessage("Upload failed");
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input type="file" accept="" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit">Upload</button>
      <p>{message}</p>
    </form>
  );
}