export interface RememberModel {
  /**
   * 总计复习次数
   * 第一次创建时不算复习
   */
  rememberedCount: number;

  /**
   * 下一次复习时间
   * undefined 表示第一次添加，还没有复习
   */
  nextRememberedAt?: Date;

  /**
   * 上次复习时间
   */
  lastRememberedAt?: Date;

  /**
   * 最近一次提示次数
   * 0表示无提示，每提示一次数字+1
   */
  currHintCount: number;

  /**
   * 总计提示次数
   */
  hintCount: number;

  /**
   * 当前思考时间
   * 单位毫秒
   * 0=不喜欢或者太熟悉
   */
  currThinkingTime: number;

  /**
   * 总计思考时间
   * 单位毫秒
   */
  thinkingTime: number;

  /**
   * 难度，不同于EF  (SMZ算法专属)
   * 0~100（百分比）
   * 初始值 50
   */
  difficulty?: number;

  /**
   * 稳定值 (SMZ算法专属)
   */
  stability?: number;

  /**
   * 阶段索引 (ST算法专属)
   */
  shortStageIndex?: number;

  /**
   * 第一次接触这个单词的时间
   * 当时没有复习
   */
  createdAt: Date;
}
