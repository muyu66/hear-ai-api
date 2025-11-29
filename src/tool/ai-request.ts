import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { WordsLevel } from 'src/enum/words-level.enum';
import { ConfigService } from 'src/service/config.service';

const promptWordsMaker = (
  num: number,
  level: WordsLevel,
): {
  prompt: string;
  temperature: number;
  topP: number;
} => {
  switch (level) {
    case WordsLevel.VERY_EASY:
      return {
        prompt: `你现在要生成英语听力训练用的 A1 级简易英文句子。

【句子数量】
生成 ${num} 句。

【A1 难度定义（必须严格执行）】
- 句子长度最多 6 个词。
- 只允许一般现在时、一般过去时。
- 只允许简单主谓宾结构（SVO）或 be 动词句。
- 不允许使用从句、不允许使用并列句（and/but 连接句子）。
- 不允许被动语态。
- 不允许非谓语动词（不允许 to do / doing / done 用法）。
- 不允许抽象词汇。
- 词汇必须来自 CEFR A1 高频词表（约前 1200 个英文高频词）。

【输出要求】
- 所有句子必须互不相同。
- 尽量不要重复相同单词或短语。
- 每个句子应独特，避免模板化表达。

【主题范围】
仅允许：日常行为、人物、物品、简单动作、天气、兴趣。

【禁止】
- It is … / There is …
- 模板化句式
- 文学化表达

【输出格式】
只输出 JSON 数组，不要任何代码块标记（不要 \`\`\`json \`\`\` 或 \`\`\`）。
[{ "words": "...", "translation": "..." }]
`,
        temperature: 0.9,
        topP: 0.9,
      };
    case WordsLevel.EASY:
      return {
        prompt: `你现在要生成英语听力训练用的 A2 级英文句子。

【句子数量】
生成 ${num} 句。

【A2 难度定义】
- 句子长度最多 8 个词。
- 允许简单并列句（and / but 连接两个短句）。
- 允许基础的 to do 不定式（目的类：I went to buy food）。
- 不允许使用定语从句（who/which/that）。
- 不允许复杂状语从句（although/while/because 等）。
- 不允许复杂被动语态。
- 不允许复杂名词短语。
- 词汇必须来自 CEFR A1–A2 词表（前 2000 高频词）。

【主题】
日常生活、学校、工作、购物、活动、旅行基础情境。

【输出要求】
- 所有句子必须互不相同。
- 尽量不要重复相同单词或短语。
- 每个句子应独特，避免模板化表达。

【禁止】
- 模板化句式
- 复杂语法
- 抽象主题（哲学、政治、历史分析）

【输出格式】
只输出 JSON 数组，不要任何代码块标记（不要 \`\`\`json \`\`\` 或 \`\`\`）。
[{ "words": "...", "translation": "..." }]
`,
        temperature: 0.9,
        topP: 0.9,
      };
    case WordsLevel.NORMAL:
      return {
        prompt: `你现在要生成英语听力训练用的 B1 级英文句子。

【句子数量】
生成 ${num} 句。

【B1 难度定义】
- 句子长度最多 12 个词。
- 可以使用简单定语从句（who/that/which）。
- 可以使用常见状语从句（because/when/if/after/before）。
- 可以使用一般完成时（have done）。
- 可以使用简单被动语态（The door was closed）。
- 不允许复杂的从句嵌套。
- 不允许虚拟语气。
- 不允许使用文学化比喻。
- 词汇来自 CEFR A1–B1（前 3000–3500 高频词）。

【主题】
兴趣、学习、计划、简单观点、旅行经历、工作情境。

【输出要求】
- 所有句子必须互不相同。
- 尽量不要重复相同单词或短语。
- 每个句子应独特，避免模板化表达。

【输出格式】
只输出 JSON 数组，不要任何代码块标记（不要 \`\`\`json \`\`\` 或 \`\`\`）。
[{ "words": "...", "translation": "..." }]
`,
        temperature: 1.0,
        topP: 0.9,
      };
    case WordsLevel.HARD:
      return {
        prompt: `你现在要生成英语听力训练用的 B2 级英文句子。

【句子数量】
生成 ${num} 句。

【B2 难度定义】
- 句子长度最多 15 个词。
- 可以使用复杂的状语从句（although, whereas, as soon as）。
- 可以使用虚拟语气（If I were …）。
- 可以使用被动语态和情态动词的完成时（might have done）。
- 可以使用非谓语动词的复杂用法（Having done..., To be done）。
- 不允许诗意修辞。
- 不允许学术写作风格（保持自然口语表达）。
- 词汇来自 CEFR A1–B2（前 4500 高频词）。

【主题】
观点表达、抽象概念、科技、社会现象、情绪描述等。

【输出要求】
- 所有句子必须互不相同。
- 尽量不要重复相同单词或短语。
- 每个句子应独特，避免模板化表达。

【输出格式】
只输出 JSON 数组，不要任何代码块标记（不要 \`\`\`json \`\`\` 或 \`\`\`）。
[{ "words": "...", "translation": "..." }]
`,
        temperature: 1.1,
        topP: 0.95,
      };
    case WordsLevel.VERY_HARD:
      return {
        prompt: `你现在要生成英语听力训练用的 C2 级英文句子。

【句子数量】
生成 ${num} 句。

【C2 难度定义】
- 句子长度最多 20 个词。
- 允许所有语法结构（复杂嵌套、倒装、强调、虚拟、非谓语链式结构）。
- 允许文学化、哲学、抽象、隐喻式表达。
- 词汇不受限制（可以使用学术、专业、技术、文学词汇）。

【输出要求】
- 所有句子必须互不相同。
- 尽量不要重复相同单词或短语。
- 每个句子应独特，避免模板化表达。

【输出格式】
只输出 JSON 数组，不要任何代码块标记（不要 \`\`\`json \`\`\` 或 \`\`\`）。
[{ "words": "...", "translation": "..." }]
`,
        temperature: 1.2,
        topP: 0.95,
      };
  }
};

@Injectable()
export class AiRequest {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: configService.deepseekApiKey,
    });
  }

  async requestWords(num: number, level: WordsLevel): Promise<string> {
    const { prompt, temperature, topP } = promptWordsMaker(num, level);
    const completion = await this.openai.chat.completions.create({
      temperature,
      top_p: topP,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
      ],
      model: 'deepseek-chat',
    });

    return completion.choices[0].message.content || '[]';
  }
}
