import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Hash de senha com argon2id (recomendação atual da OWASP).
 * É um provider separado para os testes unitários poderem trocar por um falso rápido.
 */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false; // hash corrompido ou em formato inesperado
    }
  }
}
