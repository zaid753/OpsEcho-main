import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ExportPDFButton({ incident }: { incident: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!reportRef.current || !incident) return;
    setIsExporting(true);

    try {
      // Temporarily make the hidden div visible for html2canvas
      reportRef.current.style.display = 'block';
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      reportRef.current.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`OpsEcho_PostMortem_${incident.roomCode}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
          <Download className="w-3 h-3" />
        )}
        Export PDF
      </button>

      {/* Hidden printable report layout */}
      <div 
        ref={reportRef} 
        style={{ 
          display: 'none', 
          width: '800px', 
          padding: '40px', 
          backgroundColor: '#ffffff', 
          color: '#000000',
          fontFamily: 'Inter, sans-serif' 
        }}
      >
        <div style={{ borderBottom: '2px solid #5B7FDB', paddingBottom: '20px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', fontFamily: 'Space Grotesk, sans-serif', color: '#0A0E14' }}>
            OpsEcho Post-Mortem
          </h1>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '14px' }}>
            <strong>Incident:</strong> {incident.title} (Code: {incident.roomCode})
          </p>
          <p style={{ margin: '5px 0 0 0', color: '#4b5563', fontSize: '14px' }}>
            <strong>Severity:</strong> {incident.severity} &nbsp;&nbsp;|&nbsp;&nbsp; 
            <strong>Status:</strong> {incident.status}
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#0A0E14' }}>Executive Summary</h2>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
            {incident.summary || 'No summary provided.'}
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#0A0E14' }}>Action Items</h2>
          {incident.actions && incident.actions.length > 0 ? (
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#374151' }}>
              {incident.actions.map((a: any) => (
                <li key={a.id} style={{ marginBottom: '8px' }}>
                  <strong>[{a.status}]</strong> {a.description} 
                  {a.owner ? ` (Owner: ${a.owner.name})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '14px', color: '#6b7280' }}>No action items assigned.</p>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#0A0E14' }}>Key Facts & Timeline</h2>
          {incident.facts && incident.facts.length > 0 ? (
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#374151' }}>
              {incident.facts.map((f: any) => (
                <li key={f.id} style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280', marginRight: '8px' }}>
                    {new Date(f.timestamp).toLocaleTimeString()}
                  </span>
                  {f.description}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: '14px', color: '#6b7280' }}>No facts recorded.</p>
          )}
        </div>
      </div>
    </>
  );
}
