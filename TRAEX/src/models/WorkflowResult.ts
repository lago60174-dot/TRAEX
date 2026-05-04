import { Trade } from './Trade';

export interface WorkflowResult {
  status: 'SUCCESS' | 'NO_SIGNAL' | 'BLOCKED_RISK' | 'FAILED_EXECUTION' | 'ERROR';
  contextId: string;
  trade?: Trade;
  reason?: string;
  error?: string;
}