import { responseViewportFromState } from '../../src/core/reducer';
import type { ResponseViewportModel } from '../../src/core/response-viewport';
import type { AppState } from '../../src/core/types';
import { assertDefinedToNarrowType } from './assertions';

export function viewportOf(state: AppState): ResponseViewportModel {
  const model = responseViewportFromState(state);
  assertDefinedToNarrowType(model, 'expected a response viewport model');
  return model;
}
