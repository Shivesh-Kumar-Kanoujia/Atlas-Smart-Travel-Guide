// @ts-nocheck
import { useRef, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function TripPDFExport({ trip }: { trip: any }) {
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Build the PDF content as HTML
      const renderContent = () => {
        const totalExpenses = (trip.expenses || []).reduce((sum, ex) => sum + (ex.amount || 0), 0);
        const packedCount = (trip.packing_list || []).filter(i => i.packed).length;
        const totalItems = (trip.packing_list || []).length;
        const days = trip.start_date && trip.end_date
          ? Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)) + 1
          : '—';

        return `
          <div style="font-family:'DM Sans',Arial,sans-serif;padding:40px;max-width:600px;color:#1a1a1a;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="font-size:32px;font-weight:700;color:#1D9E75;margin-bottom:4px;">${trip.name}</div>
              <div style="font-size:14px;color:#888;">${trip.destination}</div>
              <div style="font-size:12px;color:#aaa;margin-top:4px;">${trip.start_date || '—'} → ${trip.end_date || '—'} · ${days} days</div>
            </div>

            <div style="display:flex;gap:16px;margin-bottom:24px;">
              <div style="flex:1;background:#f5f0e8;padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:10px;color:#888;">Budget</div>
                <div style="font-size:18px;font-weight:600;color:#1D9E75;">$${(trip.budget || 0).toLocaleString()}</div>
              </div>
              <div style="flex:1;background:#f5f0e8;padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:10px;color:#888;">Spent</div>
                <div style="font-size:18px;font-weight:600;color:#D85A30;">$${(trip.spent || 0).toLocaleString()}</div>
              </div>
              <div style="flex:1;background:#f5f0e8;padding:12px;border-radius:8px;text-align:center;">
                <div style="font-size:10px;color:#888;">Status</div>
                <div style="font-size:18px;font-weight:600;color:#378ADD;">${(trip.status || 'planned').charAt(0).toUpperCase() + trip.status.slice(1)}</div>
              </div>
            </div>

            ${trip.notes ? `<div style="background:#f5f0e8;padding:12px;border-radius:8px;margin-bottom:24px;font-size:13px;color:#555;line-height:1.5;">${trip.notes}</div>` : ''}

            ${(trip.expenses || []).length > 0 ? `
              <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Expenses ($${totalExpenses.toLocaleString()} total)</h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px;">
                <thead>
                  <tr style="background:#f5f0e8;">
                    <th style="text-align:left;padding:8px;border-bottom:1px solid #ede4d0;">Category</th>
                    <th style="text-align:left;padding:8px;border-bottom:1px solid #ede4d0;">Description</th>
                    <th style="text-align:right;padding:8px;border-bottom:1px solid #ede4d0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${trip.expenses.map(ex => `
                    <tr>
                      <td style="padding:6px 8px;border-bottom:1px solid #ede4d0;">${ex.category}</td>
                      <td style="padding:6px 8px;border-bottom:1px solid #ede4d0;">${ex.description}</td>
                      <td style="text-align:right;padding:6px 8px;border-bottom:1px solid #ede4d0;">$${ex.amount}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${(trip.packing_list || []).length > 0 ? `
              <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Packing List (${packedCount}/${totalItems} packed)</h3>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:24px;">
                ${trip.packing_list.map(it => `
                  <span style="display:inline-block;padding:4px 10px;border-radius:12px;font-size:11px;${it.packed ? 'background:#d4edda;color:#155724;' : 'background:#f5f0e8;color:#888;'}">${it.packed ? '✓ ' : '○ '}${it.item}</span>
                `).join('')}
              </div>
            ` : ''}

            ${(trip.itinerary || []).length > 0 ? `
              <h3 style="font-size:15px;font-weight:600;margin-bottom:8px;color:#1a1a1a;">Itinerary</h3>
              ${trip.itinerary.map(day => `
                <div style="background:#f5f0e8;padding:10px;border-radius:8px;margin-bottom:8px;font-size:12px;">
                  <div style="font-weight:600;margin-bottom:4px;">Day ${day.day}: ${day.title}</div>
                  <div style="color:#555;">${day.theme} · ${day.daily_budget || ''}</div>
                  ${day.local_tip ? `<div style="color:#1D9E75;margin-top:4px;">💡 ${day.local_tip}</div>` : ''}
                </div>
              `).join('')}
            ` : ''}

            <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #ede4d0;font-size:11px;color:#aaa;">
              Generated by Atlas Travel AI · ${new Date().toLocaleDateString()}
            </div>
          </div>
        `;
      };

      // Create a temporary DOM element to render the content
      const container = document.createElement('div');
      container.innerHTML = renderContent();
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '600px';
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${trip.name.replace(/\s+/g, '_')}_trip.pdf`);
      toast.success('PDF exported!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5 mr-1.5" />
      )}
      {exporting ? 'Exporting...' : 'PDF'}
    </Button>
  );
}
