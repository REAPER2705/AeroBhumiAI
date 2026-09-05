import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';

export default function Reports() {
  const [reports] = useState<any[]>([
    { id: 'RPT-2025-018', auditId: 'AUD-2025-018', parcel: 'PLOT-45 (Sector 12)', status: 'Encroachment', date: '24 May 2025 14:32', statusBg: 'bg-red-50 text-red-600 border-red-100' },
    { id: 'RPT-2025-017', auditId: 'AUD-2025-017', parcel: 'PLOT-12 (Sector 7)', status: 'Clear', date: '24 May 2025 11:20', statusBg: 'bg-green-50 text-green-600 border-green-100' },
    { id: 'RPT-2025-016', auditId: 'AUD-2025-016', parcel: 'PLOT-21 (Sector 3)', status: 'Variance', date: '23 May 2025 16:15', statusBg: 'bg-orange-50 text-orange-600 border-orange-100' },
    { id: 'RPT-2025-015', auditId: 'AUD-2025-015', parcel: 'PLOT-09 (Sector 15)', status: 'Clear', date: '23 May 2025 10:10', statusBg: 'bg-green-50 text-green-600 border-green-100' },
    { id: 'RPT-2025-014', auditId: 'AUD-2025-014', parcel: 'PLOT-33 (Sector 8)', status: 'Clear', date: '22 May 2025 18:30', statusBg: 'bg-green-50 text-green-600 border-green-100' },
    { id: 'RPT-2025-013', auditId: 'AUD-2025-013', parcel: 'PLOT-27 (Sector 4)', status: 'Encroachment', date: '22 May 2025 12:05', statusBg: 'bg-red-50 text-red-600 border-red-100' }
  ]);

  const handleDownloadReport = (reportId: string, parcelInfo: string, format: 'pdf' | 'csv' = 'pdf') => {
    if (format === 'csv') {
      const csvContent = `Report ID,Audit ID,Parcel,Status,Generated Date,Parcel Area (sq.m.),Inside Area (sq.m.),Outside Area (sq.m.),Outside Percentage,IoU Score\n"${reportId}","AUD-${reportId.replace('RPT-', '')}","${parcelInfo}","ENCROACHMENT DETECTED","24 May 2025 14:30",500.00,437.55,62.45,12.49%,0.78`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}_Audit_Report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 450 >>
stream
BT
/F1 18 Tf
50 720 Td
(AEROBHUMIAI - LAND COMPLIANCE AUDIT REPORT) Tj
/F1 12 Tf
0 -40 Td
(Report ID: ${reportId}) Tj
0 -20 Td
(Parcel: ${parcelInfo}) Tj
0 -20 Td
(Audit Date: 24 May 2025, 14:30) Tj
0 -20 Td
(Status: ENCROACHMENT DETECTED) Tj
0 -30 Td
(SUMMARY METRICS:) Tj
0 -20 Td
(Parcel Area: 500.00 sq.m.  |  Inside Area: 437.55 sq.m.) Tj
0 -20 Td
(Outside Area: 62.45 sq.m.  |  Outside Percentage: 12.49%) Tj
0 -20 Td
(IoU Score: 0.78 (78.00%)) Tj
0 -30 Td
(AI DIAGNOSIS & RECOMMENDATION:) Tj
0 -20 Td
(1. Re-align the proposed building within legal parcel boundary.) Tj
0 -20 Td
(2. Reduce the building footprint to eliminate encroachment.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000745 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
815
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}_Audit_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1 text-sm">View and download all generated audit reports.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search reports..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500" />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Report ID</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Audit ID</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Parcel</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Generated On</th>
              <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-900">{r.id}</td>
                <td className="px-6 py-4 text-gray-600">{r.auditId}</td>
                <td className="px-6 py-4 text-gray-800 font-medium">{r.parcel}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${r.statusBg}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs">{r.date}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => handleDownloadReport(r.id, r.parcel)}
                    className="p-2 text-gray-500 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors" 
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>Showing 1 to 6 of 18 reports</span>
          <div className="flex gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">&lt;</button>
            <button className="w-7 h-7 flex items-center justify-center rounded bg-green-600 text-white font-bold">1</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">2</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">3</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
