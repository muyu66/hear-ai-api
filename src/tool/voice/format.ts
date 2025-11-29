import { spawn } from 'child_process';

export async function formatBufferWavToOpus(
  wavBuffer: Buffer,
): Promise<Buffer<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    // 创建 ffmpeg 进程
    const ff = spawn('ffmpeg', [
      '-i',
      'pipe:0', // 从 stdin 输入 wav
      '-c:a',
      'libopus', // 编码器
      '-b:a',
      '20k', // 比特率
      '-f',
      'opus', // 格式
      'pipe:1', // 输出到 stdout
    ]);

    const chunks: any[] = [];
    ff.stdout.on('data', (chunk) => chunks.push(chunk));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ff.stderr.on('data', (data: any) => {
      // ffmpeg 的 stderr 并不是错误（进度信息）；你可以打印
      // console.log('ffmpeg:', new String(data));
    });

    ff.on('error', reject);

    ff.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error('ffmpeg failed, code=' + code));
      }
    });

    // 写入 wav buffer 给 ffmpeg
    ff.stdin.write(wavBuffer);
    ff.stdin.end();
  });
}
