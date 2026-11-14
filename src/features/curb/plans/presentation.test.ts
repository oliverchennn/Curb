import { describe, expect, it } from 'vitest';
import type { PlanComparison, PlanRequest } from '../../../contracts/curb/plans';
import planDemo from '../../../data/curb/plan-demo.json';
import { comparePlans, validatePlanScenario } from '../../../domain/curb/plans';
import {
  centsToInput,
  conditionSteps,
  destinationRows,
  formatCents,
  parseBudgetInput,
  repairRoles,
} from './presentation';

// The test (not the browser module) evaluates the authored fixture through the
// B domain so presentation helpers are checked against real server-shaped output.
const context = validatePlanScenario(planDemo);
function compareAt(budgetCents: number): PlanComparison {
  const request: PlanRequest = {
    contractVersion: 'curb-r2',
    scenarioId: context.scenario.id,
    revision: context.scenario.revision,
    profileId: context.profile.id,
    originNodeId: context.originNodeId,
    budgetCents,
  };
  return comparePlans(context, request);
}

describe('parseBudgetInput', () => {
  it('parses dollar amounts into exact integer cents', () => {
    expect(parseBudgetInput('4')).toEqual({ ok: true, cents: 400 });
    expect(parseBudgetInput('4.00')).toEqual({ ok: true, cents: 400 });
    expect(parseBudgetInput(' $4.5 ')).toEqual({ ok: true, cents: 450 });
    expect(parseBudgetInput('0')).toEqual({ ok: true, cents: 0 });
    expect(parseBudgetInput('0.07')).toEqual({ ok: true, cents: 7 });
    expect(parseBudgetInput('1,234.56')).toEqual({ ok: true, cents: 123456 });
    expect(parseBudgetInput('4.')).toEqual({ ok: true, cents: 400 });
  });

  it('rejects fractional cents instead of rounding', () => {
    const result = parseBudgetInput('4.005');
    expect(result.ok).toBe(false);
    expect(parseBudgetInput('0.001').ok).toBe(false);
  });

  it('rejects empty, negative, non-numeric and unsafe input', () => {
    for (const input of ['', '   ', '-1', 'four', '4e2', '1,23', '.5', '0x10', 'Infinity']) {
      expect(parseBudgetInput(input).ok, input).toBe(false);
    }
    expect(parseBudgetInput('90071992547409.91')).toEqual({ ok: true, cents: Number.MAX_SAFE_INTEGER });
    expect(parseBudgetInput('90071992547409.92').ok).toBe(false);
  });
});

describe('formatCents', () => {
  it('formats exact USD without floating-point division', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(7)).toBe('$0.07');
    expect(formatCents(400)).toBe('$4.00');
    expect(formatCents(123456)).toBe('$1,234.56');
    expect(formatCents(Number.MAX_SAFE_INTEGER)).toBe('$90,071,992,547,409.91');
    expect(centsToInput(123456)).toBe('1234.56');
    expect(parseBudgetInput(centsToInput(Number.MAX_SAFE_INTEGER))).toEqual({ ok: true, cents: Number.MAX_SAFE_INTEGER });
  });
});

describe('fixture-backed presentation', () => {
  it('explains A+B as companions and C as independent at the default budget', () => {
    const comparison = compareAt(context.defaultBudgetCents);
    expect(comparison.exact.selectedRepairIds).toEqual(['repair-a', 'repair-b']);
    expect(comparison.conditionFirst.selectedRepairIds).toEqual(['repair-c']);

    const exactRoles = repairRoles(comparison, comparison.exact);
    for (const role of exactRoles) {
      expect(role.kind).toBe('companion');
      expect(role.aloneRestores).toEqual([]);
      expect(role.needsCompanions).toEqual(['library', 'student-center']);
    }
    expect(repairRoles(comparison, comparison.conditionFirst)).toEqual([{
      repairId: 'repair-c', aloneRestores: ['hall'], lostWithout: ['hall'], needsCompanions: [], kind: 'independent',
    }]);
  });

  it('narrates condition-first order with skips for unaffordable repairs', () => {
    const steps = conditionSteps(compareAt(context.defaultBudgetCents));
    expect(steps.map(({ repairId, selected, remainingBeforeCents }) => [repairId, selected, remainingBeforeCents])).toEqual([
      ['repair-c', true, 400],
      ['repair-a', false, 0],
      ['repair-b', false, 0],
    ]);
  });

  it('keeps already reachable, unknown and disconnected destinations distinct', () => {
    const rows = destinationRows(compareAt(context.defaultBudgetCents));
    const byId = Object.fromEntries(rows.map((row) => [row.destinationId, row]));
    expect(rows.map(({ destinationId }) => destinationId)).toEqual(context.destinationIds);
    expect(byId.cafe).toMatchObject({ baseline: 'reachable', exactRestored: false, conditionFirstRestored: false });
    expect(byId.studio).toMatchObject({ baseline: 'unknown', exact: 'unknown', conditionFirst: 'unknown' });
    expect(byId.archive).toMatchObject({ baseline: 'disconnected', exact: 'disconnected' });
    expect(byId.library).toMatchObject({ baseline: 'blocked', exact: 'reachable', exactRestored: true, conditionFirst: 'blocked' });
    expect(byId.hall).toMatchObject({ conditionFirst: 'reachable', conditionFirstRestored: true, exactRestored: false });
  });

  it('handles a zero budget with no affordable repairs', () => {
    const comparison = compareAt(0);
    expect(comparison.exact.selectedRepairIds).toEqual([]);
    expect(repairRoles(comparison, comparison.exact)).toEqual([]);
    expect(conditionSteps(comparison).every(({ selected }) => !selected)).toBe(true);
    expect(destinationRows(comparison).some((row) => row.exactRestored || row.conditionFirstRestored)).toBe(false);
  });

  it('marks repairs with no added effect when a larger budget selects all of them', () => {
    const comparison = compareAt(800);
    expect(comparison.conditionFirst.selectedRepairIds).toEqual(['repair-c', 'repair-a', 'repair-b']);
    const kinds = Object.fromEntries(repairRoles(comparison, comparison.conditionFirst).map((role) => [role.repairId, role.kind]));
    expect(kinds).toEqual({ 'repair-c': 'independent', 'repair-a': 'companion', 'repair-b': 'companion' });
  });
});
