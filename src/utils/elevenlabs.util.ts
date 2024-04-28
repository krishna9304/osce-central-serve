import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class ElevenLabsUtil {
  constructor(private readonly configService: ConfigService) {}

  streamUrl = (voiceId) =>
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
  headers = {
    accept: 'application/json',
    'xi-api-key': this.configService.get<string>('ELEVEN_LABS_API_KEY'),
    'Content-Type': 'application/json',
  };
  msgObject = (text: string = '') => ({
    model_id: 'eleven_multilingual_v2',
    text,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.3,
    },
  });

  readonly getAudioStream = async (
    text: string,
    voiceId: string,
  ): Promise<AxiosResponse> => {
    try {
      const response = await axios.post(
        this.streamUrl(voiceId),
        JSON.stringify(this.msgObject(text)),
        {
          headers: this.headers,
          responseType: 'stream',
        },
      );
      return response;
    } catch (e) {
      console.log(e);
      throw e;
    }
  };

  readonly getAudioHTTP = async (
    text: string,
    voiceId: string,
  ): Promise<AxiosResponse> => {
    try {
      const response = await axios.post(
        this.streamUrl(voiceId).replace('/stream', ''),
        JSON.stringify(this.msgObject(text)),
        {
          headers: this.headers,
        },
      );
      return response;
    } catch (e) {
      console.log(e);
      throw e;
    }
  };
}
