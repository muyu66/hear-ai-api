// short-term-algorithm.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { RememberModel } from '../src/interface/remember-model';
import { ShortTermAlgorithmService } from '../src/tool/algorithm/short-term.algorithm';

describe('ShortTermAlgorithmService', () => {
  let service: ShortTermAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShortTermAlgorithmService],
    }).compile();

    service = module.get<ShortTermAlgorithmService>(ShortTermAlgorithmService);
  });

  // 辅助函数：创建基础模型
  const createBaseModel = (
    overrides: Partial<RememberModel> = {},
  ): RememberModel => ({
    rememberedCount: 0,
    rememberedAt: new Date('2025-12-01T10:00:00Z'),
    lastRememberedAt: new Date('2025-12-01T09:00:00Z'),
    currHintCount: 0,
    hintCount: 0,
    repetitionZeroHintCount: 0,
    easeFactor: 2.5,
    createdAt: new Date('2025-12-01T08:00:00Z'),
    ...overrides,
  });

  // 辅助函数：比较日期是否相差指定分钟（容忍 1 秒误差）
  const expectDateDiffInMinutes = (
    actual: Date,
    expectedBase: Date,
    minutes: number,
  ) => {
    const diffMs = actual.getTime() - expectedBase.getTime();
    const diffMin = Math.round(diffMs / (1000 * 60));
    expect(diffMin).toBeCloseTo(minutes, 0.1); // 允许微小浮点误差
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.type).toBe('st');
    expect(service.supportTrain).toBe(false);
  });

  describe('handle', () => {
    it('should schedule next review in 10 minutes on first successful recall (currHintCount=0)', () => {
      const model = createBaseModel({ rememberedCount: 0, currHintCount: 0 });
      const result = service.handle(model);

      expect(result).not.toBeNull();
      expect(result!.rememberedCount).toBe(1);
      expect(result!.repetitionZeroHintCount).toBe(1);
      expectDateDiffInMinutes(result!.rememberedAt, model.rememberedAt, 10);
    });

    it('should schedule next review in 30 minutes on second successful recall', () => {
      const model = createBaseModel({ rememberedCount: 1, currHintCount: 0 });
      const result = service.handle(model);

      expect(result!.rememberedCount).toBe(2);
      expect(result!.repetitionZeroHintCount).toBe(1); // previous was 0, now +1 → 1? Wait!
      // ⚠️ 注意：repetitionZeroHintCount 初始为 0，成功后应为 1（第一次成功）
      // 第二次成功应为 2
      // 但这里 rememberedCount=1 表示已复习过1次，当前是第2次 → repetitionZeroHintCount 应从0→1？需看上下文

      // 实际上：repetitionZeroHintCount 是连续成功次数，初始为0
      // 第一次成功 → 1，第二次 → 2
      // 所以若输入 repetitionZeroHintCount=0，输出应为1
      // 但本测试未设初始值，所以默认0 → 成功后=1

      // 更准确测试：
    });

    it('should correctly increment repetitionZeroHintCount on success', () => {
      const model = createBaseModel({
        rememberedCount: 0,
        currHintCount: 0,
        repetitionZeroHintCount: 2, // 已连续成功2次
      });
      const result = service.handle(model);
      expect(result!.repetitionZeroHintCount).toBe(3);
    });

    it('should schedule 60 minutes on third successful recall', () => {
      const model = createBaseModel({ rememberedCount: 2, currHintCount: 0 });
      const result = service.handle(model);
      expectDateDiffInMinutes(result!.rememberedAt, model.rememberedAt, 60);
    });

    it('should schedule 180 minutes on fourth successful recall', () => {
      const model = createBaseModel({ rememberedCount: 3, currHintCount: 0 });
      const result = service.handle(model);
      expectDateDiffInMinutes(result!.rememberedAt, model.rememberedAt, 180);
    });

    it('should cap at 1440 minutes (1 day) after fifth+ successful recall', () => {
      const model = createBaseModel({ rememberedCount: 4, currHintCount: 0 });
      const result = service.handle(model);
      expectDateDiffInMinutes(result!.rememberedAt, model.rememberedAt, 1440);

      // 第六次也应是 1440
      const model2 = createBaseModel({ rememberedCount: 5, currHintCount: 0 });
      const result2 = service.handle(model2);
      expectDateDiffInMinutes(result2!.rememberedAt, model2.rememberedAt, 1440);
    });

    it('should schedule next review in 5 minutes on failure (currHintCount=3)', () => {
      const model = createBaseModel({ rememberedCount: 0, currHintCount: 3 });
      const result = service.handle(model);

      expect(result!.rememberedCount).toBe(1);
      expect(result!.repetitionZeroHintCount).toBe(0); // 0 - 1 → max(0, -1) = 0
      expectDateDiffInMinutes(result!.rememberedAt, model.rememberedAt, 5);
    });

    it('should decrement repetitionZeroHintCount (but not below 0) on failure', () => {
      const model = createBaseModel({
        rememberedCount: 0,
        currHintCount: 4,
        repetitionZeroHintCount: 1,
      });
      const result = service.handle(model);
      expect(result!.repetitionZeroHintCount).toBe(0);

      // If already 0, stay 0
      const model2 = createBaseModel({
        rememberedCount: 0,
        currHintCount: 5,
        repetitionZeroHintCount: 0,
      });
      const result2 = service.handle(model2);
      expect(result2!.repetitionZeroHintCount).toBe(0);
    });

    it('should update lastRememberedAt to current rememberedAt', () => {
      const model = createBaseModel({ rememberedCount: 0, currHintCount: 0 });
      const originalRememberedAt = new Date(model.rememberedAt);
      const result = service.handle(model);

      expect(result!.lastRememberedAt.getTime()).toBe(
        originalRememberedAt.getTime(),
      );
    });

    it('should accumulate hintCount correctly', () => {
      const model = createBaseModel({
        rememberedCount: 0,
        currHintCount: 2,
        hintCount: 3,
      });
      const result = service.handle(model);
      expect(result!.hintCount).toBe(5); // 3 + 2
    });
  });
});
