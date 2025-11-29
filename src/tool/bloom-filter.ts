import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { BloomFilter } from 'bloom-filters';
import { BloomFilterShard } from 'src/model/bloom-filter-shard.model';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from 'src/service/config.service';

interface Shard {
  filter: BloomFilter;
  buffer: Set<string>;
}

@Injectable()
export class BloomFilterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BloomFilterService.name);

  private shards: Map<number, Shard> = new Map();
  private readonly SHARD_COUNT = 100; // 可根据用户量调整
  private readonly SAVE_INTERVAL: number; // 落盘一次(ms)
  private saveTimer: NodeJS.Timeout;

  constructor(
    @InjectRepository(BloomFilterShard)
    private bloomFilterShardRepository: Repository<BloomFilterShard>,
    private readonly configService: ConfigService,
  ) {
    this.SAVE_INTERVAL = this.configService.bloomFilterSaveInterval;
  }

  async onModuleInit() {
    const bloomFilterShards = await this.bloomFilterShardRepository.find();

    // 初始化每个 shard
    for (let i = 0; i < this.SHARD_COUNT; i++) {
      const bloomFilterShard = bloomFilterShards.find(
        (bloomFilterShard) => bloomFilterShard.shardId === i,
      );
      let filter: BloomFilter;

      if (bloomFilterShard) {
        try {
          filter = BloomFilter.fromJSON(
            JSON.parse(bloomFilterShard.data) as JSON,
          ) as BloomFilter;
        } catch (err) {
          this.logger.error(`Shard ${i} BloomFilter JSON 解析失败`, err);
          filter = this.createNewFilter();
        }
      } else {
        filter = this.createNewFilter();
      }

      this.shards.set(i, { filter, buffer: new Set() });
    }

    this.saveTimer = setInterval(() => this.flushToDB(), this.SAVE_INTERVAL);
  }

  private createNewFilter(): BloomFilter {
    // 每个 shard 预设容量 100 万条记录，误判率 0.01
    return BloomFilter.create(1_000_000, 0.01);
  }

  private getShard(userId: string): Shard {
    const shardIndex = this.hashUserId(userId);
    const shard = this.shards.get(shardIndex);
    if (shard == null) {
      throw new Error(
        `无法获取BloomFilterShard userId=${userId} shardIndex=${shardIndex}`,
      );
    }
    return shard;
  }

  private hashUserId(userId: string): number {
    // 简单 hash
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % this.SHARD_COUNT;
  }

  markRead(userId: string, wordsId: string): boolean {
    const shard = this.getShard(userId);
    const key = `${userId}:${wordsId}`;
    if (!shard.filter.has(key)) {
      shard.filter.add(key);
      shard.buffer.add(key);
      return true;
    }
    return false;
  }

  hasRead(userId: string, wordsId: string): boolean {
    const shard = this.getShard(userId);
    return shard.filter.has(`${userId}:${wordsId}`);
  }

  private flushToDB() {
    for (const [shardId, shard] of this.shards.entries()) {
      if (shard.buffer.size === 0) continue;

      this.bloomFilterShardRepository
        .upsert(
          {
            shardId: shardId,
            data: JSON.stringify(shard.filter.saveAsJSON()),
          },
          ['shardId'],
        )
        .then(() => {
          shard.buffer.clear();
          this.logger.log(`Shard ${shardId} BloomFilter 落盘成功`);
        })
        .catch((err) => {
          this.logger.error(`Shard ${shardId} BloomFilter 落盘失败`, err);
        });
    }
  }

  onModuleDestroy() {
    if (this.saveTimer) clearInterval(this.saveTimer);
    this.flushToDB();
  }
}
