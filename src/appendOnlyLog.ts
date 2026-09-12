import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AnomalyFlag } from './types.js';

export const DEFAULT_LOG_PATH = 'data/output/anomaly-log.jsonl';

/**
 * 이상탐지 로그는 append-only로만 기록한다 (요구사항: 수정/삭제 이력이 남아야 함).
 * 이 파일에는 의도적으로 update/delete 함수를 두지 않는다.
 */
export function appendFlags(flags: AnomalyFlag[], logPath: string = DEFAULT_LOG_PATH): void {
  const dir = dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const loggedAt = new Date().toISOString();
  const lines = flags.map((flag) => JSON.stringify({ loggedAt, ...flag })).join('\n') + '\n';
  appendFileSync(logPath, lines, 'utf-8');
}
