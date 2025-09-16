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
            reject(error);
          }
        });

        // --- PDF Content ---
        doc.fontSize(18).font('Helvetica-Bold').text('Oral Health Screening Report', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(11).font('Helvetica-Bold').text('Patient Name:', { continued: true }).font('Helvetica').text(` ${submission.patientName}`);
        doc.font('Helvetica-Bold').text('Patient ID:', { continued: true }).font('Helvetica').text(` ${submission.patientId}`);
        doc.font('Helvetica-Bold').text('Report Date:', { continued: true }).font('Helvetica').text(` ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(2);

        doc.fontSize(14).font('Helvetica-Bold').text('SCREENING IMAGES', { align: 'left' });
        doc.moveDown(1);
        
        const imageWidth = 165;
        const imageSpacing = 15;
        const imageLabels = ['Upper Teeth', 'Front Teeth', 'Lower Teeth'];
        const imageSectionY = doc.y;

        submission.originalImageUrls.slice(0, 3).forEach((url, index) => {
            const imagePath = path.join(__dirname, '..', url.substring(1));
            const xPos = doc.page.margins.left + index * (imageWidth + imageSpacing);

            if (fs.existsSync(imagePath)) {
                const image = doc.openImage(imagePath);
                const imageRatio = image.width / image.height;
                const imageHeight = imageWidth / imageRatio;

                doc.image(image, xPos, imageSectionY, { width: imageWidth });

                // *** FIX: Draw annotations directly on the PDF ***
                const annotations = submission.annotationData[index] || [];
                annotations.forEach(anno => {
                    const scaleFactor = imageWidth / image.width;
                    doc.save();
                    doc.lineWidth(anno.strokeWidth || 2).strokeColor(anno.stroke || '#000000');
                    if (anno.type === 'rectangle' || anno.type === 'square') {
                        doc.rect(
                            xPos + (anno.x * scaleFactor),
                            imageSectionY + (anno.y * scaleFactor),
                            anno.width * scaleFactor,
                            anno.height * scaleFactor
                        ).stroke();
                    } else if (anno.type === 'circle') {
                        doc.circle(
                            xPos + (anno.x * scaleFactor) + (anno.radius * scaleFactor),
                            imageSectionY + (anno.y * scaleFactor) + (anno.radius * scaleFactor),
                            anno.radius * scaleFactor
                        ).stroke();
                    }
                    doc.restore();
                });
                
                doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(imageLabels[index], xPos, imageSectionY + imageHeight + 5, { width: imageWidth, align: 'center' });
            }
        });
        
        doc.y = imageSectionY + 145;


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

        doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(2);
        
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