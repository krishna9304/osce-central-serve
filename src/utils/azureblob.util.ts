import {
  BlobSASPermissions,
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
} from '@azure/storage-blob';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

@Injectable()
export class AzureBlobUtil {
  private readonly maxFileSizeInKb = 200;
  private readonly allowedImageFormats = ['png', 'jpeg', 'jpg'];

  constructor(private readonly configService: ConfigService) {}

  getBlockBlobClient(filename: string): BlockBlobClient {
    const connectionString = this.configService.get<string>(
      'AZURE_BLOB_CONNECTION_STRING',
    );
    const containerName = this.configService.get<string>(
      'AZURE_BLOB_CONTAINER_NAME',
    );
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient: ContainerClient =
      blobServiceClient.getContainerClient(containerName);
    return containerClient.getBlockBlobClient(filename);
  }

  async uploadImage(file: Express.Multer.File) {
    try {
      const blobName = `${Date.now()}-${file.originalname}`;
      const blockBlobClient = this.getBlockBlobClient(blobName);

      const info = await sharp(file.buffer).metadata();

      if (this.allowedImageFormats.includes(info.format)) {
        const originalSizeKb = info.size / 1024;

        const ratio = Math.sqrt(this.maxFileSizeInKb / originalSizeKb);
        const targetWidth = Math.round(info.width * ratio);
        const targetHeight = Math.round(info.height * ratio);

        const optimisedImg = await sharp(file.buffer)
          .resize(targetWidth, targetHeight)
          .png({ quality: 50 })
          .toBuffer();

        await blockBlobClient.uploadData(optimisedImg);
        return blobName;
      } else
        throw new Error(
          'Invalid file format. Only .jpg .jpeg .png formats are allowed.',
        );
    } catch (error) {
      throw new Error(error);
    }
  }

  async uploadTxtFile(file: Express.Multer.File) {
    try {
      const blobName = `${Date.now()}-${file.originalname}`;
      const blockBlobClient = this.getBlockBlobClient(blobName);

      if (!file.originalname.endsWith('.txt'))
        throw new Error(
          'Invalid file format for example conversations. Only .txt files are allowed.',
        );

      await blockBlobClient.uploadData(file.buffer);
      return blobName;
    } catch (error) {
      throw new Error(error);
    }
  }

  async uploadUsingBuffer(
    buffer: Buffer,
    filename: string,
    useTimeStamp = true,
  ) {
    try {
      let blobName = filename;
      if (useTimeStamp) filename = `${Date.now()}-${filename}`;
      const blockBlobClient = this.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(buffer);
      return blobName;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getTemporaryPublicUrl(filename: string): Promise<string | boolean> {
    try {
      const blockBlobClient = this.getBlockBlobClient(filename);
      const blobExists = await blockBlobClient.exists();
      if (!blobExists) throw new Error('File not found.');

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + 86400), // 24 hours from now,
      });
      return sasUrl;
    } catch (error) {
      return false;
    }
  }
}
