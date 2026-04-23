import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatINR, getScoreBarColor } from '@/lib/format';

interface AutoTableDoc extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface AssessmentData {
  borrower_name: string;
  cin: string | null;
  sector: string | null;
  loan_requested: number | null;
  loan_recommended: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  composite_score: number | null;
  character_score: number | null;
  capacity_score: number | null;
  capital_score: number | null;
  collateral_score: number | null;
  conditions_score: number | null;
  status: string;
  recommendation_rationale: string | null;
  created_at?: string;
}

interface FraudFlag {
  fraud_type: string | null;
  source_a: string | null;
  source_b: string | null;
  variance_amount: string | null;
  severity: string | null;
  evidence: string | null;
}

interface ResearchFinding {
  source: string | null;
  finding: string | null;
  sentiment: string | null;
}

interface Covenant {
  covenant_text: string | null;
}

// Professional PDF styling constants
const PDF_STYLES = {
  // Page layout
  PAGE_MARGINS: { top: 20, right: 20, bottom: 20, left: 20 },
  PAGE_WIDTH: 210, // A4 width in mm
  
  // Typography
  FONTS: {
    PRIMARY: 'helvetica',
    BOLD: 'helvetica',
    ITALIC: 'helvetica'
  },
  SIZES: {
    TITLE: 16,
    SUBTITLE: 12,
    HEADER: 10,
    BODY: 9,
    SMALL: 8,
    FOOTER: 7
  },
  
  // Colors
  COLORS: {
    PRIMARY: [15, 23, 42] as [number, number, number],      // slate-900
    SECONDARY: [100, 116, 139] as [number, number, number], // slate-500
    ACCENT: [59, 130, 246] as [number, number, number],     // blue-500
    SUCCESS: [16, 185, 129] as [number, number, number],    // emerald-500
    WARNING: [245, 158, 11] as [number, number, number],    // amber-500
    DANGER: [239, 68, 68] as [number, number, number],      // red-500
    MUTED: [248, 250, 252] as [number, number, number],     // slate-50
    BORDER: [226, 232, 240] as [number, number, number]     // slate-200
  },
  
  // Spacing
  SPACING: {
    XS: 2,
    SM: 4,
    MD: 6,
    LG: 8,
    XL: 12,
    XXL: 16
  },
  
  // Table styling
  TABLE: {
    CELL_PADDING: 3,
    BORDER_WIDTH: 0.1,
    ROW_HEIGHT: 7
  }
} as const;

const FIVE_CS = ['Character', 'Capacity', 'Capital', 'Collateral', 'Conditions'] as const;
const FIVE_CS_WEIGHTS: Record<string, number> = { 
  Character: 25, 
  Capacity: 30, 
  Capital: 20, 
  Collateral: 15, 
  Conditions: 10 
};

