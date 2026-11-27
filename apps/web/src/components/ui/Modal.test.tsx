import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('Esc num modal aberto sobre outro fecha só o de cima', () => {
    const closeOuter = vi.fn();
    const closeInner = vi.fn();
    render(
      <Modal open onClose={closeOuter} title="Tarefa">
        <Modal open onClose={closeInner} title="Preview">
          conteúdo
        </Modal>
      </Modal>,
    );

    const inner = screen.getByRole('dialog', { name: 'Preview' });
    fireEvent(inner, new Event('cancel', { cancelable: true }));

    expect(closeInner).toHaveBeenCalledOnce();
    expect(closeOuter).not.toHaveBeenCalled();
  });
});
