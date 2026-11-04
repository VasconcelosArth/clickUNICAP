import { RESEND_API_URL, ResendError, ResendMailTransport } from './resend.transport';

const message = { from: 'App <no-reply@app.dev>', to: 'ana@teste.com', subject: 'Oi', text: 'texto', html: '<p>html</p>' };

function fakeFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'X',
    json: async () => body,
  });
}

describe('ResendMailTransport', () => {
  it('faz POST na API do Resend com a chave e o corpo no formato esperado', async () => {
    const fetchMock = fakeFetch(200, { id: 'email_123' });
    await new ResendMailTransport('re_chave', fetchMock as unknown as typeof fetch).send(message);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(RESEND_API_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_chave');
    expect(JSON.parse(init.body)).toEqual({
      from: 'App <no-reply@app.dev>',
      to: ['ana@teste.com'],
      subject: 'Oi',
      text: 'texto',
      html: '<p>html</p>',
    });
  });

  it('não manda o campo html quando não há HTML', async () => {
    const fetchMock = fakeFetch(200, {});
    await new ResendMailTransport('re_x', fetchMock as unknown as typeof fetch).send({ ...message, html: undefined });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('html');
  });

  it('lança ResendError com status e mensagem quando a API recusa', async () => {
    const fetchMock = fakeFetch(403, { message: 'The domain is not verified' });
    const send = new ResendMailTransport('re_x', fetchMock as unknown as typeof fetch).send(message);
    await expect(send).rejects.toBeInstanceOf(ResendError);
    await expect(
      new ResendMailTransport('re_x', fakeFetch(403, { message: 'The domain is not verified' }) as unknown as typeof fetch).send(
        message,
      ),
    ).rejects.toThrow('Resend respondeu 403: The domain is not verified');
  });

  it('não quebra se a resposta de erro não for JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error', json: async () => { throw new Error('não é json'); } });
    await expect(new ResendMailTransport('re_x', fetchMock as unknown as typeof fetch).send(message)).rejects.toThrow(
      /500: Server Error/,
    );
  });
});
