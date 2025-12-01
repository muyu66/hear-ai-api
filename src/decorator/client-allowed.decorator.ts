import { SetMetadata } from '@nestjs/common';
import { ClientType } from 'src/constant/contant';

export const CLIENT_ALLOWED_KEY = 'clientAllowed';

/**
 * @param clients - 允许访问的客户端类型数组 ClientType[]
 */
export const ClientAllowed = (...clients: ClientType[]) =>
  SetMetadata(CLIENT_ALLOWED_KEY, clients);
