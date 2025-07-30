export const awsConfig = () => ({
  bucketName: process.env.AWS_BUCKET_NAME,
  accessKey: process.env.AWS_ACCESS_KEY,
  secretKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
});
