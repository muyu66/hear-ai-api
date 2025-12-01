import { SetMetadata } from '@nestjs/common';

export const CLIENT_ALLOWED_KEY = 'clientAllowed';

/**
 * @param clients - 允许访问的客户端类型数组 ['android','chrome']
 */
export const ClientAllowed = (...clients: ('android' | 'chrome')[]) =>
  SetMetadata(CLIENT_ALLOWED_KEY, clients);
