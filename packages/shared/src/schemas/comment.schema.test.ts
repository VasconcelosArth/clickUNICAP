import { describe, it, expect } from 'vitest';
import { createCommentSchema, updateCommentSchema } from './comment.schema';

describe('createCommentSchema', () => {
  it('aceita texto', () => {
    expect(createCommentSchema.safeParse({ body: 'Olá' }).success).toBe(true);
  });
  it('aceita menção no formato @[userId]', () => {
    expect(createCommentSchema.safeParse({ body: 'Veja isso @[u2]' }).success).toBe(true);
  });
  it('recusa vazio', () => {
    expect(createCommentSchema.safeParse({ body: '' }).success).toBe(false);
  });
  it('recusa só espaços', () => {
    expect(createCommentSchema.safeParse({ body: '   \n   ' }).success).toBe(false);
  });
  it('aceita exatamente 5000 caracteres', () => {
    expect(createCommentSchema.safeParse({ body: 'a'.repeat(5000) }).success).toBe(true);
  });
  it('recusa mais de 5000 caracteres', () => {
    expect(createCommentSchema.safeParse({ body: 'a'.repeat(5001) }).success).toBe(false);
  });
});

describe('updateCommentSchema', () => {
  it('segue as mesmas regras da criação', () => {
    expect(updateCommentSchema.safeParse({ body: 'editado' }).success).toBe(true);
    expect(updateCommentSchema.safeParse({ body: '' }).success).toBe(false);
  });
});
