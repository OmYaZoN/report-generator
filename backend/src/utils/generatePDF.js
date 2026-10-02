const PDFDocument = require('pdfkit');

// Builds the PDF straight from the submission's own frozen questions,
// never from the live Template, and streams it to res instead of
// saving it anywhere: regenerated on every download, nothing to leak
// from disk or the database, and nothing eating into a free-tier quota.
function generateSubmissionPDF(submission, student, staff, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const filenameSafe = student.name.replace(/[^a-z0-9]+/gi, '_');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameSafe}_report.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text(submission.templateTitle || 'Student Report', { align: 'center' });
  doc.moveDown(1.2);

  doc.fontSize(11).font('Helvetica');
  doc.text(`Student: ${student.name}`);
  if (student.dateOfBirth) {
    doc.text(`Date of birth: ${new Date(student.dateOfBirth).toLocaleDateString()}`);
  }
  doc.text(`${submission.staffRole === 'teacher' ? 'Teacher' : 'Therapist'}: ${staff.name}`);
  doc.text(`Report date: ${new Date(submission.submittedAt || submission.createdAt).toLocaleDateString()}`);
  doc.moveDown();
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
  doc.moveDown();

  let currentCategory = null;
  submission.questions.forEach((q, i) => {
    if (doc.y > 700) doc.addPage();

    if (q.category && q.category !== currentCategory) {
      currentCategory = q.category;
      doc.moveDown(0.4);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#3D6B63').text(currentCategory.toUpperCase());
      doc.fillColor('black');
    }

    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. ${q.text}`);
    doc.font('Helvetica');

    const selected = q.options.filter((o) => o.selected).map((o) => o.text);
    if (selected.length) {
      selected.forEach((text) => doc.text(`    \u2713  ${text}`));
    } else {
      doc.fillColor('#999999').text('    (no option selected)').fillColor('black');
    }
  });

  if (submission.comments) {
    doc.moveDown();
    doc.fontSize(11).font('Helvetica-Bold').text('Additional comments');
    doc.font('Helvetica').text(submission.comments);
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#888888');
  doc.text(`Generated ${new Date().toLocaleString()}`);
  if (submission.reviewedAt) {
    doc.text(`Approved ${new Date(submission.reviewedAt).toLocaleDateString()}`);
  }

  doc.end();
}

module.exports = { generateSubmissionPDF };
