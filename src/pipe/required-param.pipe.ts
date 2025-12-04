import { BadRequestException, PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class RequiredParamPipe implements PipeTransform {
  constructor(private readonly message?: string) {}

  transform(value: unknown) {
    const v = typeof value === 'string' ? value.trim() : value;

    if (v === undefined || v === null || v === '') {
      throw new BadRequestException(this.message || '参数不能为空');
    }

    return v;
  }
}
