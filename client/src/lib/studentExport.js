// Exportação da ficha do assistido: planilha (XLSX) e ficha impressa (PDF).
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { drawReportHeader, drawReportFooter } from './pdfBranding';
import { getEnrollmentDate, getTenure } from '../pages/students/studentForm';

const DASH = '—';

function formatDate(iso) {
  if (!iso) return DASH;
  const [year, month, day] = String(iso).slice(0, 10).split('-');
  if (!year || !month || !day) return DASH;
  return `${day}/${month}/${year}`;
}

function yesNo(value) {
  return value ? 'Sim' : 'Não';
}

function text(value) {
  const s = String(value ?? '').trim();
  return s || DASH;
}

function list(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : DASH;
}

function turmaName(classGroups, slug) {
  if (!slug) return DASH;
  return classGroups.find((group) => group.slug === slug)?.name || slug;
}

function tenureLabel(student) {
  const enrollment = getEnrollmentDate(student);
  const tenure = enrollment && getTenure(enrollment.date);
  if (!tenure) return DASH;
  return enrollment.source === 'scfv' ? tenure.label : `${tenure.label} (aprox.)`;
}

/**
 * Campos do assistido em pares rótulo/valor, agrupados por seção.
 * Fonte única usada tanto pela planilha quanto pela ficha em PDF.
 */
export function buildStudentSections(student, classGroups = []) {
  return [
    {
      title: 'Identificação',
      fields: [
        ['Nome completo', text(student.full_name)],
        ['Data de nascimento', formatDate(student.birth_date)],
        ['NIS', text(student.nis_user)],
        ['CPF/CNS', text(student.cpf_cns)],
        ['Cor/Raça', text(student.color)],
        ['Código de matrícula', text(student.enrollment_code)],
        ['Unidade', text(student.programs?.name)],
        ['Turma', turmaName(classGroups, student.class_group)],
        ['Situação', student.is_active === false ? 'Inativo' : 'Ativo'],
        ['Tempo no programa', tenureLabel(student)],
      ],
    },
    {
      title: 'Saúde',
      fields: [
        ['Alérgico', yesNo(student.is_allergic)],
        ['Detalhes da alergia', text(student.allergy_details)],
        ['Problemas de saúde', yesNo(student.has_health_issues)],
        ['Detalhes de saúde', text(student.health_issues_details)],
        ['Possui deficiência', yesNo(student.has_disability)],
        ['Detalhes da deficiência', text(student.disability_details)],
        ['Nº do calçado', text(student.shoe_size)],
        ['Tamanho de roupa', text(student.clothing_size)],
      ],
    },
    {
      title: 'Escola e endereço',
      fields: [
        ['Escola', text(student.school_name)],
        ['Série/Ano', text(student.school_grade)],
        ['Turno escolar', text(student.school_shift)],
        ['Logradouro', text(student.address_street)],
        ['Bairro', text(student.address_neighborhood)],
        ['Ponto de referência', text(student.address_reference)],
        ['Complemento', text(student.address_extra)],
      ],
    },
    {
      title: 'Responsável',
      fields: [
        ['Nome', text(student.guardian_name)],
        ['CPF', text(student.guardian_cpf)],
        ['NIS', text(student.guardian_nis)],
        ['Telefone', text(student.guardian_phone)],
        ['Parentesco', text(student.guardian_relationship)],
        ['Local de trabalho', text(student.guardian_workplace)],
        ['Recebe benefício', yesNo(student.family_benefit)],
        ['Qual benefício', text(student.family_benefit_details)],
      ],
    },
    {
      title: 'CRAS e SCFV',
      fields: [
        ['Situação de prioridade', student.cras_status === 'prioritario' ? 'Prioritário' : student.cras_status === 'nao_prioritario' ? 'Não prioritário' : DASH],
        ['Motivo do vínculo', text(student.cras_link_reason)],
        ['Órgão encaminhador', text(student.cras_referral_agency)],
        ['Técnico do CRAS', text(student.cras_technician)],
        ['Inserção no SCFV', formatDate(student.scfv_insertion_date)],
        ['Atualização', formatDate(student.scfv_update_date)],
        ['Dias de frequência', list(student.scfv_frequency_days)],
        ['Turno no SCFV', list(student.scfv_shift)],
        ['Grupo SCFV', text(student.scfv_group)],
        ['Orientador(a)', text(student.scfv_instructor)],
        ['Embarque', text(student.scfv_boarding)],
        ['Desembarque', text(student.scfv_disembarkation)],
      ],
    },
    {
      title: 'Registro no SISC',
      fields: [
        ['Data de vinculação', formatDate(student.sisc_link_date)],
        ['Grupo no SISC', turmaName(classGroups, student.sisc_group)],
      ],
    },
  ];
}

