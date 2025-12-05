import { calculateActiveLevel } from '../src/tool/tool';

describe('calculateActiveLevel', () => {
  const now = new Date();

  it('should return 0 for empty array', () => {
    expect(calculateActiveLevel([])).toBe(0);
  });

  it('should return 85~100 for every 6 hours login', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setHours(d.getHours() - i * 6); // 每 6 小时一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should return 70~85 for daily login', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i); // 每天一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(69);
    expect(score).toBeLessThanOrEqual(85);
  });

  it('should return 55~70 for every 2 days login', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 2); // 每 2 天一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThanOrEqual(70);
  });

  it('should return 40~55 for every 3 days login', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 3); // 每 3 天一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThanOrEqual(55);
  });

  it('should return 20~40 for weekly login', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7); // 每周一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThanOrEqual(40);
  });

  it('should return 0~20 for rare login (>2 weeks)', () => {
    const logins: Date[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 21); // 每 3 周一次
      logins.push(d);
    }
    const score = calculateActiveLevel(logins);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(20);
  });

  it('should handle unsorted logins correctly', () => {
    const logins: Date[] = [
      new Date(now.getTime() - 24 * 3600 * 1000),
      now,
      new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    ];
    const scoreSorted = calculateActiveLevel(
      logins.slice().sort((a, b) => a.getTime() - b.getTime()),
    );
    const scoreUnsorted = calculateActiveLevel(logins.slice().reverse());
    expect(scoreUnsorted).toEqual(scoreSorted);
  });
});
