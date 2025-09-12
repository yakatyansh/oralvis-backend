const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Define the mapping from annotation shapes to dental conditions and colors
const ANNOTATION_LEGEND = {
    rectangle: { label: 'Stains', color: '#EF4444' }, // Red
    square: { label: 'Malaligned', color: '#22C55E' }, // Green
    circle: { label: 'Attrition', color: '#3B82F6' }, // Blue
};

// Define the corresponding treatment recommendations
const TREATMENT_RECOMMENDATIONS = {
    Stains: "Teeth cleaning and polishing is recommended to remove surface stains.",
    Malaligned: "Braces or Clear Aligners can be considered for teeth alignment.",
    Attrition: "A filling or a night guard may be necessary to prevent further wear.",
};

class PDFGenerator {
  static async generateReport(submission) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
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
            console.error("Error writing PDF file:", error);
            reject(error);
          }
        });

        // --- PDF Content ---
        doc.fontSize(18).font('Helvetica-Bold').text('Oral Health Screening Report', { align: 'center' });
        doc.moveDown(2);

        // Patient Details
        doc.fontSize(11).font('Helvetica-Bold').text('Patient Name:', { continued: true }).font('Helvetica').text(` ${submission.patientName}`);
        doc.font('Helvetica-Bold').text('Patient ID:', { continued: true }).font('Helvetica').text(` ${submission.patientId}`);
        doc.font('Helvetica-Bold').text('Report Date:', { continued: true }).font('Helvetica').text(` ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        // Divider
        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(2);

        // Image Grid
        doc.fontSize(14).font('Helvetica-Bold').text('SCREENING IMAGES', { align: 'left' });
        doc.moveDown(1);
        
        const imageWidth = 165;
        const imageSpacing = 15;
        const imageLabels = ['Upper Teeth', 'Front Teeth', 'Lower Teeth'];
        const imageSectionY = doc.y;

        submission.annotatedImageUrls.slice(0, 3).forEach((url, index) => {
            const imagePath = path.join(__dirname, '..', url);
            const xPos = doc.page.margins.left + index * (imageWidth + imageSpacing);
            if (fs.existsSync(imagePath)) {
                doc.image(imagePath, xPos, imageSectionY, { width: imageWidth });
                doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(imageLabels[index], xPos, imageSectionY + 115, { width: imageWidth, align: 'center' });
            }
        });
        
        doc.y = imageSectionY + 145;

        // Legend
        const uniqueAnnotationTypes = [...new Set((submission.annotationData || []).flat().map((a) => a.type))];
        if (uniqueAnnotationTypes.length > 0) {
            let legendX = doc.page.margins.left;
            doc.fontSize(11).font('Helvetica-Bold').text('Legend:', { align: 'left' });
            doc.moveDown(0.5);

            uniqueAnnotationTypes.forEach(type => {
                const legendItem = ANNOTATION_LEGEND[type];
                if (legendItem) {
                    doc.rect(legendX, doc.y, 10, 10).fill(legendItem.color);
                    doc.fillColor('black').font('Helvetica').fontSize(10).text(legendItem.label, legendX + 15, doc.y, { continued: true });
                    legendX += (legendItem.label.length * 5) + 40;
                }
            });
        }
        doc.moveDown(2);

        // Divider
        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(2);
        
        // Treatment Recommendations
        doc.fontSize(14).font('Helvetica-Bold').text('TREATMENT RECOMMENDATIONS', { align: 'left' });
        doc.moveDown(1);
        
        if (uniqueAnnotationTypes.length > 0) {
            uniqueAnnotationTypes.forEach(type => {
                const legendItem = ANNOTATION_LEGEND[type];
                if (legendItem && TREATMENT_RECOMMENDATIONS[legendItem.label]) {
                    doc.font('Helvetica-Bold').fontSize(11).text(`- ${legendItem.label}:`, { width: 515 });
                    doc.font('Helvetica').fontSize(10).text(TREATMENT_RECOMMENDATIONS[legendItem.label], { indent: 15, width: 500 });
                    doc.moveDown(0.5);
                }
            });
        } else {
            doc.font('Helvetica').fontSize(10).text("No specific conditions noted that require immediate treatment recommendations.", { width: 500 });
        }

        doc.end();
      } catch (error) {
        console.error("Error creating PDF document:", error);
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;