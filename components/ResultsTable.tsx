

import React, { useEffect, useMemo } from 'react';
import { PageResult, PageStatus } from '../types';
import { Icons } from './Icons';
import { useLocalization } from '../context/LocalizationContext';

interface ResultsTableProps {
  results: PageResult[];
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const { t } = useLocalization();

  const getStatusChip = (status: PageStatus) => {
    const statusText = t(`status_${status}`);
    switch (status) {
      case PageStatus.OK:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Icons.Check className="w-4 h-4 mr-1"/>{statusText}</span>;
      case PageStatus.ERROR:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><Icons.Error className="w-4 h-4 mr-1"/>{statusText}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">{statusText}</span>;
    }
  };

  const downloadableResults = useMemo(() => {
    return results.map(result => {
      const downloadUrl = result.blob ? URL.createObjectURL(result.blob) : undefined;
      return {...result, downloadUrl };
    });
  }, [results]);

  useEffect(() => {
    return () => {
      downloadableResults.forEach(result => {
        if (result.downloadUrl) {
          URL.revokeObjectURL(result.downloadUrl);
        }
      });
    };
  }, [downloadableResults]);

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{t('tableHeaderPage')}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{t('tableHeaderStatus')}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{t('tableHeaderFinalSize')}</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">{t('tableHeaderDownload')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
          {downloadableResults.map((result) => (
              <tr key={result.pageNumber} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">{result.pageNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{getStatusChip(result.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatBytes(result.finalSize)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {result.status !== PageStatus.ERROR && result.downloadUrl ? (
                    <a href={result.downloadUrl} download={`page_${result.pageNumber}.pdf`} className="text-brand-blue-600 hover:text-brand-blue-800 dark:text-brand-blue-400 dark:hover:text-brand-blue-300" aria-label={t('downloadPage', { pageNumber: result.pageNumber })}>
                      <Icons.Download className="w-5 h-5" />
                    </a>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 cursor-not-allowed">
                      <Icons.Download className="w-5 h-5"/>
                    </span>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};