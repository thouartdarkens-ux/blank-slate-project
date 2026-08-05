
export const downloadAsCSV = (data: any[], filename: string) => {
  // Convert data to CSV format
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]?.toString() ?? '';
        // Escape quotes and wrap in quotes if contains comma
        return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create an anchor element and set its properties
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  // Append the anchor to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the object URL when done
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};
