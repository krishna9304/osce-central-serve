import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OpenAiUtil {
  constructor(private readonly configService: ConfigService) {}

  url = 'https://api.openai.com/v1/chat/completions';
  headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${this.configService.get<string>('OPENAI_API_KEY')}`,
  };
  max_tokens = 200;
  temperature = 0.7;

  async getChatCompletion(
    prompt: Array<{ role: string; content: string }>,
    model: string,
  ) {
    const response = await axios.post(
      this.url,
      {
        max_tokens: this.max_tokens,
        temperature: this.temperature,
        messages: prompt,
        model,
      },
      { headers: this.headers },
    );
    const content: string = response.data.choices[0].message.content;
    return content;
  }

  async getChatCompletionsStream(
    prompt: Array<{ role: string; content: string }>,
    model: string,
  ) {
    const response = await axios.post(
      this.url,
      {
        messages: prompt,
        max_tokens: this.max_tokens,
        temperature: this.temperature,
        stream: true,
        model,
      },
      { headers: this.headers, responseType: 'stream' },
    );

    return response;
  }
}
