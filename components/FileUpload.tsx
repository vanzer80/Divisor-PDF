

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Icons } from './Icons';
import { useLocalization } from '../context/LocalizationContext';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSizeBytes: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, maxSizeBytes }) => {
  const [error, setError] = useState<string | null>(null);
  const { t } = useLocalization();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.code === 'file-too-large') {
            setError(t('error_fileTooLarge_short', { maxSize: `${maxSizeBytes / 1024 / 1024}MB` }));
        } else if (firstError.code === 'file-invalid-type') {
            setError(t('errorOnlyPdf'));
        } else {
             setError(firstError.message);
        }
      return;
    }
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect, t, maxSizeBytes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxSize: maxSizeBytes,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-2xl p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200
        ${isDragActive ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-brand-blue-400 dark:hover:border-brand-blue-500'}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center">
        <Icons.Upload className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4" />
        {isDragActive ? (
          <p className="text-lg font-semibold text-brand-blue-600 dark:text-brand-blue-400">{t('dropzoneActive')}</p>
        ) : (
          <div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('dropzonePrompt')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('dropzoneSubtext', { maxSize: `${maxSizeBytes / 1024 / 1024}MB` })}</p>
          </div>
        )}
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};