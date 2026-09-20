import {
  Document,
  Packer,
  Paragraph,
  TextRun as DocxTextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageOrientation,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { DNoteDocument, DNoteBlock, WhiteboardBlock } from '../types/document';

// Convert millimeters to twips (1 mm = 56.6929 twips)
const mmToTwips = (mm: number) => Math.round(mm * 56.6929);

// Convert SVG string to PNG ArrayBuffer for Word ImageRun
async function svgToPngArrayBuffer(svgString: string, width: number, height: number): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 2x scaling for high-DPI Word rendering
        const scale = 2;
        canvas.width = (width || 600) * scale;
        canvas.height = (height || 250) * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(blobURL);
          resolve(null);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobURL);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result);
            } else {
              resolve(null);
            }
          };
          reader.onerror = () => resolve(null);
          reader.readAsArrayBuffer(blob);
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobURL);
        resolve(null);
      };

      img.src = blobURL;
    } catch {
      resolve(null);
    }
  });
}

// Generate simple SVG from whiteboard elements if snapshot is missing
function generateSvgFromElements(wb: WhiteboardBlock): string {
  const width = wb.width || 600;
  const height = wb.height || 250;
  let elementsSvg = '';

  for (const el of wb.elements) {
    if (el.type === 'rect') {
      elementsSvg += `<rect x="${el.x || 0}" y="${el.y || 0}" width="${el.width || 100}" height="${el.height || 60}" rx="6" fill="${el.fillColor || '#ffffff'}" stroke="${el.color || '#000000'}" stroke-width="${el.strokeWidth || 2}" />`;
      if (el.text) {
        elementsSvg += `<text x="${(el.x || 0) + (el.width || 100) / 2}" y="${(el.y || 0) + (el.height || 60) / 2 + 5}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="${el.color || '#000000'}">${el.text}</text>`;
      }
    } else if (el.type === 'circle') {
      const rx = (el.width || 80) / 2;
      const ry = (el.height || 80) / 2;
      const cx = (el.x || 0) + rx;
      const cy = (el.y || 0) + ry;
      elementsSvg += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${el.fillColor || '#ffffff'}" stroke="${el.color || '#000000'}" stroke-width="${el.strokeWidth || 2}" />`;
      if (el.text) {
        elementsSvg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="${el.color || '#000000'}">${el.text}</text>`;
      }
    } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
      const p1 = el.points[0];
      const p2 = el.points[el.points.length - 1];
      elementsSvg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${el.color || '#64748b'}" stroke-width="${el.strokeWidth || 2}" marker-end="url(#arrow)" />`;
    } else if (el.type === 'line' && el.points && el.points.length >= 2) {
      const p1 = el.points[0];
      const p2 = el.points[el.points.length - 1];
      elementsSvg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${el.color || '#000000'}" stroke-width="${el.strokeWidth || 2}" />`;
    } else if (el.type === 'path' && el.points && el.points.length > 0) {
      const d = el.points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
      elementsSvg += `<path d="${d}" fill="none" stroke="${el.color || '#000000'}" stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" />`;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b"/>
        </marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff" rx="8" />
      ${elementsSvg}
    </svg>
  `;
}

export async function exportToDocx(doc: DNoteDocument): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Convert settings
  const margins = {
    top: mmToTwips(doc.settings.margins.top || 20),
    right: mmToTwips(doc.settings.margins.right || 20),
    bottom: mmToTwips(doc.settings.margins.bottom || 20),
    left: mmToTwips(doc.settings.margins.left || 20),
  };

  const isLandscape = doc.settings.orientation === 'landscape';

  for (const block of doc.blocks) {
    if (block.type === 'heading') {
      const headingLevelMap: Record<number, any> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };

      children.push(
        new Paragraph({
          text: block.text,
          heading: headingLevelMap[block.level] || HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (block.type === 'paragraph') {
      const runs: DocxTextRun[] = block.runs.map((r) => {
        return new DocxTextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
          strike: r.strikethrough,
          color: r.color?.replace('#', ''),
          size: r.fontSize ? r.fontSize * 2 : 22, // Word sizes are in half-points
          font: r.fontFamily || 'Inter',
        });
      });

      let align = AlignmentType.LEFT;
      if (block.align === 'center') align = AlignmentType.CENTER;
      if (block.align === 'right') align = AlignmentType.RIGHT;
      if (block.align === 'justify') align = AlignmentType.JUSTIFIED;

      children.push(
        new Paragraph({
          children: runs,
          alignment: align,
          spacing: { after: 160, line: block.lineHeight ? Math.round(block.lineHeight * 240) : 276 },
        })
      );
    } else if (block.type === 'table') {
      const rows: TableRow[] = [];

      // Header Row
      const headerCells: TableCell[] = block.headers.map((h) => {
        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new DocxTextRun({
                  text: h,
                  bold: true,
                  color: block.style.headerTextColor?.replace('#', '') || 'FFFFFF',
                }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: {
            fill: block.style.headerBg?.replace('#', '') || '1E40AF',
          },
          margins: {
            top: 120,
            bottom: 120,
            left: 140,
            right: 140,
          },
        });
      });
      rows.push(new TableRow({ children: headerCells, tableHeader: true }));

      // Body Rows
      block.rows.forEach((row, rowIndex) => {
        const isZebra = block.style.zebra && rowIndex % 2 === 1;
        const rowCells: TableCell[] = row.map((cellText) => {
          return new TableCell({
            children: [
              new Paragraph({
                children: [new DocxTextRun({ text: cellText })],
              }),
            ],
            shading: isZebra
              ? { fill: 'F8FAFC' }
              : undefined,
            margins: {
              top: 100,
              bottom: 100,
              left: 140,
              right: 140,
            },
          });
        });
        rows.push(new TableRow({ children: rowCells }));
      });

      children.push(
        new Table({
          rows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        })
      );

      // Add spacing after table
      children.push(new Paragraph({ spacing: { after: 200 } }));
    } else if (block.type === 'callout') {
      const variantColors: Record<string, { border: string; bg: string }> = {
        info: { border: '2563EB', bg: 'EFF6FF' },
        tip: { border: '059669', bg: 'ECFDF5' },
        warning: { border: 'D97706', bg: 'FFFBEB' },
        note: { border: '6B7280', bg: 'F9FAFB' },
        quote: { border: '7C3AED', bg: 'F5F3FF' },
      };

      const color = variantColors[block.variant] || variantColors.info;

      const calloutTable = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  ...(block.title
                    ? [
                        new Paragraph({
                          children: [
                            new DocxTextRun({
                              text: `[${block.variant.toUpperCase()}] ${block.title}`,
                              bold: true,
                              color: color.border,
                            }),
                          ],
                          spacing: { after: 80 },
                        }),
                      ]
                    : []),
                  new Paragraph({
                    children: [
                      new DocxTextRun({
                        text: block.content,
                        italics: block.variant === 'quote',
                      }),
                    ],
                  }),
                ],
                shading: { fill: color.bg },
                borders: {
                  left: { style: BorderStyle.SINGLE, size: 24, color: color.border },
                  top: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                },
                margins: { top: 140, bottom: 140, left: 200, right: 140 },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      children.push(calloutTable);
      children.push(new Paragraph({ spacing: { after: 200 } }));
    } else if (block.type === 'math') {
      children.push(
        new Paragraph({
          children: [
            new DocxTextRun({
              text: `[Equation]  ${block.latex}`,
              italics: true,
              color: '1E293B',
            }),
          ],
          alignment: block.displayMode === 'block' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 140, after: 160 },
        })
      );
    } else if (block.type === 'whiteboard') {
      const svg = block.svgSnapshot || generateSvgFromElements(block);
      const pngBuffer = await svgToPngArrayBuffer(svg, block.width || 600, block.height || 240);

      if (pngBuffer) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: pngBuffer,
                transformation: {
                  width: Math.min(block.width || 550, 550),
                  height: Math.min(block.height || 220, 220),
                },
              } as any),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 160 },
          })
        );
      }
    } else if (block.type === 'pagebreak') {
      children.push(
        new Paragraph({
          children: [new DocxTextRun({ break: 1 })],
          pageBreakBefore: true,
        })
      );
    }
  }

  // Create Header and Footer
  const docxHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new DocxTextRun({
            text: doc.settings.header.text || doc.title,
            size: 18,
            color: '64748B',
          }),
        ],
        alignment:
          doc.settings.header.alignment === 'center'
            ? AlignmentType.CENTER
            : doc.settings.header.alignment === 'left'
            ? AlignmentType.LEFT
            : AlignmentType.RIGHT,
      }),
    ],
  });

  const docxFooter = new Footer({
    children: [
      new Paragraph({
        children: [
          new DocxTextRun({
            text: doc.settings.footer.text ? `${doc.settings.footer.text}  |  ` : '',
            size: 18,
            color: '64748B',
          }),
          ...(doc.settings.footer.showPageNumber
            ? [
                new DocxTextRun({
                  children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                  size: 18,
                  color: '64748B',
                }),
              ]
            : []),
        ],
        alignment:
          doc.settings.footer.alignment === 'center'
            ? AlignmentType.CENTER
            : doc.settings.footer.alignment === 'left'
            ? AlignmentType.LEFT
            : AlignmentType.RIGHT,
      }),
    ],
  });

  const docxDocument = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: margins,
            size: {
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
          },
        },
        headers: {
          default: docxHeader,
        },
        footers: {
          default: docxFooter,
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(docxDocument);
  const sanitizedTitle = (doc.title || 'D-Note_Document').replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `${sanitizedTitle}.docx`);
}
