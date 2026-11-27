import { useId, useRef, useState, type DragEvent } from 'react';
import { Button, UploadIcon } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES } from '../utils/files';

interface AttachmentDropzoneProps {
  onFiles: (files: File[]) => void;
}

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/** Área de envio: arrastar e soltar, ou o botão, que também funciona no teclado. */
export function AttachmentDropzone({ onFiles }: AttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault(); // permite soltar
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // Sair para um filho da própria área não conta
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      role="group"
      aria-label="Enviar anexos"
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed border-gray-300 dark:border-gray-700/60 rounded-lg p-5 text-center transition duration-150',
        dragging && 'border-violet-500 dark:border-violet-500',
      )}
    >
      <UploadIcon className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
      <p className="text-sm">{dragging ? 'Solte para enviar' : 'Arraste arquivos para cá ou'}</p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
      >
        Escolher arquivos
      </Button>
      <p id={hintId} className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
        PDF, imagens (PNG, JPG, GIF, WEBP), TXT, CSV, DOCX, XLSX e PPTX, até 10 MB cada.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        aria-label="Anexar arquivos"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = ''; // permite escolher o mesmo arquivo de novo
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}
