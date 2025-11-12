import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProgressBar } from './components/ProgressBar';
import { ResultsTable } from './components/ResultsTable';
import { Icons } from './components/Icons';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useLocalization } from './context/LocalizationContext';
import { AppState, JobStatus, PageResult, ProcessStage, ExtractionMode } from './types';
import { pdfProcessor } from './services/pdfProcessor';
import { generateDiagnosticReport } from './services/diagnostics';
import { parsePageRanges } from './services/pageParser';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { PDFDocument } from 'pdf-lib';


const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [file, setFile] = useState<File | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [jobStatus, setJobStatus] = useState<Partial<JobStatus>>({
        stage: ProcessStage.QUEUED,
        overallProgress: 0,
        processedPages: 0,
        totalPages: 0,
    });
    const [results, setResults] = useState<PageResult[]>([]);
    const [error, setError] = useState<{ message: string; suggestion?: string } | null>(null);
    const [largeFileWarning, setLargeFileWarning] = useState<string | null>(null);
    const fileRef = useRef<File | null>(null);

    // State for page selection
    const [extractionMode, setExtractionMode] = useState<ExtractionMode>(ExtractionMode.ALL);
    const [pageSelection, setPageSelection] = useState('');
    const [pageSelectionError, setPageSelectionError] = useState<string | null>(null);

    const { t } = useLocalization();

    const handleFileSelect = async (selectedFile: File) => {
        resetState(false);
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setError({ 
                message: t('error_fileTooLarge', {
                    maxSize: `${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
                    fileName: selectedFile.name,
                    fileSize: `${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`
                }),
                suggestion: t('error_fileTooLarge_suggestion')
            });
            setAppState(AppState.ERROR);
            setFile(selectedFile); // Still show file info in error state
            return;
        }

        if (selectedFile.size > 100 * 1024 * 1024) { // Warning threshold
            setLargeFileWarning(t('warning_largeFile'));
        } else {
            setLargeFileWarning(null);
        }
        
        setFile(selectedFile);
        fileRef.current = selectedFile;
        setAppState(AppState.LOADING);
        
        try {
            // Directly load the PDF with pdf-lib to get an accurate page count
            const fileBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(fileBuffer, { 
                ignoreEncryption: true 
            });
            const count = pdfDoc.getPageCount();
            
            // Audit fix: Handle empty PDFs gracefully
            if (count === 0) {
                setError({ message: t("error_pdf_empty") });
                setAppState(AppState.ERROR);
                return;
            }

            setTotalPages(count);
            setAppState(AppState.READY);
        } catch(e: any) {
            console.error("Failed to load or analyze PDF", e);
            setError({ message: t("error_pdf_load") });
            setAppState(AppState.ERROR);
        }
    };
    
    const resetState = (fullReset: boolean = true) => {
        if (fullReset) {
            setFile(null);
            fileRef.current = null;
            setAppState(AppState.IDLE);
        }
        setJobStatus({
            stage: ProcessStage.QUEUED,
            overallProgress: 0,
            processedPages: 0,
            totalPages: 0,
        });
        setResults([]);
        setError(null);
        setLargeFileWarning(null);
        setExtractionMode(ExtractionMode.ALL);
        setPageSelection('');
        setPageSelectionError(null);
        setTotalPages(0);
    }
    
    const handleStartProcessing = useCallback(async () => {
        if (!file) return;

        let pagesToExtract: number[] = [];
        if (extractionMode === ExtractionMode.SPECIFIC) {
            if (pageSelectionError || pageSelection.trim() === '') {
                // Should not happen if button is disabled, but as a safeguard
                setPageSelectionError(t('error_pageSelection_invalid'));
                return;
            }
            try {
                pagesToExtract = parsePageRanges(pageSelection, totalPages);
            } catch (e: any) {
                setPageSelectionError(t(e.message, {totalPages}));
                return;
            }
        }

        setAppState(AppState.PROCESSING);
        setResults([]);
        setError(null);
        
        const tempResults: PageResult[] = [];
        
        const onProgress = (update: { stage: ProcessStage, overallProgress: number, processedPages: number, totalPages?: number }) => {
            setJobStatus(prev => ({
                ...prev,
                stage: update.stage,
                overallProgress: update.overallProgress,
                processedPages: update.processedPages,
                totalPages: update.totalPages ?? prev.totalPages,
            }));
        };

        try {
            const processor = pdfProcessor(file, onProgress, extractionMode === ExtractionMode.SPECIFIC ? pageSelection : undefined);
            for await (const result of processor) {
                tempResults.push(result);
                // Sort results by page number to ensure they are in order for display
                tempResults.sort((a, b) => a.pageNumber - b.pageNumber);
                setResults([...tempResults]);
            }
            setAppState(AppState.DONE);
        } catch (e: any) {
            console.error(e);
            setError({ message: t(e.message) || t('error_generic') });
            setAppState(AppState.ERROR);
        }
    }, [file, t, extractionMode, pageSelection, totalPages, pageSelectionError]);

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const validResults = results.filter(r => r.blob);

        validResults.forEach(result => {
            if(result.blob) {
               zip.file(`page_${result.pageNumber}.pdf`, result.blob);
            }
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${file?.name.replace('.pdf', '')}_pages.zip`);
    };
    
    const handleResetClick = () => {
        resetState(true);
    }

    const handlePageSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPageSelection(value);
        if (value.trim() === '') {
            setPageSelectionError(null);
            return;
        }
        try {
            // Validate against the correct total pages
            parsePageRanges(value, totalPages);
            setPageSelectionError(null);
        } catch (e: any) {
            setPageSelectionError(t(e.message, { totalPages }));
        }
    }
    
    const downloadDiagnosticReport = () => {
        if (!fileRef.current) return;
        const errorObj = error ? new Error(error.message) : undefined;
        const report = generateDiagnosticReport(fileRef.current, jobStatus, results, errorObj);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pdf_splitter_diagnostic_${new Date().toISOString().replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && window.localStorage.getItem('theme')) {
            return window.localStorage.getItem('theme') as 'light' | 'dark';
        }
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            window.localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            window.localStorage.setItem('theme', 'light');
        }
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const isStartButtonDisabled = extractionMode === ExtractionMode.SPECIFIC && (!!pageSelectionError || pageSelection.trim() === '');

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
            <header className="py-4 px-6 md:px-8 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <svg className="w-8 h-8 text-brand-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        <div className="min-h-[3rem] flex flex-col justify-center">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{t('appTitle')}</h1>
                             {totalPages > 0 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('header_pageCount', { count: totalPages })}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                         <LanguageSwitcher />
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
                            {theme === 'light' ? <Icons.Moon className="w-6 h-6" /> : <Icons.Sun className="w-6 h-6" />}
                        </button>
                        <a href="https://github.com/google/ai-studio-apps" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="GitHub Repository">
                            <Icons.GitHub className="w-6 h-6" />
                        </a>
                    </div>
                </div>
            </header>
            
            <main className="py-10 px-4">
                <div className="max-w-4xl mx-auto flex flex-col items-center space-y-8">
                    {appState === AppState.IDLE && (
                        <>
                           <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">{t('mainHeading')}</h2>
                           <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl">{t('subHeading')}</p>
                           <FileUpload onFileSelect={handleFileSelect} maxSizeBytes={MAX_FILE_SIZE_BYTES} />
                        </>
                    )}
                    
                    {(appState !== AppState.IDLE) && file && (
                         <div className="w-full bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center space-y-6">
                            <div className="flex items-center space-x-4">
                                <Icons.File className="w-10 h-10 text-brand-blue-500" />
                                <div>
                                    <p className="font-semibold text-lg">{file.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            
                             {appState === AppState.LOADING && (
                                <div className="flex flex-col items-center space-y-2">
                                    <Icons.Spinner className="w-8 h-8"/> 
                                    <p>{t('stage_ANALYZING')}</p>
                                </div>
                            )}

                            {appState === AppState.READY && (
                                <div className="w-full max-w-lg flex flex-col items-center space-y-6">
                                    {largeFileWarning && (
                                        <div className="w-full p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md flex items-start space-x-3 text-sm border border-yellow-200 dark:border-yellow-800">
                                            <Icons.Warning className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <p>{largeFileWarning}</p>
                                        </div>
                                    )}
                                    <div className="w-full p-4 border rounded-md dark:border-slate-600">
                                      <p className="text-center font-medium">{t('extraction_options_title', { totalPages })}</p>
                                      <div className="mt-4 space-y-4">
                                        <label className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                                          <input type="radio" name="extraction-mode" className="h-4 w-4 text-brand-blue-600 border-gray-300 focus:ring-brand-blue-500"
                                            checked={extractionMode === ExtractionMode.ALL} onChange={() => setExtractionMode(ExtractionMode.ALL)} />
                                          <span className="ml-3 text-sm font-medium">{t('extraction_mode_all')}</span>
                                        </label>
                                        <label className="flex items-center p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                                          <input type="radio" name="extraction-mode" className="h-4 w-4 text-brand-blue-600 border-gray-300 focus:ring-brand-blue-500"
                                            checked={extractionMode === ExtractionMode.SPECIFIC} onChange={() => setExtractionMode(ExtractionMode.SPECIFIC)} />
                                          <span className="ml-3 text-sm font-medium">{t('extraction_mode_specific')}</span>
                                        </label>
                                      </div>
                                      {extractionMode === ExtractionMode.SPECIFIC && (
                                          <div className="mt-4">
                                              <input type="text"
                                                  className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-md text-sm focus:outline-none focus:ring-2 ${pageSelectionError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-brand-blue-500'}`}
                                                  placeholder={t('extraction_input_placeholder')}
                                                  value={pageSelection}
                                                  onChange={handlePageSelectionChange}
                                              />
                                              <p className={`text-xs mt-1 ${pageSelectionError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                  {pageSelectionError || t('extraction_input_help')}
                                              </p>
                                          </div>
                                      )}
                                    </div>

                                    <button onClick={handleStartProcessing} disabled={isStartButtonDisabled}
                                        className="px-8 py-3 bg-brand-blue-600 text-white font-semibold rounded-lg hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition-all shadow-md transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100 dark:disabled:bg-slate-600">
                                        <span>{t('button_startProcessing')}</span>
                                    </button>
                                </div>
                            )}
                            
                            {appState === AppState.PROCESSING && (
                                <button disabled className="px-8 py-3 bg-brand-blue-500 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center space-x-2 cursor-not-allowed">
                                    <Icons.Spinner className="w-5 h-5"/> 
                                    <span>{t('button_processing')}</span>
                                </button>
                            )}


                            {appState === AppState.PROCESSING && jobStatus && (
                                <div className="w-full max-w-2xl">
                                    <ProgressBar 
                                        progress={jobStatus.overallProgress || 0} 
                                        stage={jobStatus.stage || ProcessStage.QUEUED}
                                        currentPage={jobStatus.processedPages || 0}
                                        totalPages={jobStatus.totalPages || 0}
                                    />
                                </div>
                            )}

                            {(appState === AppState.DONE || appState === AppState.PROCESSING || appState === AppState.ERROR) && results.length > 0 && (
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-4">
                                      <h3 className="text-xl font-semibold">{t('results_title')}</h3>
                                      {appState === AppState.DONE &&
                                        <button onClick={handleDownloadZip} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                                            <Icons.Download className="w-4 h-4" />
                                            <span>{t('button_downloadAllZip')}</span>
                                        </button>
                                      }
                                    </div>
                                    <ResultsTable results={results} />
                                </div>
                            )}
                            
                            {appState === AppState.ERROR && (
                                <div className="w-full max-w-2xl p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex flex-col items-center space-y-3 border border-red-200 dark:border-red-800">
                                   <div className="flex items-center space-x-2">
                                     <Icons.Error className="w-6 h-6" />
                                     <p className="font-semibold">{t('error_title')}</p>
                                   </div>
                                   <p className="text-sm text-center">{error?.message || t('error_generic')}</p>
                                   {error?.suggestion && <p className="text-xs text-center mt-1 text-slate-600 dark:text-slate-400">{error.suggestion}</p>}
                                   <button onClick={downloadDiagnosticReport} className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium mt-2">
                                       {t('button_downloadReport')}
                                   </button>
                                </div>
                            )}
                            
                            {(appState === AppState.DONE || appState === AppState.ERROR) && (
                                <button onClick={handleResetClick} className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                    {t('button_processAnother')}
                                </button>
                            )}
                         </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;