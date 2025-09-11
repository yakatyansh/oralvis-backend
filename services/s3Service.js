const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

class S3Service {
  static async uploadFile(buffer, key, contentType) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    };

    try {
      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  static async deleteFile(key) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };

    try {
      await s3.deleteObject(params).promise();
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  static getSignedUrl(key, expires = 3600) {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: expires
    };

    return s3.getSignedUrl('getObject', params);
  }
}

module.exports = S3Service;