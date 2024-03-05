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
  model = 'gpt-3.5-turbo-0125';
  max_tokens = 200;
  temperature = 0.7;

  async getChatCompletion(prompt: Array<{ role: string; content: string }>) {
    const response = await axios.post(
      this.url,
      {
        model: this.model,
        max_tokens: this.max_tokens,
        temperature: this.temperature,
        messages: prompt,
      },
      { headers: this.headers },
    );
    const content: string = response.data.choices[0].message.content;
    return content;
  }

  async getChatCompletionsStream(
    prompt: Array<{ role: string; content: string }>,
  ) {
    const response = await axios.post(
      this.url,
      {
        messages: prompt,
        model: this.model,
        max_tokens: this.max_tokens,
        temperature: this.temperature,
        stream: true,
      },
      { headers: this.headers, responseType: 'stream' },
    );

    return response;
  }
}
