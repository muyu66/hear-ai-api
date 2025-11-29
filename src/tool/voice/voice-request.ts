export interface VoiceRequest {
  request(words: string, speaker: string, slow: boolean): Promise<Buffer>;
}
