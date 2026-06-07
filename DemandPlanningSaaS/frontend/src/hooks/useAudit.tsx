'use client';

import { useCallback } from 'react';
import { useAuth } from '@/store/AuthContext';
import { logAudit } from '@/lib/api';

export function useAudit() {
  const { user } = useAuth();

  const log = useCallback(async (actionType: string, metadata: Record<string, any> = {}, dataset = '') => {
    if (!user) return;
    try {
      await logAudit(user.id, user.role, actionType, dataset, metadata);
    } catch (err) {
      console.error('[Audit] Failed to log action:', actionType, err);
    }
  }, [user]);

  return { log };
}

// Action type constants
export const AUDIT_ACTIONS = {
  UPLOAD_DATASET:       'upload_dataset',
  RUN_FORECAST:         'run_forecast',
  EDIT_CONSENSUS:       'edit_consensus',
  EXPORT_DATA:          'export_data',
  VIEW_MODULE:          'view_module',
  CHANGE_MODEL:         'change_model',
  ADJUST_SAFETY_STOCK:  'adjust_safety_stock',
  RUN_SIMULATION:       'run_simulation',
  SIGN_IN:              'sign_in',
  SIGN_OUT:             'sign_out',
} as const;
