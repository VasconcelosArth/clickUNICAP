import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './user.schema';
import { createProjectSchema } from './project.schema';
import { inviteMemberSchema } from './workspace.schema';
import { paginationQuerySchema } from './common.schema';

describe('registerSchema', () => {
  it('normaliza o e-mail para minúsculas', () => {
    expect(registerSchema.parse({ name: 'Ana', email: ' Ana@Exemplo.COM ', password: '12345678' }).email).toBe(
      'ana@exemplo.com',
    );
  });

  it('exige senha com no mínimo 8 caracteres', () => {
    expect(registerSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: '1234567' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('rejeita e-mail inválido', () => {
    expect(loginSchema.safeParse({ email: 'nao-e-email', password: 'x' }).success).toBe(false);
  });
});

describe('inviteMemberSchema', () => {
  it('usa "member" como papel padrão', () => {
    expect(inviteMemberSchema.parse({ email: 'b@c.com' }).role).toBe('member');
  });
});

describe('createProjectSchema', () => {
  it('aceita cor #RRGGBB e rejeita outros formatos', () => {
    expect(createProjectSchema.safeParse({ name: 'P', color: '#1F3A68' }).success).toBe(true);
    expect(createProjectSchema.safeParse({ name: 'P', color: 'azul' }).success).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('converte limit da query string e aplica padrão 50', () => {
    expect(paginationQuerySchema.parse({ limit: '10' }).limit).toBe(10);
    expect(paginationQuerySchema.parse({}).limit).toBe(50);
  });

  it('limita a 100 itens por página', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
