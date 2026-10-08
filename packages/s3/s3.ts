import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const TIME_IN_SECONDS = {
  SECOND: 1,
  MINUTE: 60,
  FIVE_MINUTES: 60 * 5,
  FIFTEEN_MINUTES: 60 * 15,
  HALF_HOUR: 60 * 30,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,
  WEEK: 60 * 60 * 24 * 7,
} as const;

const createS3 = (isPublic = false) => {
  const endpoint = isPublic ? process.env.S3_PUBLIC_URL : process.env.S3_URL;
  return new S3Client({
    endpoint,
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.GARAGE_DEFAULT_ACCESS_KEY!,
      secretAccessKey: process.env.GARAGE_DEFAULT_SECRET_KEY!,
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
};

const bucketName = process.env.GARAGE_DEFAULT_BUCKET!;

const createGetCommand = (key: string): GetObjectCommand => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return command;
};

const createPreSignedUrl = (
  client: S3Client,
  command: GetObjectCommand,
  expires: number,
): Promise<string> => {
  return getSignedUrl(client, command, {
    expiresIn: expires,
  });
};

export {
  bucketName,
  createGetCommand,
  createPreSignedUrl,
  createS3,
  PutObjectCommand,
  type S3Client,
  TIME_IN_SECONDS,
};
