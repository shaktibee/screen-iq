'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FileUpload } from '@/components/FileUpload';
import { ColumnMapping } from '@/components/ColumnMapping';

type UploadPreview = {
  upload: { id: string; original_name: string };
  preview: Record<string, unknown>[];
  columns: string[];
  totalRows: number;
};

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.id);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [uploadPreview, setUploadPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setError('');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : null;
      const res = await fetch(`${base}/api/upload/file`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, ...(orgId ? { 'X-Organization-Id': orgId } : {}) } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setUploadPreview(data);
      setStep('mapping');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleMappingSubmit = async (columnMapping: Record<string, string>, requiredFields: string[]) => {
    if (!uploadPreview) return;
    setError('');
    setLoading(true);
    try {
      await api(`/api/upload/${uploadPreview.upload.id}/map`, {
        method: 'POST',
        body: JSON.stringify({ columnMapping, requiredFields }),
      });
      router.push(`/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href={`/projects/${projectId}`} className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Project</Link>
      <h1 className="text-2xl font-semibold mb-6">Upload data</h1>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {step === 'upload' && (
        <FileUpload
          accept=".xlsx,.xls,.csv"
          onUpload={handleUpload}
          loading={loading}
        />
      )}
      {step === 'mapping' && uploadPreview && (
        <ColumnMapping
          preview={uploadPreview.preview}
          columns={uploadPreview.columns}
          uploadId={uploadPreview.upload.id}
          totalRows={uploadPreview.totalRows}
          onSubmit={handleMappingSubmit}
          loading={loading}
        />
      )}
    </div>
  );
}
