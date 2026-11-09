import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ids } from '@/mocks/fixtures';
import { renderWithProviders } from '@/test/render';
import { TaskFiltersBar } from './TaskFiltersBar';

describe('TaskFiltersBar', () => {
  it('lê os filtros da URL e oferece limpar', () => {
    renderWithProviders(<TaskFiltersBar />, { route: '/tela?priority=high&search=kanban' });

    expect(screen.getByLabelText('Prioridade')).toHaveValue('high');
    expect(screen.getByLabelText('Buscar por título')).toHaveValue('kanban');
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('não oferece limpar sem filtros', () => {
    renderWithProviders(<TaskFiltersBar />);

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('limpa os filtros', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskFiltersBar />, { route: `/tela?assigneeId=${ids.user}&search=kanban` });

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByLabelText('Buscar por título')).toHaveValue('');
    expect(screen.getByLabelText('Responsável')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });
});