/** Nome do assistido em formato seguro para nome de arquivo. */
export function studentFileSlug(student) {
  const slug = String(student?.full_name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return slug || 'assistido';
}

/** Colunas achatadas para a planilha (uma linha por assistido). */
function flatHeaders(sections) {
  return sections.flatMap((section) => section.fields.map(([label]) => `${section.title} · ${label}`));
}

function flatValues(sections) {
  return sections.flatMap((section) => section.fields.map(([, value]) => value));
}

function membersText(student) {
  const members = Array.isArray(student.family_members) ? student.family_members : [];
  if (members.length === 0) return DASH;
  return members
    .map((m) => [m?.name, m?.relationship, m?.age].filter(Boolean).join(' / '))
    .filter(Boolean)
    .join(' | ');
}

function pickupsText(student) {
  const people = Array.isArray(student.authorized_pickups) ? student.authorized_pickups : [];
  if (people.length === 0) return DASH;
  return people
    .map((p) => [p?.name, p?.relationship, p?.document, p?.phone].filter(Boolean).join(' / '))
    .filter(Boolean)
    .join(' | ');
}

const EXTRA_COLUMNS = [
  ['Composição familiar', membersText],
  ['Pessoas autorizadas a retirar', pickupsText],
  ['Observações do orientador', (s) => text(s.advisor_notes)],
];

/** Planilha com uma linha por assistido; serve para 1 ou N registros. */
export function exportStudentsWorkbook(students, classGroups = [], filename = 'assistidos.xlsx') {
  const lista = Array.isArray(students) ? students : [students];
  if (lista.length === 0) return;

  const headers = [
    ...flatHeaders(buildStudentSections(lista[0], classGroups)),
    ...EXTRA_COLUMNS.map(([label]) => label),
  ];

  const rows = lista.map((student) => [
    ...flatValues(buildStudentSections(student, classGroups)),
    ...EXTRA_COLUMNS.map(([, getter]) => getter(student)),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = headers.map((header, index) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), header.length);
    return { wch: Math.min(longest + 3, 60) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assistidos');
  XLSX.writeFile(workbook, filename);
}

// ---------- Ficha em PDF ----------

const MARGIN = 12;
const LINE = 5;

function ensureSpace(pdf, cursor, needed, headerOpts) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (cursor.y + needed <= pageHeight - 16) return;
  pdf.addPage();
  cursor.y = drawReportHeader(pdf, headerOpts) + 2;
}

function drawSectionTitle(pdf, cursor, title, headerOpts) {
  ensureSpace(pdf, cursor, 12, headerOpts);
  const pageWidth = pdf.internal.pageSize.getWidth();
  cursor.y += 3;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(MARGIN, cursor.y - 3.5, pageWidth - MARGIN * 2, 6.5, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(26, 58, 74);
  pdf.text(title.toUpperCase(), MARGIN + 2, cursor.y + 1);
  cursor.y += 8;
}

function drawFields(pdf, cursor, fields, headerOpts) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const colWidth = (pageWidth - MARGIN * 2) / 2;
  const valueWidth = colWidth - 32;

  fields.forEach(([label, value], index) => {
    const column = index % 2;
    if (column === 0) ensureSpace(pdf, cursor, 10, headerOpts);

    const x = MARGIN + column * colWidth;
    const lines = pdf.splitTextToSize(String(value), valueWidth);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(String(label).toUpperCase(), x, cursor.y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(lines, x, cursor.y + 4);

    // Só avança a linha ao fechar o par de colunas (ou no último campo).
    if (column === 1 || index === fields.length - 1) {
      cursor.y += 4 + Math.max(1, lines.length) * LINE - 1;
    }
  });
  cursor.y += 2;
}

function drawTable(pdf, cursor, title, columns, rows, headerOpts) {
  drawSectionTitle(pdf, cursor, title, headerOpts);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const usable = pageWidth - MARGIN * 2;
  const colWidth = usable / columns.length;

  if (rows.length === 0) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Nenhum registro.', MARGIN, cursor.y);
    cursor.y += 6;
    return;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  columns.forEach((col, i) => pdf.text(col.toUpperCase(), MARGIN + i * colWidth, cursor.y));
  cursor.y += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  rows.forEach((row) => {
    ensureSpace(pdf, cursor, 8, headerOpts);
    row.forEach((cell, i) => {
      const lines = pdf.splitTextToSize(String(cell || DASH), colWidth - 3);
      pdf.text(lines.slice(0, 2), MARGIN + i * colWidth, cursor.y);
    });
    cursor.y += LINE;
  });
  cursor.y += 2;
}

/** Ficha individual em PDF, com a identidade visual dos demais relatórios. */
export function exportStudentPdf(student, classGroups = [], logo = null) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const headerOpts = {
    logo,
    title: 'Ficha do Assistido',
    subtitle: student.full_name || '',
    metaLines: [
      student.programs?.name ? `Unidade: ${student.programs.name}` : '',
      `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
    ].filter(Boolean),
  };

  const cursor = { y: drawReportHeader(pdf, headerOpts) + 2 };

  buildStudentSections(student, classGroups).forEach((section) => {
    drawSectionTitle(pdf, cursor, section.title, headerOpts);
    drawFields(pdf, cursor, section.fields, headerOpts);
  });

  const members = Array.isArray(student.family_members) ? student.family_members : [];
  drawTable(
    pdf,
    cursor,
    'Composição familiar',
    ['Nome', 'Vínculo', 'Idade', 'Escolaridade'],
    members.map((m) => [m?.name, m?.relationship, m?.age, m?.education]),
    headerOpts
  );

  const pickups = Array.isArray(student.authorized_pickups) ? student.authorized_pickups : [];
  drawTable(
    pdf,
    cursor,
    'Pessoas autorizadas a retirar',
    ['Nome', 'Documento', 'Telefone', 'Vínculo'],
    pickups.map((p) => [p?.name, p?.document, p?.phone, p?.relationship]),
    headerOpts
  );

  if (String(student.advisor_notes || '').trim()) {
    drawSectionTitle(pdf, cursor, 'Observações do orientador', headerOpts);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    const lines = pdf.splitTextToSize(student.advisor_notes, pdf.internal.pageSize.getWidth() - MARGIN * 2);
    lines.forEach((line) => {
      ensureSpace(pdf, cursor, 6, headerOpts);
      pdf.text(line, MARGIN, cursor.y);
      cursor.y += LINE;
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    pdf.setPage(i);
    drawReportFooter(pdf, { pageNumber: i, pageCount });
  }

  pdf.save(`ficha_${studentFileSlug(student)}.pdf`);
}
