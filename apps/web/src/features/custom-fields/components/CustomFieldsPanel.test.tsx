import type { CustomField } from '@clickunicap/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { CustomFieldsPanel } from './CustomFieldsPanel';

const textFieldId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const dropdownFieldId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const fields: CustomField[] = [
  {
    id: textFieldId,
    projectId: ids.project,
    name: 'Código do item',
    type: 'text',
    options: null,
    isRequired: true,
    position: 0,
    createdAt: '2026-11-04T12:00:00.000Z',
  },
  {
    id: dropdownFieldId,
    projectId: ids.project,
    name: 'Categoria',
    type: 'dropdown',
    options: ['Documento', 'Fotografia'],
    isRequired: false,
    position: 1,
    createdAt: '2026-11-04T12:00:00.000Z',
  },
];

function renderPanel() {
  return renderWithProviders(<CustomFieldsPanel taskId={task.id} projectId={ids.project} />);
}

describe('CustomFieldsPanel', () => {
  it('carrega os valores e envia as alterações para a rota da tarefa', async () => {
    let submitted: unknown;
    server.use(
      http.get('*/projects/:projectId/custom-fields', () => HttpResponse.json(fields)),
      http.get('*/tasks/:taskId/custom-field-values', () => HttpResponse.json({ [textFieldId]: 'INV-10' })),
      http.patch('*/tasks/:taskId/custom-field-values', async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json({ [textFieldId]: 'INV-11', [dropdownFieldId]: 'Fotografia' });
      }),
    );

    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByLabelText('Código do item')).toHaveValue('INV-10');
    await user.clear(screen.getByLabelText('Código do item'));
    await user.type(screen.getByLabelText('Código do item'), 'INV-11');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Fotografia');
    await user.click(screen.getByRole('button', { name: 'Salvar campos' }));

    await waitFor(() =>
      expect(submitted).toEqual({
        values: { [textFieldId]: 'INV-11', [dropdownFieldId]: 'Fotografia' },
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Valores dos campos salvos.');
  });

  it('permite ao administrador criar um campo e envia a configuração correta', async () => {
    let created: unknown;
    server.use(
      http.get('*/projects/:projectId/custom-fields', () => HttpResponse.json([])),
      http.get('*/tasks/:taskId/custom-field-values', () => HttpResponse.json({})),
      http.post('*/projects/:projectId/custom-fields', async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ ...fields[0], ...(created as object) }, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    renderPanel();
    await user.click(await screen.findByRole('button', { name: 'Gerenciar campos' }));
    await user.type(screen.getByLabelText('Nome do campo'), 'Prioridade interna');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'dropdown');
    await user.type(screen.getByLabelText('Opções'), 'Alta\nMédia\nBaixa');
    await user.click(screen.getByRole('button', { name: 'Adicionar campo' }));

    await waitFor(() =>
      expect(created).toEqual({
        name: 'Prioridade interna',
        type: 'dropdown',
        isRequired: false,
        options: ['Alta', 'Média', 'Baixa'],
      }),
    );
  });

  it('apresenta erro de API sem perder a seção', async () => {
    server.use(
      http.get('*/projects/:projectId/custom-fields', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falha ao carregar campos' }, { status: 500 }),
      ),
      http.get('*/tasks/:taskId/custom-field-values', () => HttpResponse.json({})),
    );

    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar campos');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