function hexFromHsl(hslStr: string): string {
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (!match) return '#666666';
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

class ProfessionalPDFGenerator {
  private doc: AutoTableDoc;
  private pageWidth: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4') as AutoTableDoc;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.margin = PDF_STYLES.PAGE_MARGINS.left;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = PDF_STYLES.PAGE_MARGINS.top;
  }

  // Text rendering helpers
  private setFont(size: number, style: 'normal' | 'bold' | 'italic' = 'normal'): void {
    this.doc.setFont(PDF_STYLES.FONTS.BOLD, style);
    this.doc.setFontSize(size);
  }

  private setColor(color: [number, number, number]): void {
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  private addText(text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }): void {
    this.doc.text(text, x, y, { align: options?.align || 'left' });
  }

  private addMultilineText(text: string, x: number, y: number, maxWidth: number, lineHeight: number = PDF_STYLES.SPACING.SM): number {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, index: number) => {
      this.addText(line, x, y + (index * lineHeight));
    });
    return y + (lines.length * lineHeight);
  }

  // Layout helpers
  private checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.doc.internal.pageSize.getHeight() - PDF_STYLES.PAGE_MARGINS.bottom - 20) {
      this.doc.addPage();
      this.currentY = PDF_STYLES.PAGE_MARGINS.top;
    }
  }

  private addVerticalSpace(amount: number): void {
    this.currentY += amount;
  }

  // Drawing helpers
  private drawRectangle(x: number, y: number, width: number, height: number, fillColor?: [number, number, number], strokeColor?: [number, number, number]): void {
    if (fillColor) {
      this.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      this.doc.rect(x, y, width, height, 'F');
    }
    if (strokeColor) {
      this.doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
      this.doc.rect(x, y, width, height, 'S');
    }
  }

  private drawRoundedRectangle(x: number, y: number, width: number, height: number, radius: number, fillColor?: [number, number, number]): void {
    if (fillColor) {
      this.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    }
    this.doc.roundedRect(x, y, width, height, radius, radius, fillColor ? 'F' : 'S');
  }

  // Header section
  private addHeader(assessment: AssessmentData): void {
    // Header background
    this.drawRectangle(0, 0, this.pageWidth, 45, PDF_STYLES.COLORS.PRIMARY);
    
    // Title
    this.setFont(PDF_STYLES.SIZES.TITLE, 'bold');
    this.setColor([255, 255, 255]);
    this.addText('Credit Appraisal Memorandum', this.margin, 25);
    
    // Subtitle
    this.setFont(PDF_STYLES.SIZES.BODY, 'normal');
    this.addText(`${assessment.borrower_name} · CIN: ${assessment.cin || 'N/A'} · Sector: ${assessment.sector || 'N/A'}`, this.margin, 32);
    
    // Date
    this.setFont(PDF_STYLES.SIZES.SMALL, 'normal');
    this.addText(`Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`, this.margin, 38);
    
    // Status badge
    const statusLabel = assessment.status === 'approved' ? 'APPROVED' : 
                       assessment.status === 'conditional' ? 'CONDITIONAL' : 'REJECTED';
    const statusColor = assessment.status === 'approved' ? PDF_STYLES.COLORS.SUCCESS : 
                        assessment.status === 'conditional' ? PDF_STYLES.COLORS.WARNING : PDF_STYLES.COLORS.DANGER;
    
    const badgeWidth = 35;
    const badgeX = this.pageWidth - this.margin - badgeWidth;
    this.drawRoundedRectangle(badgeX, 20, badgeWidth, 12, 2, statusColor);
    
    this.setFont(PDF_STYLES.SIZES.SMALL, 'bold');
    this.setColor([255, 255, 255]);
    this.addText(statusLabel, badgeX + badgeWidth / 2, 27, { align: 'center' });
    
    this.currentY = 55;
  }

  // KPI Summary section
  private addKPISummary(assessment: AssessmentData): void {
    this.checkPageBreak(30);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    this.addText('LOAN SUMMARY', this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.MD);
    
    // KPI data
    const kpis = [
      ['Loan Requested', assessment.loan_requested ? formatINR(assessment.loan_requested) : 'N/A'],
      ['Recommended Limit', assessment.loan_recommended ? formatINR(assessment.loan_recommended) : 'N/A'],
      ['Interest Rate', assessment.interest_rate ? `${assessment.interest_rate}%` : 'N/A'],
      ['Tenure', assessment.tenure_months ? `${assessment.tenure_months} Months` : 'N/A'],
      ['Composite Score', `${assessment.composite_score || 0}/100`]
    ];
    
    const kpiWidth = (this.contentWidth - (PDF_STYLES.SPACING.SM * (kpis.length - 1))) / kpis.length;
    
    kpis.forEach(([label, value], index) => {
      const x = this.margin + (index * (kpiWidth + PDF_STYLES.SPACING.SM));
      
      // KPI box
      this.drawRoundedRectangle(x, this.currentY, kpiWidth, 25, 2, PDF_STYLES.COLORS.MUTED);
      
      // Label
      this.setFont(PDF_STYLES.SIZES.SMALL, 'normal');
      this.setColor(PDF_STYLES.COLORS.SECONDARY);
      this.addText(label.toUpperCase(), x + kpiWidth / 2, this.currentY + 8, { align: 'center' });
      
      // Value
      this.setFont(PDF_STYLES.SIZES.BODY, 'bold');
      this.setColor(PDF_STYLES.COLORS.PRIMARY);
      this.addText(value, x + kpiWidth / 2, this.currentY + 18, { align: 'center' });
    });
    
    this.addVerticalSpace(35);
  }

  // Five Cs scoring section
  private addFiveCsScoring(assessment: AssessmentData): void {
    this.checkPageBreak(80);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    this.addText('FIVE-Cs SCORING MODEL', this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.MD);
    
    const scores = {
      Character: assessment.character_score || 0,
      Capacity: assessment.capacity_score || 0,
      Capital: assessment.capital_score || 0,
      Collateral: assessment.collateral_score || 0,
      Conditions: assessment.conditions_score || 0,
    };
    
    FIVE_CS.forEach((c) => {
      const score = scores[c];
      const barColor = hexFromHsl(getScoreBarColor(score));
      
      // Label
      this.setFont(PDF_STYLES.SIZES.BODY, 'normal');
      this.setColor(PDF_STYLES.COLORS.PRIMARY);
      this.addText(`${c} (${FIVE_CS_WEIGHTS[c]}%)`, this.margin, this.currentY + 4);
      
      // Score
      this.setFont(PDF_STYLES.SIZES.BODY, 'bold');
      this.addText(`${score}/100`, this.margin + this.contentWidth, this.currentY + 4, { align: 'right' });
      
      // Progress bar background
      const barX = this.margin + 55;
      const barWidth = this.contentWidth - 80;
      this.drawRoundedRectangle(barX, this.currentY, barWidth, 6, 1, PDF_STYLES.COLORS.BORDER);
      
      // Progress bar fill
      if (score > 0) {
        const fillWidth = barWidth * (score / 100);
        this.drawRoundedRectangle(barX, this.currentY, fillWidth, 6, 1, hexToRgb(barColor));
      }
      
      this.addVerticalSpace(PDF_STYLES.SPACING.LG);
    });
    
    this.addVerticalSpace(PDF_STYLES.SPACING.MD);
  }

  // Fraud flags section
  private addFraudFlags(fraudFlags: FraudFlag[]): void {
    this.checkPageBreak(60);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    const headerText = fraudFlags.length > 0 ? 
      `TRIANGULATION FLAGS (${fraudFlags.length} DETECTED)` : 
      'NO FRAUD SIGNALS DETECTED';
    this.addText(headerText, this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.SM);
    
    if (fraudFlags.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        margin: { left: this.margin, right: this.margin },
        head: [['Fraud Type', 'Source A', 'Source B', 'Variance', 'Severity']],
        body: fraudFlags.map(f => [
          f.fraud_type || '',
          this.truncateText(f.source_a || '', 25),
          this.truncateText(f.source_b || '', 25),
          f.variance_amount || '',
          f.severity || ''
        ]),
        styles: { 
          fontSize: PDF_STYLES.SIZES.SMALL,
          cellPadding: PDF_STYLES.TABLE.CELL_PADDING,
          textColor: PDF_STYLES.COLORS.PRIMARY,
          font: PDF_STYLES.FONTS.PRIMARY,
          lineColor: PDF_STYLES.COLORS.BORDER,
          lineWidth: PDF_STYLES.TABLE.BORDER_WIDTH
        },
        headStyles: { 
          fillColor: PDF_STYLES.COLORS.PRIMARY,
          textColor: [255, 255, 255],
          fontSize: PDF_STYLES.SIZES.SMALL,
          fontStyle: 'bold',
          font: PDF_STYLES.FONTS.BOLD
        },
        alternateRowStyles: { fillColor: PDF_STYLES.COLORS.MUTED },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 }
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            const val = data.cell.raw as string;
            if (val === 'HIGH') {
              data.cell.styles.textColor = PDF_STYLES.COLORS.DANGER;
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'MEDIUM') {
              data.cell.styles.textColor = PDF_STYLES.COLORS.WARNING;
            }
          }
        },
      });
      
      this.currentY = (this.doc as AutoTableDoc).lastAutoTable.finalY + PDF_STYLES.SPACING.MD;
    } else {
      this.setFont(PDF_STYLES.SIZES.BODY, 'italic');
      this.setColor(PDF_STYLES.COLORS.SECONDARY);
      this.addText('No fraud signals detected in the analysis.', this.margin, this.currentY + PDF_STYLES.SPACING.SM);
      this.addVerticalSpace(PDF_STYLES.SPACING.LG);
    }
  }

  // Research findings section
  private addResearchFindings(findings: ResearchFinding[]): void {
    this.checkPageBreak(60);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    this.addText('RESEARCH AGENT FINDINGS', this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.SM);
    
    if (findings.length > 0) {
      // Calculate available width for columns
      const sourceWidth = 25;
      const findingWidth = 60;
      const sentimentWidth = 25;
      const totalWidth = sourceWidth + findingWidth + sentimentWidth;
      
      // Ensure total doesn't exceed content width
      const scale = Math.min(1, this.contentWidth / totalWidth);
      const scaledSourceWidth = sourceWidth * scale;
      const scaledFindingWidth = findingWidth * scale;
      const scaledSentimentWidth = sentimentWidth * scale;
      
      autoTable(this.doc, {
        startY: this.currentY,
        margin: { left: this.margin, right: this.margin },
        head: [['Source', 'Finding', 'Sentiment']],
        body: findings.map(f => [
          this.truncateText(f.source || '', Math.floor(scaledSourceWidth / 2)),
          this.wrapText(f.finding || '', Math.floor(scaledFindingWidth / 2)),
          f.sentiment || ''
        ]),
        styles: { 
          fontSize: PDF_STYLES.SIZES.SMALL,
          cellPadding: PDF_STYLES.TABLE.CELL_PADDING,
          textColor: PDF_STYLES.COLORS.PRIMARY,
          font: PDF_STYLES.FONTS.PRIMARY,
          lineColor: PDF_STYLES.COLORS.BORDER,
          lineWidth: PDF_STYLES.TABLE.BORDER_WIDTH,
          cellWidth: 'auto',
          overflow: 'linebreak',
          minCellHeight: PDF_STYLES.TABLE.ROW_HEIGHT
        },
        headStyles: { 
          fillColor: PDF_STYLES.COLORS.PRIMARY,
          textColor: [255, 255, 255],
          fontSize: PDF_STYLES.SIZES.SMALL,
          fontStyle: 'bold',
          font: PDF_STYLES.FONTS.BOLD,
          cellWidth: 'auto'
        },
        alternateRowStyles: { fillColor: PDF_STYLES.COLORS.MUTED },
        columnStyles: {
          0: { cellWidth: scaledSourceWidth, overflow: 'ellipsize', fontStyle: 'bold' },
          1: { cellWidth: scaledFindingWidth, overflow: 'linebreak' },
          2: { cellWidth: scaledSentimentWidth, overflow: 'ellipsize' }
        },
        didParseCell: (data) => {
          // Ensure text fits within cell boundaries
          if (data.section === 'body' && data.cell.raw) {
            const cellWidth = data.column.width || 0;
            const text = data.cell.raw as string;
            if (text.length > 0) {
              const maxChars = Math.floor(cellWidth / 2); // Approximate character count
              if (text.length > maxChars) {
                data.cell.text = [this.truncateText(text, maxChars)];
              }
            }
          }
        }
      });
      
      this.currentY = (this.doc as AutoTableDoc).lastAutoTable.finalY + PDF_STYLES.SPACING.MD;
    } else {
      this.setFont(PDF_STYLES.SIZES.BODY, 'italic');
      this.setColor(PDF_STYLES.COLORS.SECONDARY);
      this.addText('No research findings available.', this.margin, this.currentY + PDF_STYLES.SPACING.SM);
      this.addVerticalSpace(PDF_STYLES.SPACING.LG);
    }
  }

  // Recommendation rationale section
  private addRecommendationRationale(assessment: AssessmentData): void {
    this.checkPageBreak(80);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    this.addText('RECOMMENDATION RATIONALE', this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.MD);
    
    // Rationale text with proper wrapping
    this.setFont(PDF_STYLES.SIZES.BODY, 'normal');
    this.setColor(PDF_STYLES.COLORS.PRIMARY);
    const rationale = assessment.recommendation_rationale || 'No rationale provided.';
    
    // Use jsPDF's built-in text splitting to ensure proper wrapping within margins
    const lines = this.doc.splitTextToSize(rationale, this.contentWidth);
    const lineHeight = PDF_STYLES.SPACING.SM + 1.5; // 5.5mm line height for better readability
    const maxLinesPerPage = Math.floor((this.doc.internal.pageSize.getHeight() - this.currentY - PDF_STYLES.PAGE_MARGINS.bottom - 30) / lineHeight);
    
    // Add lines with page break handling if needed
    let currentLineIndex = 0;
    while (currentLineIndex < lines.length) {
      // Check if we need a page break
      const remainingLines = lines.length - currentLineIndex;
      const linesOnThisPage = Math.min(remainingLines, maxLinesPerPage);
      
      // Add lines for current page
      for (let i = 0; i < linesOnThisPage; i++) {
        const line = lines[currentLineIndex + i];
        if (line && line.trim()) {
          this.addText(line, this.margin, this.currentY + (i * lineHeight));
        }
      }
      
      currentLineIndex += linesOnThisPage;
      
      // If there are more lines, add page break
      if (currentLineIndex < lines.length) {
        this.doc.addPage();
        this.currentY = PDF_STYLES.PAGE_MARGINS.top;
      } else {
        this.addVerticalSpace(linesOnThisPage * lineHeight + PDF_STYLES.SPACING.MD);
      }
    }
  }

  // Covenants section
  private addCovenants(covenants: Covenant[]): void {
    if (covenants.length === 0) return;
    
    this.checkPageBreak(60);
    
    // Section header
    this.setFont(PDF_STYLES.SIZES.HEADER, 'bold');
    this.setColor(PDF_STYLES.COLORS.SECONDARY);
    this.addText('COVENANTS', this.margin, this.currentY);
    this.addVerticalSpace(PDF_STYLES.SPACING.MD);
    
    // Covenants list with proper wrapping
    this.setFont(PDF_STYLES.SIZES.BODY, 'normal');
    this.setColor(PDF_STYLES.COLORS.PRIMARY);
    
    covenants.forEach((covenant, index) => {
      this.checkPageBreak(30); // Check before each covenant
      
      const text = `${index + 1}. ${covenant.covenant_text || ''}`;
      
      // Use jsPDF's text splitting to ensure proper wrapping within margins
      const lines = this.doc.splitTextToSize(text, this.contentWidth);
      const lineHeight = PDF_STYLES.SPACING.SM + 1.5; // 5.5mm line height
      
      // Add each line
      lines.forEach((line: string, lineIndex: number) => {
        if (line && line.trim()) {
          this.addText(line, this.margin, this.currentY + (lineIndex * lineHeight));
        }
      });
      
      this.addVerticalSpace(lines.length * lineHeight + PDF_STYLES.SPACING.SM);
    });
  }

  // Footer
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer background
      const footerHeight = 15;
      const footerY = this.doc.internal.pageSize.getHeight() - footerHeight;
      this.drawRectangle(0, footerY, this.pageWidth, footerHeight, PDF_STYLES.COLORS.MUTED);
      
      // Footer text
      this.setFont(PDF_STYLES.SIZES.FOOTER, 'normal');
      this.setColor(PDF_STYLES.COLORS.SECONDARY);
      this.addText('CredNova · AI-Powered Credit Appraisal · Confidential', this.margin, footerY + 9);
      this.addText(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin, footerY + 9, { align: 'right' });
    }
  }

  // Helper method to truncate text
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Helper method to wrap text for table cells
  private wrapText(text: string, maxWidth: number): string {
    if (!text) return '';
    // For table cells, jsPDF will handle wrapping, but we ensure reasonable length
    const maxChars = Math.max(10, maxWidth * 2); // Approximate characters that fit
    return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  }

  // Main generation method
  public generatePDF(assessment: AssessmentData, fraudFlags: FraudFlag[], findings: ResearchFinding[], covenants: Covenant[]): void {
    // Add all sections
    this.addHeader(assessment);
    this.addKPISummary(assessment);
    this.addFiveCsScoring(assessment);
    this.addFraudFlags(fraudFlags);
    this.addResearchFindings(findings);
    this.addRecommendationRationale(assessment);
    this.addCovenants(covenants);
    this.addFooter();
    
    // Save the PDF
    const filename = `CredNova_${assessment.borrower_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    this.doc.save(filename);
  }
}

export function generateCAMPdf(
  assessment: AssessmentData,
  fraudFlags: FraudFlag[],
  findings: ResearchFinding[],
  covenants: Covenant[]
): void {
  const generator = new ProfessionalPDFGenerator();
  generator.generatePDF(assessment, fraudFlags, findings, covenants);
}
