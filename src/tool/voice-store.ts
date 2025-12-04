import OSS from 'ali-oss';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/service/config.service';
import { ReadStream } from 'fs';

@Injectable()
export class VoiceStore {
  private readonly client: OSS;
  private readonly logger = new Logger(VoiceStore.name);

  constructor(private readonly configService: ConfigService) {
    if (this.configService.aliAk && this.configService.aliSk) {
      // 初始化OSS
      this.client = new OSS({
        region: 'oss-cn-shanghai',
        accessKeyId: this.configService.aliAk,
        accessKeySecret: this.configService.aliSk,
        bucket: 'hearai',
      });
    }
  }

  async upload(fileName: string, file: Buffer) {
    try {
      await this.client.put(fileName, file);
    } catch (e) {
      console.error(e);
      throw new Error('上传失败');
    }
  }

  async exist(fileName: string) {
    try {
      await this.client.head(fileName);
      return true;
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e.code === 'NoSuchKey') {
        return false;
      }
      console.error(e);
      throw new Error('检查文件是否存在异常');
    }
  }

  async getStream(fileName: string) {
    const result = await this.client.getStream(fileName);
    const stream = result.stream as ReadStream;
    if (stream == null) {
      return null;
    }
    return stream;
  }

  async getBuffer(fileName: string) {
    try {
      const result = await this.client.get(fileName);
      const buffer = result.content as Buffer;
      if (buffer == null) {
        return null;
      }
      return buffer;
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  getFileName(
    id: number | string,
    speaker: string,
    catalog: 'words' | 'word',
    isSlow: boolean,
  ) {
    return `/speaker/${speaker}/${catalog}/${id}/${isSlow ? 'voice_slow' : 'voice'}`;
  }

  getFileIndexName(speaker: string, catalog: 'words' | 'word') {
    return `/speaker/${speaker}/${catalog}/index`;
  }
}
