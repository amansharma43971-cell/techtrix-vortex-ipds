import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECEIPTS_DIR = path.resolve(__dirname, '../../../data/receipts');
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

export interface DispatchPdfData {
  dispatchNo: string;
  dispatchDate: string;
  godownName: string;
  godownCode: string;
  commodityName: string;
  destinationShop: string;
  vehicleNo?: string;
  operatorName: string;
  totalBags: number;
  totalKg: number;
  allocations: {
    batchId: string;
    arrivalDate: string;
    allocatedBags: number;
  }[];
  ledgerHash: string;
  qrToken: string;
}

export async function generateDispatchPdf(data: DispatchPdfData): Promise<string> {
  const fileName = `receipt_${data.dispatchNo}.pdf`;
  const filePath = path.join(RECEIPTS_DIR, fileName);

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Generate verification QR code as a PNG buffer
      const verifyUrl = `http://localhost:5173/verify/${data.qrToken}`;
      const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 120, margin: 1 });

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#0B4DA8');
      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
         .text('BHANDARSETU | iPDS GRAIN DISPATCH PROOF', 55, 52);
      doc.fontSize(10).font('Helvetica')
         .text('Department of Food & Civil Supplies | Public Distribution System', 55, 74);

      // Metadata Grid
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica');
      let y = 120;
      doc.font('Helvetica-Bold').text('Dispatch Order No:', 40, y);
      doc.font('Helvetica').text(data.dispatchNo, 160, y);

      doc.font('Helvetica-Bold').text('Dispatch Date:', 330, y);
      doc.font('Helvetica').text(data.dispatchDate, 420, y);

      y += 20;
      doc.font('Helvetica-Bold').text('Issuing Godown:', 40, y);
      doc.font('Helvetica').text(`${data.godownName} (${data.godownCode})`, 160, y);

      doc.font('Helvetica-Bold').text('Target FPS:', 330, y);
      doc.font('Helvetica').text(data.destinationShop, 420, y);

      y += 20;
      doc.font('Helvetica-Bold').text('Commodity:', 40, y);
      doc.font('Helvetica').text(data.commodityName, 160, y);

      doc.font('Helvetica-Bold').text('Vehicle Number:', 330, y);
      doc.font('Helvetica').text(data.vehicleNo || 'Self-Carriage / Hand-Cart', 420, y);

      // Allocation Table Header
      y += 35;
      doc.rect(40, y, 515, 24).fill('#EBF3FC');
      doc.fillColor('#0B4DA8').font('Helvetica-Bold').fontSize(9);
      doc.text('FIFO RANK', 50, y + 7);
      doc.text('BATCH ID', 130, y + 7);
      doc.text('ARRIVAL DATE', 230, y + 7);
      doc.text('ALLOCATED BAGS', 340, y + 7);
      doc.text('NET WEIGHT (KG)', 450, y + 7);

      // Rows
      y += 24;
      doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
      data.allocations.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, y, 515, 22).fill(bg);
        doc.fillColor('#1E293B');
        doc.text(`#${index + 1}`, 50, y + 6);
        doc.text(item.batchId, 130, y + 6);
        doc.text(item.arrivalDate, 230, y + 6);
        doc.text(`${item.allocatedBags} Bags`, 340, y + 6);
        doc.text(`${(item.allocatedBags * 50).toLocaleString()} kg`, 450, y + 6);
        y += 22;
      });

      // Total Summary Row
      doc.rect(40, y, 515, 24).fill('#F1F5F9');
      doc.font('Helvetica-Bold').fillColor('#0F172A');
      doc.text('TOTAL CONSIGNMENT:', 50, y + 7);
      doc.text(`${data.totalBags} Bags`, 340, y + 7);
      doc.text(`${data.totalKg.toLocaleString()} kg`, 450, y + 7);

      // QR Code and Cryptographic Verification Block
      y += 45;
      doc.image(qrBuffer, 40, y, { width: 90 });

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A')
         .text('CRYPTOGRAPHIC AUDIT & LEDGER VERIFICATION', 145, y + 5);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Scan this QR code to verify immutable ledger integrity on public registry.', 145, y + 20)
         .text(`Token: ${data.qrToken}`, 145, y + 32)
         .text(`Ledger Row Hash: ${data.ledgerHash}`, 145, y + 44);

      // Signatures
      y += 120;
      doc.strokeColor('#CBD5E1').lineWidth(1)
         .moveTo(40, y).lineTo(220, y).stroke()
         .moveTo(335, y).lineTo(515, y).stroke();

      doc.fontSize(9).font('Helvetica').fillColor('#475467')
         .text(`Prepared By: ${data.operatorName}`, 40, y + 8)
         .text('Godown Dispatch Officer Signature', 40, y + 22)
         .text('Fair Price Shop Dealer / Transporter Signature', 335, y + 22);

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

