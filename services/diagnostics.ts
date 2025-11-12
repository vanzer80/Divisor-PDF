
import { PageResult, JobStatus } from '../types';

interface BrowserInfo {
    userAgent: string;
    platform: string;
    vendor: string;
    language: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
}

export const getBrowserInfo = (): BrowserInfo => {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
    };
}

export const generateDiagnosticReport = (
    file: File, 
    jobStatus: Partial<JobStatus>, 
    results: PageResult[],
    error?: Error
): string => {
    const browserInfo = getBrowserInfo();

    let report = `--- PDF Splitting & Compression Diagnostic Report ---\n`;
    report += `Timestamp: ${new Date().toISOString()}\n\n`;

    report += `[File Information]\n`;
    report += `Name: ${file.name}\n`;
    report += `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Type: ${file.type}\n`;
    report += `Pages: ${jobStatus.totalPages || 'N/A'}\n\n`;
    
    report += `[Job Status]\n`;
    report += `Stage: ${jobStatus.stage || 'N/A'}\n`;
    report += `Progress: ${jobStatus.overallProgress?.toFixed(2) || 0}%\n`;
    report += `Processed Pages: ${jobStatus.processedPages || 0}/${jobStatus.totalPages || 'N/A'}\n`;
    if(jobStatus.warning) {
        report += `Warning: ${jobStatus.warning}\n`;
    }
    report += `\n`;

    if (error) {
        report += `[Error Information]\n`;
        report += `Message: ${error.message}\n`;
        report += `Stack: ${error.stack}\n\n`;
    }

    report += `[Browser Environment]\n`;
    report += `User Agent: ${browserInfo.userAgent}\n`;
    report += `Platform: ${browserInfo.platform}\n`;
    report += `Language: ${browserInfo.language}\n`;
    report += `CPU Cores: ${browserInfo.hardwareConcurrency || 'N/A'}\n`;
    report += `Memory (GB): ${browserInfo.deviceMemory || 'N/A'}\n\n`;

    report += `[Page-by-Page Results]\n`;
    if (results.length > 0) {
        // Fix: Calculate an estimated original page size since it's not available on the PageResult object.
        const estimatedOriginalPageSize = jobStatus.totalPages ? String(Math.round(file.size / jobStatus.totalPages)) : 'N/A';
        results.forEach(r => {
            report += `Page ${r.pageNumber}: Status=${r.status}, Original (est.)=${estimatedOriginalPageSize} B, Final=${r.finalSize} B\n`;
        });
    } else {
        report += `No page results available.\n`;
    }
    report += `\n--- End of Report ---\n`;

    return report;
};
