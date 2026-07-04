// Utilitários de identidade visual do SOS para os PDFs exportados.

export const SOS_LOGO_SRC = '/images/SOS_COLORIDO_PRETO.png';

// Cores da marca (extraídas da logo) usadas na barra de destaque do relatório.
const BRAND_BAR = [
  [124, 179, 66],  // verde
  [245, 166, 35],  // amarelo
  [232, 98, 42],   // laranja
  [26, 122, 140],  // azul-petróleo
  [26, 58, 74],    // azul-escuro
];

const NAVY = [26, 58, 74];
const SLATE = [100, 116, 139];

// Carrega uma imagem como data URL (necessário para o jsPDF embutir no documento).
export function loadImageDataURL(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Desenha o cabeçalho institucional. Retorna a coordenada Y (mm) onde o conteúdo pode começar.
export function drawReportHeader(pdf, { logo, title, subtitle, metaLines = [] }) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const logoHeight = 16;

  // Logo (mantém proporção)
  if (logo?.dataUrl) {
    const ratio = logo.width && logo.height ? logo.width / logo.height : 0.8;
    const logoWidth = logoHeight * ratio;
    pdf.addImage(logo.dataUrl, 'PNG', margin, 6, logoWidth, logoHeight);
  }

  const textX = margin + logoHeight * (logo?.width && logo?.height ? logo.width / logo.height : 0.8) + 6;

  // Título
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...NAVY);
  pdf.text(title || 'Relatório', textX, 13);

  // Subtítulo (unidade)
  if (subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...SLATE);
    pdf.text(subtitle, textX, 19);
  }

  // Metadados à direita (período, data de exportação)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...SLATE);
  metaLines.forEach((line, index) => {
    pdf.text(line, pageWidth - margin, 10 + index * 4.5, { align: 'right' });
  });

  // Barra de destaque com as cores da marca
  const barY = 24;
  const barHeight = 1.6;
  const usableWidth = pageWidth - margin * 2;
  const segWidth = usableWidth / BRAND_BAR.length;
  BRAND_BAR.forEach((rgb, index) => {
    pdf.setFillColor(...rgb);
    pdf.rect(margin + index * segWidth, barY, segWidth, barHeight, 'F');
  });

  return barY + barHeight + 4;
}

// Desenha o rodapé institucional em todas as páginas.
export function drawReportFooter(pdf, { pageNumber, pageCount } = {}) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const y = pageHeight - 8;

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y - 3, pageWidth - margin, y - 3);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...SLATE);
  pdf.text('SOS · Serviço de Obras Sociais — documento gerado pelo SIGU. Uso interno e confidencial.', margin, y);

  if (pageNumber) {
    const label = pageCount ? `Página ${pageNumber} de ${pageCount}` : `Página ${pageNumber}`;
    pdf.text(label, pageWidth - margin, y, { align: 'right' });
  }
}
