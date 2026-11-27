import type { TimeReport } from '@clickunicap/shared';
import type { DayRange } from './period';

/** Ponto e vírgula, como o Excel em português espera (a vírgula é o separador decimal). */
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';

/**
 * Uma célula do CSV. Texto que começa com `=`, `+`, `-`, `@` ou tabulação vira texto puro (prefixo `'`), para a
 * planilha não executar como fórmula o título de uma tarefa. Aspas, separador e quebra de linha vão entre aspas.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Minutos em horas decimais com vírgula. Ex.: 90 → "1,50". */
const decimalHours = (minutes: number) => (minutes / 60).toFixed(2).replace('.', ',');

/**
 * O relatório em CSV: uma linha por membro e uma por tarefa, na ordem da tela, e o total no fim.
 * Colunas: Agrupamento, Nome, Minutos e Horas.
 */
export function timeReportToCsv(report: TimeReport): string {
  const rows: (string | number)[][] = [
    ['Agrupamento', 'Nome', 'Minutos', 'Horas'],
    ...report.byMember.map((m) => ['Membro', m.userName, m.minutes, decimalHours(m.minutes)]),
    ...report.byTask.map((t) => ['Tarefa', t.taskTitle, t.minutes, decimalHours(t.minutes)]),
    ['Total', '', report.totalMinutes, decimalHours(report.totalMinutes)],
  ];
  return rows.map((row) => row.map(csvCell).join(SEPARATOR)).join(LINE_BREAK) + LINE_BREAK;
}

/** Nome do arquivo com o período da tela. Ex.: "horas-2026-11-01-a-2026-11-30.csv". */
export const timeReportFileName = (range: DayRange) => `horas-${range.from}-a-${range.to}.csv`;

/**
 * Baixa o CSV no navegador. O BOM no início faz o Excel abrir em UTF-8 (sem ele, os acentos quebram).
 */
export function downloadCsv(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoga depois que o navegador começou o download
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
