// FIX: Replaced placeholder content with the full implementation for extracting pages from a PDF.
import { PDFDocument } from 'pdf-lib';

/**
 * Extracts a single page from a PDF document and creates a new PDF document containing only that page.
 * @param sourcePdfDoc The source PDFDocument object.
 * @param pageIndex The 0-based index of the page to extract.
 * @returns A new PDFDocument containing just the specified page.
 */
export const extractPage = async (
  sourcePdfDoc: PDFDocument,
  pageIndex: number,
): Promise<PDFDocument> => {
  // Create a new document to hold the extracted page.
  const newPdfDoc = await PDFDocument.create();

  // Copy the page from the source document to the new document.
  const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [pageIndex]);

  // Add the copied page to the new document.
  newPdfDoc.addPage(copiedPage);
  
  return newPdfDoc;
};


/**
 * Parses a string of page ranges (e.g., "1, 3-5, 8") into a sorted array of unique page numbers.
 * @param selection The user-provided string of pages and ranges.
 * @param totalPages The total number of pages in the document for validation.
 * @returns A sorted array of unique 1-based page numbers.
 */
export const parsePageRanges = (selection: string, totalPages: number): number[] => {
    const pageNumbers = new Set<number>();
    
    if (!selection || selection.trim() === '') {
        throw new Error('error_pageSelection_empty');
    }

    // Sanitize input: allow only numbers, commas, hyphens, and spaces
    if (!/^[0-9,\-\s]+$/.test(selection)) {
        throw new Error('error_pageSelection_invalidChars');
    }

    const parts = selection.split(',').map(part => part.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const range = part.split('-');
            if (range.length !== 2 || range[0].trim() === '' || range[1].trim() === '') {
                 throw new Error('error_pageSelection_invalidRangeFormat');
            }
            const start = parseInt(range[0], 10);
            const end = parseInt(range[1], 10);

            if (isNaN(start) || isNaN(end)) {
                throw new Error('error_pageSelection_invalidRangeFormat');
            }
            if (start > end) {
                throw new Error('error_pageSelection_invalidRangeOrder');
            }
             if (start < 1 || end > totalPages) {
                throw new Error('error_pageSelection_outOfBounds');
            }

            for (let i = start; i <= end; i++) {
                pageNumbers.add(i);
            }
        } else {
            const pageNum = parseInt(part, 10);
            if (isNaN(pageNum)) {
                 throw new Error('error_pageSelection_invalidNumber');
            }
            if (pageNum < 1 || pageNum > totalPages) {
                throw new Error('error_pageSelection_outOfBounds');
            }
            pageNumbers.add(pageNum);
        }
    }
    
    if (pageNumbers.size === 0) {
        throw new Error('error_pageSelection_empty');
    }

    return Array.from(pageNumbers).sort((a, b) => a - b);
}