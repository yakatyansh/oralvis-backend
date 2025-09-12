const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ANNOTATION_LEGEND = {
    rectangle: { label: 'Stains', color: '#EF4444' }, 
    square: { label: 'Malaligned', color: '#22C55E' }, 
    circle: { label: 'Attrition', color: '#3B82F6' }, 
};

const TREATMENT_RECOMMENDATIONS = {
    Stains: "Teeth cleaning and polishing is recommended to remove surface stains.",
    Malaligned: "Braces or Clear Aligners can be considered for teeth alignment.",
    Attrition: "A filling or a night guard may be necessary to prevent further wear.",
};

class PDFGenerator {
  static async generateReport(submission) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
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
      
      // --- PDF Content ---
      
      // Header Section
      doc.fontSize(16).font('Helvetica-Bold').text('Oral Health Screening Report', { align: 'left' });
      doc.fontSize(10).font('Helvetica').text(`Patient: ${submission.patientName}`, { align: 'left' });
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
      doc.moveDown(2);

      // Screening Report Title
      doc.fontSize(12).font('Helvetica-Bold').text('SCREENING REPORT:', { align: 'left' });
      doc.moveDown(1);

      // Image Grid
      const imageSectionY = doc.y;
      const imageWidth = 220;
      const imageSpacing = 20;
      const imageLabels = ['Upper Teeth', 'Front Teeth', 'Lower Teeth'];
      
      submission.annotatedImageUrls.slice(0, 3).forEach((url, index) => {
        const imagePath = path.join(__dirname, '..', url);
        const xPos = doc.page.margins.left + index * (imageWidth + imageSpacing);
        if (fs.existsSync(imagePath)) {
          doc.image(imagePath, xPos, imageSectionY, { width: imageWidth });
          doc.fillColor('#c0392b').font('Helvetica-Bold').fontSize(12).text(imageLabels[index], xPos, imageSectionY + 150, { width: imageWidth, align: 'center' });
        }
      });
      
      let bottomOfImages = imageSectionY + 180;
      doc.y = bottomOfImages;
      
      // Legend Section
      let legendX = doc.page.margins.left;
      const legendY = doc.y;
      const uniqueAnnotationTypes = [...new Set(submission.annotationData.flat().map((a) => a.type))];

      uniqueAnnotationTypes.forEach(type => {
        const legendItem = ANNOTATION_LEGEND[type];
        if (legendItem) {
          doc.rect(legendX, legendY, 12, 12).fill(legendItem.color);
          doc.fillColor('black').font('Helvetica').fontSize(10).text(legendItem.label, legendX + 20, legendY + 2);
          legendX += (legendItem.label.length * 5) + 60; // Adjust spacing based on text length
        }
      });

      doc.moveDown(4);
      
      // Treatment Recommendations
      doc.fontSize(12).font('Helvetica-Bold').text('TREATMENT RECOMMENDATIONS:', { align: 'left' });
      doc.moveDown(1);
      
      uniqueAnnotationTypes.forEach(type => {
        const legendItem = ANNOTATION_LEGEND[type];
        if (legendItem && TREATMENT_RECOMMENDATIONS[legendItem.label]) {
            doc.font('Helvetica-Bold').text(`- ${legendItem.label}:`, { continued: true });
            doc.font('Helvetica').text(` ${TREATMENT_RECOMMENDATIONS[legendItem.label]}`);
            doc.moveDown(0.5);
        }
      });

      doc.end();
    });
  }
}

module.exports = PDFGenerator;