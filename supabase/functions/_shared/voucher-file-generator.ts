import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

export interface VoucherData {
  serial: string;
  pin: string;
  type: string;
  
}

export const generateVoucherCSV = (vouchers: VoucherData[], product: string, phone: number): string => {
  const headers = ['Serial', 'PIN', 'Type'];
  const rows = vouchers.map(voucher => [voucher.serial, voucher.pin, voucher.type,]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
};
const getResultCheckingUrl = (product: string): string => {
  switch(product.toUpperCase()) {
    case 'WASSCE':
      return 'ghana.waecdirect.org';
    case 'BECE':
      return 'eresults.waecgh.org';
    default:
      return 'buycheckerpins.com';
  }
};

const getVoucherPrice = (product: string): string => {
  switch(product.toUpperCase()) {
    case 'WASSCE':
      return 'GHC 25';
    case 'BECE': 
      return 'GHC 25';
    default:
      return 'GHC 25';
  }
};
export const generateVoucherPDF = (vouchers, product, phone) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setProperties({
    title: `${product} Vouchers`,
    subject: "Voucher Receipt",
    creator: "MOVAsoft solutions",
    keywords: "vouchers, receipt",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Layout settings: 3 columns × 4 rows per page = 12 vouchers per page
  const margin = 10;
  const gap = 6;
  const cols = 3;
  const rows = 4;
  const perPage = cols * rows;

  const voucherWidth =
    (pageWidth - 2 * margin - (cols - 1) * gap) / cols;
  const voucherHeight =
    (pageHeight - 2 * margin - (rows - 1) * gap) / rows;

  const padX = 4;
  const padY = 6;
  const labelGap = 2;

  // Fonts
  const titleSize = 12;
  const bodySize = 9;
  const bodyLH = 5;
  const ruleGap = 3;
  const footerSize = 7;
  const footerLH = 3;

  const footerLines = [
    "Powered by: MOVAsoft solutions",
    "0538848199",
    "Buycheckerpins.com",
    "T&C Apply",
  ];

  vouchers.forEach((voucher, index) => {
    const onPage = index % perPage;
    if (index > 0 && onPage === 0) doc.addPage();

    const col = onPage % cols;
    const row = Math.floor(onPage / cols);

    const startX = margin + col * (voucherWidth + gap);
    const startY = margin + row * (voucherHeight + gap);

    // Border
    doc.setLineWidth(0.5);
    doc.rect(startX, startY, voucherWidth, voucherHeight);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleSize);
    const title = `${product.toUpperCase()} Checker`;
    const titleY = startY + padY + 4;
    doc.text(title, startX + voucherWidth / 2, titleY, { align: "center" });

    // Rule under title
    doc.setLineWidth(0.2);
    doc.line(startX + padX, titleY + 2, startX + voucherWidth - padX, titleY + 2);

    // Body
    doc.setFontSize(bodySize);
    doc.setFont("helvetica", "normal");

    const contentX = startX + padX;
    let y = titleY + 2 + ruleGap;

    const labelWidthSerial = doc.getTextWidth("SERIAL:");
    const labelWidthPIN = doc.getTextWidth("PIN:");
    const labelWidthURL = doc.getTextWidth("URL:");
    const maxLabelWidth = Math.max(labelWidthSerial, labelWidthPIN, labelWidthURL);

    const writeRow = (label, value) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, contentX, y);
      doc.setFont("helvetica", "bold");
      const valueX = contentX + maxLabelWidth + labelGap;
      const maxValueWidth = startX + voucherWidth - padX - valueX;
      let lines = doc.splitTextToSize(String(value), maxValueWidth);
      doc.text(lines, valueX, y);
      y += bodyLH * lines.length;
    };

    writeRow("SERIAL:", voucher.serial);
    writeRow("PIN:", voucher.pin);
    writeRow("URL:", getResultCheckingUrl(product));

    // Price
    
    doc.line(startX + padX, y, startX + voucherWidth - padX, y);
    y += ruleGap ;
    doc.setFont("helvetica", "normal");
    doc.text("Price:", contentX, y);
    doc.setFont("helvetica", "bold");
    doc.text(getVoucherPrice(product), contentX + maxLabelWidth + labelGap, y);
    y += bodyLH;

    // Contact
    
    doc.line(startX + padX, y, startX + voucherWidth - padX, y);
    y += ruleGap;
    doc.setFont("helvetica", "normal");
    doc.text("Contact:", contentX, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(phone), contentX + maxLabelWidth + labelGap, y);

    // Footer
    const footerTotalH = footerLines.length * footerLH;
    let fy = startY + voucherHeight - padY - footerTotalH;
    if (fy < y + 2) fy = y + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(footerSize);
    doc.setTextColor(100, 100, 100);
    footerLines.forEach((line) => {
      doc.text(line, contentX, fy);
      fy += footerLH;
    });
    doc.setTextColor(0, 0, 0);
  });

  return doc.output("datauristring").split(",")[1];
};

export const uploadVoucherFile = async (fileContent: string, filename: string, contentType: string, supabaseClient: any): Promise<string> => {
  try {
    console.log(`📤 Uploading voucher file: ${filename}`);
    
    // Convert base64 content to Uint8Array for binary data (PDF) or use string directly for CSV
    let fileData: Uint8Array | string;
    
    if (contentType === 'application/pdf') {
      // For PDF, convert base64 to binary
      const binaryString = atob(fileContent);
      fileData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileData[i] = binaryString.charCodeAt(i);
      }
    } else {
      // For CSV, use string directly
      fileData = fileContent;
    }
    // Upload to Supabase storage
    const { data, error } = await supabaseClient.storage
      .from('email-attachments')
      .upload(filename, fileData, {
        contentType: contentType,
        upsert: false
      });
    
    if (error) {
      console.error('❌ Error uploading file to storage:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('email-attachments')
      .getPublicUrl(filename);
    
    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('❌ Error in uploadVoucherFile:', error);
    throw error;
  }
  };
