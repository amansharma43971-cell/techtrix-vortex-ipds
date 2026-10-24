import ExcelJS from 'exceljs';
import { db } from '../db/database.js';

export async function generateInventoryExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BhandarSetu iPDS';
  workbook.created = new Date();

  // Sheet 1: Batch Inventory
  const sheet = workbook.addWorksheet('Batch Inventory', {
    views: [{ showGridLines: true }]
  });

  sheet.columns = [
    { header: 'Batch ID', key: 'id', width: 14 },
    { header: 'Commodity', key: 'commodity', width: 22 },
    { header: 'Arrival Date', key: 'arrival', width: 15 },
    { header: 'Age (Days)', key: 'age', width: 12 },
    { header: 'Total (Bags)', key: 'total', width: 15 },
    { header: 'Available (Bags)', key: 'avail', width: 16 },
    { header: 'Quality Status', key: 'status', width: 16 },
    { header: 'Supplier Source', key: 'supplier', width: 28 },
    { header: 'Inspection Note', key: 'notes', width: 35 },
  ];

  // Header style
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0B4DA8' }
  };

  const batches = db.prepare(`
    SELECT b.*, c.name as commodity_name,
           CAST((julianday('now') - julianday(b.arrival_date)) AS INTEGER) as age_days
    FROM batches b
    JOIN commodities c ON b.commodity_id = c.id
    ORDER BY b.arrival_date ASC
  `).all() as any[];

  batches.forEach(b => {
    sheet.addRow({
      id: b.id,
      commodity: b.commodity_name,
      arrival: b.arrival_date,
      age: b.age_days,
      total: b.total_qty,
      avail: b.available_qty,
      status: b.quality_status,
      supplier: b.supplier || 'N/A',
      notes: b.hold_reason || b.notes || 'Normal'
    });
  });

  // Sheet 2: Dispatches Log
  const dispatchSheet = workbook.addWorksheet('Dispatches Log');
  dispatchSheet.columns = [
    { header: 'Dispatch No', key: 'no', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Commodity', key: 'commodity', width: 20 },
    { header: 'Destination FPS', key: 'shop', width: 25 },
    { header: 'Requested Bags', key: 'req', width: 16 },
    { header: 'Allocated Bags', key: 'alloc', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Vehicle No', key: 'vehicle', width: 18 },
  ];

  dispatchSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dispatchSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' }
  };

  const dispatches = db.prepare(`
    SELECT d.*, c.name as commodity_name
    FROM dispatch_orders d
    JOIN commodities c ON d.commodity_id = c.id
    ORDER BY d.created_at DESC
  `).all() as any[];

  dispatches.forEach(d => {
    dispatchSheet.addRow({
      no: d.dispatch_no,
      date: d.created_at.slice(0, 10),
      commodity: d.commodity_name,
      shop: d.destination_shop,
      req: d.requested_qty,
      alloc: d.allocated_qty,
      status: d.status,
      vehicle: d.vehicle_no || 'N/A'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

