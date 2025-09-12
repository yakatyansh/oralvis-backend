const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  static async generateReport(submission) {
    const doc = new PDFDocument({ margin: 50, layout: 'portrait', size: 'A4' });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    return new Promise(async (resolve, reject) => {
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `report-${submission.patientId}-${timestamp}.pdf`;
          const localPath = path.join('uploads', filename);
          fs.writeFileSync(localPath, pdfBuffer);
          const reportUrl = `/uploads/${filename}`;
          resolve({ reportUrl, filename });
        } catch (error) {
          reject(error);
        }
      });

      try {
        // --- PDF Content ---
        doc.fontSize(20).font('Helvetica-Bold').text('OralVis Healthcare', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('Dental Analysis Report', { align: 'center' });
        doc.moveDown(2);

        // --- Patient Info ---
        doc.fontSize(14).font('Helvetica-Bold').text('Patient Information');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Name: ${submission.patientName}`);
        doc.text(`Patient ID: ${submission.patientId}`);
        doc.text(`Upload Date: ${new Date(submission.createdAt).toLocaleDateString()}`);
        doc.moveDown(2);

        // --- Images ---
        doc.fontSize(14).font('Helvetica-Bold').text('Submitted Images');
        
        const imageWidth = 250; // Width for each image
        const startX = doc.page.margins.left;
        
        // Loop through original and annotated images
        submission.originalImageUrls.forEach((imageUrl, index) => {
          const annotatedUrl = submission.annotatedImageUrls[index];

          // Add a new page if there's not enough space
          if (doc.y > 600) {
            doc.addPage();
          }
          
          doc.fontSize(12).font('Helvetica-Bold').text(`Image ${index + 1}`, { underline: true });
          doc.moveDown();

          // Draw original image
          const originalImagePath = path.join(__dirname, '..', imageUrl);
          if (fs.existsSync(originalImagePath)) {
            doc.image(originalImagePath, startX, doc.y, { width: imageWidth });
          }

          // Draw annotated image side-by-side
          if (annotatedUrl) {
            const annotatedImagePath = path.join(__dirname, '..', annotatedUrl);
            if (fs.existsSync(annotatedImagePath)) {
              doc.image(annotatedImagePath, startX + imageWidth + 20, doc.y, { width: imageWidth });
            }
          }
          doc.moveDown(15); // Adjust spacing after images
        });
        
        doc.addPage(); // New page for notes

        // --- Notes ---
        if (submission.note) {
          doc.fontSize(14).font('Helvetica-Bold').text('Patient Notes');
          doc.fontSize(12).font('Helvetica').text(submission.note, { width: 500 });
          doc.moveDown(2);
        }

        if (submission.adminNotes) {
          doc.fontSize(14).font('Helvetica-Bold').text('Professional Analysis');
          doc.fontSize(12).font('Helvetica').text(submission.adminNotes, { width: 500 });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;