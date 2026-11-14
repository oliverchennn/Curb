import { ScenarioDatasetSchema, type ScenarioFailure } from '../../contracts/curb';

export function getScenarioResponse(dataset: string | null): {
  status: number;
  body: ScenarioFailure;
} {
  const selected = ScenarioDatasetSchema.safeParse(dataset ?? 'sample');
  if (!selected.success) {
    return {
      status: 404,
      body: { ok: false, error: { code: 'DATASET_NOT_FOUND', message: 'Unknown scenario dataset.' } },
    };
  }

  return {
    status: 501,
    body: {
      ok: false,
      error: { code: 'SCENARIO_UNAVAILABLE', message: 'Scenario loading is unavailable in this build.' },
    },
  };
}
