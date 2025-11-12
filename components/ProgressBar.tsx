import React from 'react';
import { ProcessStage } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface ProgressBarProps {
  progress: number;
  stage: ProcessStage;
  currentPage: number;
  totalPages: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, stage, currentPage, totalPages }) => {
  const { t } = useLocalization();
    
  const getStageText = () => {
    const key = `stage_${stage}`;
    const options = { currentPage, totalPages };
    return t(key, options);
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getStageText()}</span>
        <span className="text-sm font-semibold text-brand-blue-600 dark:text-brand-blue-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-brand-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};