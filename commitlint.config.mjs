// Conventional Commits em português: sem regra de maiúsculas no assunto nem de largura no corpo.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: { 'subject-case': [0], 'body-max-line-length': [0], 'footer-max-line-length': [0] },
};
