import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

const ensureEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing Cloudinary environment variable: ${key}`);
  }
  return value;
};

const configureCloudinary = () => {
  if (isConfigured) return;
  cloudinary.config({
    cloud_name: ensureEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: ensureEnv('CLOUDINARY_API_KEY'),
    api_secret: ensureEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });
  isConfigured = true;
};

export const getCloudinary = () => {
  configureCloudinary();
  return cloudinary;
};

export const uploadImage = async (file, options = {}) => {
  const client = getCloudinary();
  return client.uploader.upload(file, {
    folder: 'posts',
    ...options,
  });
};
