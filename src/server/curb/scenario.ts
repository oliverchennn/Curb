import {
  ScenarioDatasetSchema,
  ScenarioResponseSchema,
  ScenarioSchema,
  type ScenarioResponse,
} from '../../contracts/curb';
import empty from '../../data/curb/empty.json';
import sample from '../../data/curb/sample.json';
import { buildScenarioView } from '../../domain/curb';

const fixtures = { sample, empty } as const;

export function getScenarioResponse(dataset: unknown): {
  status: number;
  body: ScenarioResponse;
} {
  const selected = ScenarioDatasetSchema.safeParse(dataset ?? 'sample');
  if (!selected.success) {
    return {
      status: 404,
      body: ScenarioResponseSchema.parse({
        ok: false,
        error: { code: 'DATASET_NOT_FOUND', message: 'Unknown scenario dataset.' },
      }),
    };
  }

  try {
    const scenario = ScenarioSchema.parse(fixtures[selected.data]);
    const view = buildScenarioView(scenario);
    return {
      status: 200,
      body: ScenarioResponseSchema.parse({ ok: true, data: view }),
    };
  } catch {
    return {
      status: 500,
      body: ScenarioResponseSchema.parse({
        ok: false,
        error: { code: 'INVALID_SERVER_SCENARIO', message: 'The scenario dataset is invalid.' },
      }),
    };
  }
}
