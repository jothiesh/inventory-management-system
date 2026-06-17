/**
 * Generates blank QC Inspection Checklist Word templates
 * for all 4 material categories, mirroring the Rev:2 form structure.
 *
 * Output: /home/claude/qc-module/templates/QC_Checklist_<CATEGORY>.docx
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType,
  HeightRule, VerticalAlign, PageOrientation
} = require("docx");

// ---------------------------------------------------------------------
// Form definitions — one per category
// ---------------------------------------------------------------------
const FORM_NO  = "TTPL/QC/F/IH Rev:2 dated 10/07/24";
const COMPANY  = "THINTURE TECHNOLOGIES PVT LTD";
const BANGALORE = "Bangalore";

const TEMPLATES = [
  {
    code: "STICKER",
    title: "LABEL / STICKER INSPECTION CHECK LIST",
    stages: [
      { sl:1, op:"",                  check:"VI for Contents Printed as per Product Std",      aql:"20-50" },
      { sl:2, op:"Visual Inspection", check:"VI for any damage / Scratches",                    aql:"20-50" },
      { sl:3, op:"",                  check:"Adhesive / Gumming Quality",                       aql:"20-50" },
      { sl:4, op:"Test method",       check:"Fix the label to Enclosure and check after 2 days",aql:"20-50" },
    ]
  },
  {
    code: "IC",
    title: "INTEGRATED CIRCUIT (IC) INSPECTION CHECK LIST",
    stages: [
      { sl:1, op:"Visual Inspection", check:"Part number, marking & date code as per PO",       aql:"20-50" },
      { sl:2, op:"Visual Inspection", check:"Lead / pin condition, no bent or oxidation",       aql:"20-50" },
      { sl:3, op:"Visual Inspection", check:"MSL packaging & desiccant intact",                 aql:"20-50" },
      { sl:4, op:"Test method",       check:"Sample electrical test on bench fixture",          aql:"5-10"  },
    ]
  },
  {
    code: "PCB",
    title: "PRINTED CIRCUIT BOARD (PCB) INSPECTION CHECK LIST",
    stages: [
      { sl:1, op:"Visual Inspection", check:"Silkscreen, board revision & ordering code",       aql:"20-50" },
      { sl:2, op:"Visual Inspection", check:"Solder mask, no scratches or exposed copper",      aql:"20-50" },
      { sl:3, op:"Visual Inspection", check:"Drill / cutout dimensions per Gerber",             aql:"10-20" },
      { sl:4, op:"Test method",       check:"Continuity test on critical nets",                  aql:"5-10"  },
    ]
  },
  {
    code: "ENCLOSURE",
    title: "ENCLOSURE / MECHANICAL PARTS INSPECTION CHECK LIST",
    stages: [
      { sl:1, op:"Visual Inspection", check:"Color, finish & branding as per spec",             aql:"20-50" },
      { sl:2, op:"Visual Inspection", check:"No cracks, burrs, or warping",                     aql:"20-50" },
      { sl:3, op:"Test method",       check:"Snap-fit & screw boss assembly check",             aql:"10-20" },
      { sl:4, op:"Test method",       check:"IP rating sample test (if applicable)",             aql:"5-10"  },
    ]
  },
];

// ---------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------
const BORDER = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const ALL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADER_SHADE = { fill: "DCE6F1", type: ShadingType.CLEAR, color: "auto" };
const TOTAL_WIDTH = 9360;   // US Letter content width @ 1" margins
const CELL_MARGINS = { top: 80, bottom: 80, left: 100, right: 100 };

const text = (s, opts = {}) => new TextRun({ text: s, font: "Arial", size: 20, ...opts });
const para = (s, opts = {}) => new Paragraph({
  children: [text(s, opts)],
  alignment: opts.alignment || AlignmentType.LEFT,
  spacing: { before: 0, after: 40 }
});
const cell = (paragraphs, opts = {}) => new TableCell({
  borders: ALL_BORDERS,
  width: opts.width,
  shading: opts.shading,
  verticalAlign: opts.verticalAlign || VerticalAlign.CENTER,
  margins: CELL_MARGINS,
  children: Array.isArray(paragraphs) ? paragraphs : [paragraphs]
});

// ---------------------------------------------------------------------
// Build sections
// ---------------------------------------------------------------------
function buildHeaderBlock() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: COMPANY, font: "Arial", size: 28, bold: true })],
      spacing: { after: 60 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: BANGALORE, font: "Arial", size: 20 })],
      spacing: { after: 200 }
    }),
  ];
}

function buildFormMetaTable(tpl) {
  const w1 = 1500, w2 = 3180, w3 = 1500, w4 = 3180; // sums to 9360
  return new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    columnWidths: [w1, w2, w3, w4],
    rows: [
      new TableRow({
        children: [
          cell(para("Form No.", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para(FORM_NO),                     { width: { size: w2, type: WidthType.DXA } }),
          cell(para("Date",      { bold: true }), { width: { size: w3, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("____ / ____ / ________"),    { width: { size: w4, type: WidthType.DXA } }),
        ]
      }),
      new TableRow({
        children: [
          cell(para("Invoice No.", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("__________________________"), { width: { size: w2, type: WidthType.DXA } }),
          cell(para("Lot Qty",     { bold: true }), { width: { size: w3, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("__________________________"), { width: { size: w4, type: WidthType.DXA } }),
        ]
      }),
      new TableRow({
        children: [
          cell(para("Supplier", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("__________________________"), { width: { size: w2, type: WidthType.DXA } }),
          cell(para("Received", { bold: true }), { width: { size: w3, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("____ / ____ / ________"),   { width: { size: w4, type: WidthType.DXA } }),
        ]
      }),
      new TableRow({
        children: [
          cell(para("Material", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para(tpl.code + " — fill description below"),
                                                  { width: { size: w2, type: WidthType.DXA } }),
          cell(para("Sample Sz", { bold: true }), { width: { size: w3, type: WidthType.DXA }, shading: HEADER_SHADE }),
          cell(para("__________________________"), { width: { size: w4, type: WidthType.DXA } }),
        ]
      }),
    ]
  });
}

function buildChecklistTable(tpl) {
  const wSl = 700, wOp = 1700, wCp = 3800, wAql = 900, wRes = 1260, wRem = 1000; // = 9360
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell(para("Sl. No",       { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wSl,  type: WidthType.DXA }, shading: HEADER_SHADE }),
      cell(para("Stage / Op",   { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wOp,  type: WidthType.DXA }, shading: HEADER_SHADE }),
      cell(para("Check Point",  { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wCp,  type: WidthType.DXA }, shading: HEADER_SHADE }),
      cell(para("AQL",          { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wAql, type: WidthType.DXA }, shading: HEADER_SHADE }),
      cell(para("Result",       { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wRes, type: WidthType.DXA }, shading: HEADER_SHADE }),
      cell(para("Remarks",      { bold: true, alignment: AlignmentType.CENTER }), { width: { size: wRem, type: WidthType.DXA }, shading: HEADER_SHADE }),
    ]
  });

  const dataRows = tpl.stages.map(s => new TableRow({
    height: { value: 700, rule: HeightRule.ATLEAST },
    children: [
      cell(para(String(s.sl),  { alignment: AlignmentType.CENTER }), { width: { size: wSl,  type: WidthType.DXA } }),
      cell(para(s.op),                                                 { width: { size: wOp,  type: WidthType.DXA } }),
      cell(para(s.check),                                              { width: { size: wCp,  type: WidthType.DXA } }),
      cell(para(s.aql,         { alignment: AlignmentType.CENTER }), { width: { size: wAql, type: WidthType.DXA } }),
      cell(para("☐ Pass  ☐ Fail  ☐ N/A"),                            { width: { size: wRes, type: WidthType.DXA } }),
      cell(para(""),                                                   { width: { size: wRem, type: WidthType.DXA } }),
    ]
  }));

  return new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    columnWidths: [wSl, wOp, wCp, wAql, wRes, wRem],
    rows: [header, ...dataRows]
  });
}

function buildDecisionBlock() {
  const w1 = 2500, w2 = 6860;
  return [
    new Paragraph({ children: [text("")], spacing: { before: 200, after: 120 } }),
    new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w1, w2],
      rows: [
        new TableRow({
          children: [
            cell(para("Lot Decision", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
            cell(para("☐ Accepted     ☐ Rejected     ☐ Hold"), { width: { size: w2, type: WidthType.DXA } }),
          ]
        }),
        new TableRow({
          children: [
            cell(para("Remarks", { bold: true }), { width: { size: w1, type: WidthType.DXA }, shading: HEADER_SHADE }),
            cell([para(""), para(""), para("")], { width: { size: w2, type: WidthType.DXA } }),
          ]
        }),
      ]
    }),
  ];
}

function buildSignatureBlock() {
  const w = 4680;
  return [
    new Paragraph({ children: [text("")], spacing: { before: 240, after: 120 } }),
    new Table({
      width: { size: TOTAL_WIDTH, type: WidthType.DXA },
      columnWidths: [w, w],
      rows: [
        new TableRow({
          height: { value: 1100, rule: HeightRule.ATLEAST },
          children: [
            cell([
              para("Inspected By", { bold: true }),
              para(""),
              para("Name: ____________________"),
              para("Signature: ________________"),
              para("Date: _____________________"),
            ], { width: { size: w, type: WidthType.DXA } }),
            cell([
              para("Approved By (QC Head)", { bold: true }),
              para(""),
              para("Name: ____________________"),
              para("Signature: ________________"),
              para("Date: _____________________"),
            ], { width: { size: w, type: WidthType.DXA } }),
          ]
        })
      ]
    }),
  ];
}

// ---------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------
function buildDocument(tpl) {
  return new Document({
    creator: "Thinture Technologies",
    title: tpl.title,
    description: "QC Inspection Checklist — " + tpl.code,
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Form No: " + FORM_NO, font: "Arial", size: 16, italics: true })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Confidential — Thinture Technologies Pvt Ltd", font: "Arial", size: 16, italics: true })]
          })]
        })
      },
      children: [
        ...buildHeaderBlock(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: tpl.title, font: "Arial", size: 26, bold: true })],
          spacing: { after: 160 }
        }),
        buildFormMetaTable(tpl),
        new Paragraph({ children: [text("")], spacing: { before: 200, after: 100 } }),
        buildChecklistTable(tpl),
        ...buildDecisionBlock(),
        ...buildSignatureBlock(),
      ]
    }]
  });
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
const outDir = path.join(__dirname, "../templates");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const tpl of TEMPLATES) {
    const doc = buildDocument(tpl);
    const buffer = await Packer.toBuffer(doc);
    const outPath = path.join(outDir, `QC_Checklist_${tpl.code}.docx`);
    fs.writeFileSync(outPath, buffer);
    console.log("Generated:", outPath);
  }
  console.log("Done.");
})();
