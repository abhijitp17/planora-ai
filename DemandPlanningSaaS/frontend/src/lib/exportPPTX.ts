import React from 'react';
import pptxgen from 'pptxgenjs';
import html2canvas from 'html2canvas';

/**
 * Export analytics dashboard to PowerPoint
 * Captures all charts and creates professional presentation
 */
export async function exportDashboardToPPTX(
  charts: Array<{ ref: React.RefObject<HTMLDivElement>; title: string; subtitle?: string }>,
  title = 'Planora AI Analytics Dashboard'
) {
  const pres = new pptxgen();
  
  // Title slide
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: '064e3b' };
  titleSlide.addText(title, {
    x: 0.5, y: 2.5, w: 9, h: 1,
    fontSize: 32, bold: true, color: 'FFFFFF', align: 'center',
  });
  titleSlide.addText(`Generated ${new Date().toLocaleDateString()}`, {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontSize: 14, color: 'D4AF37', align: 'center',
  });

  // Chart slides
  for (const chart of charts) {
    if (!chart.ref.current) continue;
    
    try {
      // Capture chart as image
      const canvas = await html2canvas(chart.ref.current, {
        backgroundColor: '#ffffff',
        scale: 2, // High DPI
      });
      const imgData = canvas.toDataURL('image/png');

      const slide = pres.addSlide();
      
      // Title
      slide.addText(chart.title, {
        x: 0.5, y: 0.3, w: 9, h: 0.5,
        fontSize: 18, bold: true, color: '1f2937',
      });
      
      // Subtitle if provided
      if (chart.subtitle) {
        slide.addText(chart.subtitle, {
          x: 0.5, y: 0.75, w: 9, h: 0.3,
          fontSize: 12, color: '64748b',
        });
      }

      // Chart image
      slide.addImage({
        data: imgData,
        x: 0.5,
        y: chart.subtitle ? 1.2 : 1.0,
        w: 9,
        h: 5,
      });
      
      // Footer
      slide.addText('Planora AI — Enterprise Supply Chain Intelligence', {
        x: 0.5, y: 6.8, w: 9, h: 0.3,
        fontSize: 9, color: '94a3b8', align: 'center',
      });
      
    } catch (err) {
      console.error(`Failed to capture chart: ${chart.title}`, err);
    }
  }

  // Save file
  const filename = `Planora_Dashboard_${new Date().toISOString().slice(0, 10)}.pptx`;
  await pres.writeFile({ fileName: filename });
  
  return filename;
}

/**
 * Hook to collect chart refs for export
 */
export function useChartExport() {
  const chartRefs = React.useRef<Array<{ ref: React.RefObject<HTMLDivElement>; title: string; subtitle?: string }>>([]);
  
  const registerChart = (ref: React.RefObject<HTMLDivElement>, title: string, subtitle?: string) => {
    if (!chartRefs.current.find(c => c.ref === ref)) {
      chartRefs.current.push({ ref, title, subtitle });
    }
  };
  
  const exportAll = async () => {
    return await exportDashboardToPPTX(chartRefs.current);
  };
  
  return { registerChart, exportAll, chartCount: chartRefs.current.length };
}
