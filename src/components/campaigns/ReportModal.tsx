import { useState } from 'react';
import { FileText, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCurrency, formatKm, estimatedImpressions } from '@/lib/utils';
import type { Campaign, Driver, DriverCampaign } from '@/types';
import { WRAP_TYPE_LABELS } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  sessions: any[];
  driverCampaigns: DriverCampaign[];
}

export function ReportModal({ isOpen, onClose, campaign, sessions, driverCampaigns }: Props) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const totalKm = sessions.reduce((sum, s) => sum + (Number(s.total_km) || 0), 0);
  const totalImpressions = estimatedImpressions(totalKm, campaign.impressions_per_km);

  async function generatePDF() {
    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 20;

      // Cover page
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 80, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WRAPPED MEDIA', margin, 35);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Campaign Performance Report', margin, 45);

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(249, 115, 22);
      pdf.text(campaign.name, margin, 60);

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      const client = (campaign.client as any)?.company_name ?? 'N/A';
      pdf.text(`Client: ${client}`, margin, 70);

      // Campaign details
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Campaign Summary', margin, 100);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);

      const details = [
        ['Campaign Name', campaign.name],
        ['Client', client],
        ['Duration', `${formatDate(campaign.start_date)} – ${formatDate(campaign.end_date)}`],
        ['Markets', campaign.cities.join(', ')],
        ['Wrap Type', WRAP_TYPE_LABELS[campaign.wrap_type]],
        ['Status', campaign.status.toUpperCase()],
        ['Budget', formatCurrency(campaign.budget)],
      ];

      autoTable(pdf, {
        startY: 105,
        body: details,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 60 },
          1: { textColor: [15, 23, 42] },
        },
        margin: { left: margin, right: margin },
      });

      // Performance metrics
      const nextY = (pdf as any).lastAutoTable.finalY + 15;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Performance vs Target', margin, nextY);

      const activeDrivers = driverCampaigns.filter(dc => dc.status !== 'removed').length;
      const targetKm = activeDrivers * 100 * 30;
      const targetImpressions = estimatedImpressions(targetKm, campaign.impressions_per_km);

      autoTable(pdf, {
        startY: nextY + 5,
        head: [['Metric', 'Target', 'Actual', 'Delta']],
        body: [
          ['Vehicles Deployed', campaign.vehicle_count_target, activeDrivers, activeDrivers >= campaign.vehicle_count_target ? '✓ Met' : `${activeDrivers - campaign.vehicle_count_target}`],
          ['Km Driven', `${targetKm.toLocaleString()} km`, `${Math.round(totalKm).toLocaleString()} km`, totalKm > 0 ? `${((totalKm / targetKm) * 100).toFixed(0)}%` : 'N/A'],
          ['Impressions Est.', targetImpressions.toLocaleString(), totalImpressions.toLocaleString(), totalImpressions > 0 ? `${((totalImpressions / targetImpressions) * 100).toFixed(0)}%` : 'N/A'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: margin, right: margin },
      });

      // Driver list
      const driversY = (pdf as any).lastAutoTable.finalY + 15;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Driver Summary', margin, driversY);

      const driverRows = driverCampaigns.map(dc => {
        const d = dc.driver as Driver;
        const driverKm = sessions.filter(s => s.driver_id === dc.driver_id).reduce((sum: number, s: any) => sum + Number(s.total_km || 0), 0);
        return [
          d?.name ?? '—',
          d?.city ?? '—',
          `${Math.round(driverKm)} km`,
          Intl.NumberFormat('en-CA').format(estimatedImpressions(driverKm, campaign.impressions_per_km)),
          dc.status.replace(/_/g, ' '),
        ];
      });

      autoTable(pdf, {
        startY: driversY + 5,
        head: [['Driver', 'City', 'Km Driven', 'Impressions', 'Status']],
        body: driverRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: margin, right: margin },
      });

      // Methodology footer
      pdf.addPage();
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageW, 40, 'F');
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Measurement Methodology', margin, 20);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Impressions are estimated using GPS-tracked kilometres driven multiplied by the impressions-per-km constant (${campaign.impressions_per_km.toLocaleString()}).`,
        margin, 30, { maxWidth: pageW - margin * 2 }
      );
      pdf.text(
        `This methodology captures street-level advertising reach based on vehicle movement data logged via the Wrapped Media driver app.`,
        margin, 37, { maxWidth: pageW - margin * 2 }
      );

      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated: ${new Date().toLocaleString('en-CA')} · Wrapped Media Confidential`, margin, pdf.internal.pageSize.getHeight() - 10);

      const filename = `${client}_${campaign.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`.replace(/\s+/g, '_');
      pdf.save(filename);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Campaign Report"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={generatePDF} loading={generating}>
            <Download className="w-4 h-4" />
            {generating ? 'Generating…' : 'Download PDF'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {generated && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Report downloaded successfully!</p>
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-brand-orange" />
            <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
          </div>
          <dl className="space-y-2 text-sm">
            {[
              ['Client', (campaign.client as any)?.company_name ?? '—'],
              ['Date Range', `${formatDate(campaign.start_date)} – ${formatDate(campaign.end_date)}`],
              ['Total Km', formatKm(totalKm)],
              ['Est. Impressions', totalImpressions.toLocaleString()],
              ['Drivers', driverCampaigns.filter(dc => dc.status !== 'removed').length],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-sm text-slate-500">
          The PDF report includes a cover page, campaign summary, performance vs target metrics, driver breakdown, and impression methodology note.
        </p>
      </div>
    </Modal>
  );
}
