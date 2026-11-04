/** Nomes e caminhos dos cookies de autenticação. O frontend nunca lê esses cookies (httpOnly). */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

/** O refresh token só é enviado para as rotas de auth, reduzindo a exposição. */
export const ACCESS_COOKIE_PATH = '/api';
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Chave de metadados do decorator @Public(). */
export const IS_PUBLIC_KEY = 'auth:isPublic';
