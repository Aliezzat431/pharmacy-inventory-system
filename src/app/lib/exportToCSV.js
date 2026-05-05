/**
 * Export data to CSV file with Arabic support
 * @param {Array} data - Array of objects to export
 * @param {Object} columnConfig - { header: key } mapping for columns
 * @param {string} filename - Name of the file to download
 */
export function exportToCSV(data, columnConfig, filename = 'export.csv') {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    try {
        // Create headers
        const headers = Object.keys(columnConfig);
        const headerRow = headers.join(',');

        // Create data rows
        const dataRows = data.map(item => {
            return headers.map(header => {
                const key = columnConfig[header];
                let value = item[key];

                // Handle various data types
                if (value === null || value === undefined) {
                    value = '';
                } else if (value instanceof Date) {
                    value = value.toLocaleDateString('ar-EG');
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                } else {
                    value = String(value);
                }

                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }

                return value;
            }).join(',');
        });

        // Combine headers and rows
        const csvContent = [headerRow, ...dataRows].join('\n');

        // Add UTF-8 BOM for Arabic support
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return false;
    }
}
