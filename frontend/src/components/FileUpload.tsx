'use client';

import { useState, useRef } from 'react';

type FileUploadProps = {
  accept: string;
  onUpload: (file: File) => void;
  loading?: boolean;
};

export function FileUpload({ accept, onUpload, loading }: FileUploadProps) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        drag ? 'border-gray-900 bg-gray-50' : 'border-gray-300'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <p className="text-gray-600 mb-2">Drag & drop Excel or CSV here, or</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Choose file'}
      </button>
    </div>
  );
}
