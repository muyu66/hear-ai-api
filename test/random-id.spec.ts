import _ from 'lodash';

function data() {
  return _.range(400);
}

/**
 * 生成随机子集
 */
function randomMethod1(randomMod = 10, randomCount = 5) {
  return _.sampleSize(_.shuffle(_.range(randomMod)), randomCount);
}

describe('随机方法测试', () => {
  it('覆盖性、平均性和可视化测试', () => {
    const randomMod = 100;
    const randomCount = 20;
    const ids = data();

    // 记录每个模值被选中的次数
    const counts: Record<number, number> = {};
    for (let i = 0; i < randomMod; i++) counts[i] = 0;

    const runs = 10000; // 多次实验
    for (let i = 0; i < runs; i++) {
      const randomSubs = randomMethod1(randomMod, randomCount);
      for (const id of ids) {
        const mod = id % randomMod;
        if (randomSubs.includes(mod)) {
          counts[mod]++;
        }
      }
    }

    // 控制台柱状图可视化
    // console.log('\n=== 模值分布柱状图 ===');
    // const maxCount = Math.max(...Object.values(counts));
    // for (const key of Object.keys(counts)) {
    //   const count = counts[Number(key)];
    //   // 按比例生成柱状符号
    //   const barLength = Math.round((count / maxCount) * 50); // 最大 50 个 #
    //   console.log(`${key}: ${'#'.repeat(barLength)} (${count})`);
    // }

    const values = Object.values(counts);
    const mean = _.mean(values);
    const variance = _.mean(values.map((v) => (v - mean) ** 2));
    const stdDev = Math.sqrt(variance);

    console.log('Mean:', mean, 'StdDev:', stdDev);

    // 覆盖性检查：所有模值都至少出现一次
    for (const key of Object.keys(counts)) {
      expect(counts[Number(key)]).toBeGreaterThan(0);
    }

    // 平均性检查：标准差不能太大，这里允许偏差20%
    const maxStdDev = mean * 0.2;
    expect(stdDev).toBeLessThan(maxStdDev);
  });
});
