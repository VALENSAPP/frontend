import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const sanitizeAscii = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[^\x20-\x7E]/g, ' ')
        .trim();
};

/**
 * Generates an Excel-compatible CSV string with UTF-8 BOM.
 */
export const generateStatementCsv = ({
    balance = '$0.00',
    filter = 'All Transactions',
    activities = [],
    generatedDate,
}) => {
    const BOM = '\uFEFF';
    const dateStr = generatedDate || new Date().toLocaleString();

    const lines = [
        'VALENS STATEMENTS',
        `Generated on:,"${dateStr}"`,
        `Account Balance:,"${balance}"`,
        `Active Filter:,"${filter}"`,
        `Total Transactions:,"${activities.length}"`,
        '',
        '"Date & Time","Counterparty / Description","Type / Status","Amount"',
    ];

    activities.forEach((tx) => {
        const date = (tx.formattedDate || tx.date || '').replace(/"/g, '""');
        const title = (tx.title || '').replace(/"/g, '""');
        const subtitle = (tx.subtitle || tx.type || '').replace(/"/g, '""');
        const amount = (tx.amount || '').replace(/"/g, '""');
        lines.push(`"${date}","${title}","${subtitle}","${amount}"`);
    });

    lines.push('');
    lines.push('"End of Statement • Valens Financial Services"');

    return BOM + lines.join('\r\n');
};

/**
 * Generates a valid PDF 1.4 document containing statement tables and summary.
 */
export const generateStatementPdf = ({
    balance = '$0.00',
    filter = 'All Transactions',
    activities = [],
    generatedDate,
}) => {
    const PAGE_WIDTH = 595; // A4
    const PAGE_HEIGHT = 842;
    const MARGIN_LEFT = 40;
    const MARGIN_RIGHT = 40;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    const escapePdf = (str) => {
        const sanitized = sanitizeAscii(str);
        return sanitized
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    };

    const dateStr = generatedDate || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const ROWS_PER_PAGE_FIRST = 20;
    const ROWS_PER_PAGE_SUBSEQUENT = 28;

    const pagesData = [];
    let remaining = [...activities];

    if (remaining.length === 0) {
        pagesData.push([]);
    } else {
        // Page 1
        pagesData.push(remaining.splice(0, ROWS_PER_PAGE_FIRST));
        // Remaining pages
        while (remaining.length > 0) {
            pagesData.push(remaining.splice(0, ROWS_PER_PAGE_SUBSEQUENT));
        }
    }

    const totalPages = pagesData.length;
    const pageStreams = [];

    pagesData.forEach((pageItems, pageIdx) => {
        const pageNum = pageIdx + 1;
        let stream = '';

        if (pageNum === 1) {
            // Purple Header Banner
            stream += '0.26 0.10 0.52 rg\n'; // #431A85
            stream += `${MARGIN_LEFT} 730 ${CONTENT_WIDTH} 72 re f\n`;

            // Title
            stream += 'BT\n';
            stream += '/F2 20 Tf\n';
            stream += '1 1 1 rg\n';
            stream += `${MARGIN_LEFT + 16} 765 Td (VALENS STATEMENTS) Tj\n`;
            stream += 'ET\n';

            // Subtitle
            stream += 'BT\n';
            stream += '/F1 9 Tf\n';
            stream += '0.86 0.80 0.96 rg\n';
            stream += `${MARGIN_LEFT + 16} 745 Td (Official Account Financial Statement | Valens App) Tj\n`;
            stream += 'ET\n';

            // Summary Card
            stream += '0.96 0.94 0.98 rg\n'; // #F5F0FA
            stream += `${MARGIN_LEFT} 650 ${CONTENT_WIDTH} 65 re f\n`;
            stream += '0.88 0.82 0.95 RG\n'; // Border
            stream += '1 w\n';
            stream += `${MARGIN_LEFT} 650 ${CONTENT_WIDTH} 65 re s\n`;

            // Summary Labels
            stream += 'BT\n';
            stream += '/F1 8 Tf\n';
            stream += '0.45 0.45 0.45 rg\n';
            stream += `${MARGIN_LEFT + 14} 694 Td (GENERATED DATE) Tj\n`;
            stream += `130 0 Td (ACCOUNT BALANCE) Tj\n`;
            stream += `140 0 Td (ACTIVE FILTER) Tj\n`;
            stream += `130 0 Td (TOTAL RECORDS) Tj\n`;
            stream += 'ET\n';

            // Summary Values
            stream += 'BT\n';
            stream += '/F2 12 Tf\n';
            stream += '0.15 0.10 0.25 rg\n';
            stream += `${MARGIN_LEFT + 14} 670 Td (${escapePdf(dateStr)}) Tj\n`;
            stream += `130 0 Td (${escapePdf(balance)}) Tj\n`;
            stream += `/F1 10.5 Tf\n`;
            stream += `140 0 Td (${escapePdf(filter)}) Tj\n`;
            stream += `/F2 12 Tf\n`;
            stream += `130 0 Td (${activities.length}) Tj\n`;
            stream += 'ET\n';
        }

        // Table Header
        const tableTop = pageNum === 1 ? 628 : 785;
        stream += '0.26 0.10 0.52 rg\n';
        stream += `${MARGIN_LEFT} ${tableTop - 20} ${CONTENT_WIDTH} 20 re f\n`;

        stream += 'BT\n';
        stream += '/F2 8.5 Tf\n';
        stream += '1 1 1 rg\n';
        stream += `${MARGIN_LEFT + 8} ${tableTop - 14} Td (DATE / TIME) Tj\n`;
        stream += `110 0 Td (COUNTERPARTY / DESCRIPTION) Tj\n`;
        stream += `200 0 Td (TYPE / STATUS) Tj\n`;
        stream += `120 0 Td (AMOUNT) Tj\n`;
        stream += 'ET\n';

        // Table Rows
        let currentY = tableTop - 20;
        const ROW_HEIGHT = 20;

        pageItems.forEach((it, idx) => {
            const rowY = currentY - ROW_HEIGHT;

            // Zebra striping
            if (idx % 2 === 1) {
                stream += '0.98 0.97 0.99 rg\n';
                stream += `${MARGIN_LEFT} ${rowY} ${CONTENT_WIDTH} ${ROW_HEIGHT} re f\n`;
            }

            // Divider line
            stream += '0.92 0.90 0.95 RG\n';
            stream += '0.5 w\n';
            stream += `${MARGIN_LEFT} ${rowY} m ${MARGIN_LEFT + CONTENT_WIDTH} ${rowY} l s\n`;

            // Text
            stream += 'BT\n';
            stream += '/F1 8.5 Tf\n';
            stream += '0.22 0.22 0.22 rg\n';
            stream += `${MARGIN_LEFT + 8} ${rowY + 6} Td (${escapePdf((it.formattedDate || it.date || '—').slice(0, 20))}) Tj\n`;
            stream += `110 0 Td (${escapePdf((it.title || '—').slice(0, 36))}) Tj\n`;
            stream += `200 0 Td (${escapePdf((it.subtitle || it.type || '—').slice(0, 22))}) Tj\n`;

            const amt = String(it.amount || '$0.00');
            if (amt.includes('+')) {
                stream += '0.08 0.60 0.25 rg\n'; // Green
            } else {
                stream += '0.25 0.10 0.40 rg\n'; // Deep Purple
            }
            stream += '/F2 8.5 Tf\n';
            stream += `120 0 Td (${escapePdf(amt)}) Tj\n`;
            stream += 'ET\n';

            currentY = rowY;
        });

        // Footer
        stream += 'BT\n';
        stream += '/F1 8 Tf\n';
        stream += '0.50 0.50 0.50 rg\n';
        stream += `${MARGIN_LEFT} 26 Td (Valens Statements  *  Confidential Financial Record  *  Page ${pageNum} of ${totalPages}) Tj\n`;
        stream += 'ET\n';

        pageStreams.push(stream);
    });

    // Assemble PDF Object Tree
    const objects = [];
    const addObject = (content) => {
        objects.push(content);
        return objects.length;
    };

    addObject('<< /Type /Catalog /Pages 2 0 R >>'); // 1
    addObject(''); // 2 (placeholder for Pages)
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); // 3
    addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'); // 4

    const pageIds = [];
    pageStreams.forEach((stream) => {
        const byteLen = stream.length;
        const streamObjId = addObject(`<< /Length ${byteLen} >>\nstream\n${stream}\nendstream`);
        const pageObjId = addObject(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjId} 0 R >>`
        );
        pageIds.push(pageObjId);
    });

    // Update Pages Object
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    // Construct xref and trailer
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];

    objects.forEach((obj, idx) => {
        offsets.push(pdf.length);
        pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
        pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

    return pdf;
};

/**
 * Handles generating and sharing the statement file (PDF or Excel/CSV).
 */
export const exportStatementFile = async ({
    format = 'pdf', // 'pdf' | 'csv'
    balance = '$0.00',
    filter = 'All Transactions',
    activities = [],
    toast,
}) => {
    try {
        const dateSlug = new Date().toISOString().slice(0, 10);
        const fileName = `Valens_Statement_${dateSlug}.${format}`;
        const dir = RNFS.CachesDirectoryPath || RNFS.DocumentDirectoryPath;
        const filePath = `${dir}/${fileName}`;

        let fileContent = '';
        let mimeType = '';

        if (format === 'pdf') {
            fileContent = generateStatementPdf({
                balance,
                filter,
                activities,
            });
            mimeType = 'application/pdf';
        } else {
            fileContent = generateStatementCsv({
                balance,
                filter,
                activities,
            });
            mimeType = 'text/csv';
        }

        // Write file to device storage
        await RNFS.writeFile(filePath, fileContent, 'utf8');

        // Share file via native share sheet
        await Share.open({
            title: 'Valens Statement',
            subject: `Valens Statement (${fileName})`,
            url: `file://${filePath}`,
            type: mimeType,
            filename: fileName,
            saveToFiles: true,
        });

        return true;
    } catch (err) {
        // User cancelling / dismissing the share dialog is normal and shouldn't trigger an error toast
        if (err?.message && !err.message.includes('User did not share') && !err.message.includes('cancel')) {
            console.error('Failed to export statement:', err);
            if (toast) {
                toast.show('Failed to export statement. Please try again.', { type: 'danger' });
            }
        }
        return false;
    }
};
