import dayjs from 'dayjs';
import { RememberModel } from '../src/interface/remember-model';
import { User } from '../src/model/user.model';
import { SMCAlgorithmService } from '../src/tool/algorithm/smc.algorithm';

describe('SMCAlgorithmService', () => {
  let service: SMCAlgorithmService;
  const now = new Date();

  beforeEach(() => {
    service = new SMCAlgorithmService();
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseUser: Partial<User> = {
    targetRetention: 90,
    activeLevel: 5,
  };

  it('首次学习，grade >= 4 使用 INITIAL_STABILITY', () => {
    const model: RememberModel = {
      currHintCount: 0,
      rememberedCount: 0,
      difficulty: 50,
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.nextRememberedAt).toBeInstanceOf(Date);
  });

  it('复习成功，grade 高，stability 增长', () => {
    const model: RememberModel = {
      currHintCount: 0, // grade 5
      rememberedCount: 5,
      difficulty: 50,
      stability: 2,
      lastRememberedAt: new Date(now.getTime() - 2 * 86400 * 1000), // 2 天前
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    expect(result.stability).toBeGreaterThan(2);
    expect(result.difficulty).toBeGreaterThan(0);
  });

  it('复习失败，grade 低，stability 降低', () => {
    const model: RememberModel = {
      currHintCount: 5, // grade = 0
      rememberedCount: 5,
      difficulty: 50,
      stability: 2,
      lastRememberedAt: new Date(now.getTime() - 2 * 86400 * 1000),
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    expect(result.stability).toBeLessThan(2);
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('difficulty 更新在合法范围内', () => {
    const model: RememberModel = {
      currHintCount: 0,
      rememberedCount: 100,
      difficulty: 0,
      stability: 2,
      lastRememberedAt: new Date(now.getTime() - 5 * 86400 * 1000),
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(99);
  });

  it('nextRememberedAt 计算大致正确', () => {
    const model: RememberModel = {
      currHintCount: 0,
      rememberedCount: 5,
      difficulty: 50,
      stability: 2,
      lastRememberedAt: new Date(now.getTime() - 1 * 86400 * 1000),
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    const intervalDays =
      (result.nextRememberedAt!.getTime() - now.getTime()) / (86400 * 1000);
    // 目标 interval = stability * (-ln(targetR))^(1/p) ≈ 2 * (-ln(0.9))^(1/0.65)
    expect(intervalDays).toBeGreaterThan(0);
  });

  it('处理没有 lastRememberedAt 的情况', () => {
    const model: RememberModel = {
      currHintCount: 0,
      rememberedCount: 0,
      difficulty: 50,
      stability: undefined,
      lastRememberedAt: undefined,
      hintCount: 0,
      thinkingTime: 0,
      currThinkingTime: 0,
      createdAt: new Date(),
    };
    const result = service.handle(model, baseUser as User);
    expect(result.nextRememberedAt).toBeInstanceOf(Date);
    expect(result.stability).toBeGreaterThan(0);
  });
});

describe('SMCAlgorithmService - nextRememberedAt 验证', () => {
  let service: SMCAlgorithmService;
  const now = new Date();

  beforeEach(() => {
    service = new SMCAlgorithmService();
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseUser: Partial<User> = {
    targetRetention: 90,
    activeLevel: 5,
  };

  // 多组测试参数
  const testCases: Array<{
    currHintCount: number;
    rememberedCount: number;
    stability?: number;
    difficulty: number;
    lastRememberedAt?: Date;
    nextRememberedAt?: Date;
  }> = [
    { currHintCount: 0, rememberedCount: 0, difficulty: 10 }, // 首次学习，高grade
    { currHintCount: 3, rememberedCount: 0, difficulty: 40 }, // 首次学习，低grade
    {
      currHintCount: 0,
      rememberedCount: 5,
      stability: 2,
      difficulty: 50,
      lastRememberedAt: new Date(now.getTime() - 2 * 86400 * 1000),
    }, // 已复习，短间隔
    {
      currHintCount: 1,
      rememberedCount: 10,
      stability: 3,
      difficulty: 70,
      lastRememberedAt: new Date(now.getTime() - 10 * 86400 * 1000),
    }, // 已复习，长间隔
    {
      currHintCount: 2,
      rememberedCount: 20,
      stability: 5,
      difficulty: 90,
      lastRememberedAt: new Date(now.getTime() - 15 * 86400 * 1000),
      nextRememberedAt: new Date(now.getTime() + 10 * 86400 * 1000),
    }, // 有上次计划的 nextRememberedAt
    {
      currHintCount: 0,
      rememberedCount: 1,
      stability: 0.68,
      difficulty: 50,
      lastRememberedAt: new Date(now.getTime() - 2 * 60 * 1000),
    },
  ];

  testCases.forEach((params, idx) => {
    it(`测试案例 #${idx + 1}`, () => {
      const model: RememberModel = { ...params } as RememberModel;
      const result = service.handle(model, baseUser as User);

      expect(result.nextRememberedAt).toBeInstanceOf(Date);

      // 检查 nextRememberedAt 时间 > now
      expect(result.nextRememberedAt!.getTime()).toBeGreaterThanOrEqual(
        now.getTime(),
      );

      // 检查间隔天数合理（>0, < 365天）
      const intervalDays =
        (result.nextRememberedAt!.getTime() - now.getTime()) / (86400 * 1000);
      expect(intervalDays).toBeGreaterThanOrEqual(0);
      expect(intervalDays).toBeLessThanOrEqual(365);

      // 可选：打印结果方便人工验证
      console.log(
        `Case #${idx + 1}: intervalDays=${intervalDays.toFixed(
          2,
        )}, stability=${result.stability?.toFixed(2)} , difficulty=${result.difficulty?.toFixed(2)} , 
        last=${dayjs(result.lastRememberedAt).toISOString()} , next=${dayjs(result.nextRememberedAt).toISOString()}`,
      );
    });
  });
});
