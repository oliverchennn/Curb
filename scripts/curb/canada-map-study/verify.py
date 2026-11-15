#!/usr/bin/env python3
"""Independently verify the frozen conditional Cañada study using the standard library."""

import argparse
from collections import Counter, deque
from copy import deepcopy
import csv
from fractions import Fraction
from hashlib import sha256
from itertools import combinations
import io
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[3]
FROZEN_COMMIT = "53363bcf114abe7c08d062a281d441db806127a3"
MANIFEST_PATH = "research/curb/canada-map-study/input-manifest.json"
MANIFEST_HASH = "680ff922c2bce887bcd65752469525d2a6b6b48d1f968473406088b3456b13ea"
SPEC_PATH = "research/curb/canada-map-study/study-spec.json"
BASELINES = ("cheapest", "greedy", "bundleGreedy")
STRATEGIES = ("exact",) + BASELINES
SUMMARY_FIELDS = ("selectedRepairIds", "spendCents", "reachableDestinationIds", "newDestinationIds")


class VerificationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def normalized(raw):
    return raw.replace(b"\r\n", b"\n")


def digest(raw):
    return sha256(normalized(raw)).hexdigest()


def unique_object(items):
    obj = dict(items)
    require(len(obj) == len(items), "Duplicate JSON object key")
    return obj


def load_json(raw):
    return json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object)


def fields(actual, expected, location):
    require(isinstance(actual, dict), location + ": expected an object")
    require(set(actual) == set(expected), location + ": unexpected field set")


def equal(actual, expected, location):
    matches = type(actual) is type(expected) and actual == expected
    if matches and isinstance(actual, (list, dict)):
        # Python normally treats bool and int as equal, even in nested lists.
        matches = json.dumps(actual, sort_keys=True) == json.dumps(expected, sort_keys=True)
    if not matches:
        if isinstance(expected, bytes):
            raise VerificationError(location + ": receipt bytes differ")
        raise VerificationError("{}: expected {!r}, received {!r}".format(location, expected, actual))


def array(actual, count, location):
    require(isinstance(actual, list) and len(actual) == count,
            "{}: expected an array of length {}".format(location, count))


def read_inputs():
    manifest_raw = (ROOT / MANIFEST_PATH).read_bytes()
    equal(digest(manifest_raw), MANIFEST_HASH, MANIFEST_PATH + " SHA-256")
    manifest = load_json(manifest_raw)
    inputs = {}
    for entry in manifest["inputs"]:
        path = entry["path"]
        raw = (ROOT / path).read_bytes()
        equal(digest(raw), entry["sha256"], path + " SHA-256")
        inputs[path] = load_json(raw)

    spec = inputs[SPEC_PATH]
    topology = inputs[spec["inputPaths"]["topology"]]
    projects = inputs[spec["inputPaths"]["projects"]]["projects"]
    ids = spec["projectIds"]
    equal([p["id"] for p in projects], ids, "frozen projects")
    equal([p["costCents"] for p in projects], spec["projectCostCents"], "frozen costs")
    equal(sum(p["costCents"] for p in projects), spec["nominalTotalCents"], "nominal cost total")
    for project in projects:
        require(project["eligible"] is False and project["clearsObservationIds"] == [],
                project["id"] + ": the source inventory gate must remain in place")
        equal(project["currency"], spec["currency"], project["id"] + " currency")
        equal(project["baseYear"], spec["costBaseYear"], project["id"] + " cost base year")

    node_ids = [n["id"] for n in topology["nodes"]]
    source_edges = topology["edges"]
    known_edges = {edge["id"]: edge for edge in source_edges}
    require(len(set(node_ids)) == len(node_ids), "Duplicate source node")
    require(len(known_edges) == len(source_edges), "Duplicate source edge")
    for edge in source_edges:
        require(edge["from"] in node_ids and edge["to"] in node_ids,
                edge["id"] + ": missing node in source topology")
        equal(edge["accessAssessment"], "unknown", edge["id"] + " assessed access")
    endpoints = [spec["originNodeId"]] + spec["destinationNodeIds"]
    require(len(set(endpoints)) == len(endpoints) and set(endpoints).issubset(node_ids),
            "Invalid origin/destination selection in frozen topology")

    bundles = {}
    for index, project_id in enumerate(ids):
        edge_id = spec["projectToEdge"][project_id]
        require(known_edges[edge_id]["kind"] == "mapped-road-crossing",
                project_id + ": expected a mapped road crossing")
        bundles.setdefault(edge_id, []).append(index)
    equal(sorted(map(len, bundles.values())), [2, 2], "two frozen crossing bundles")
    excluded = set(spec["excludedEdgeIds"])
    transfer = spec["conditionalTransferEdgeId"]
    require(excluded.issubset(known_edges) and transfer in known_edges, "Unknown gate edge")
    known_edges = {key: edge for key, edge in known_edges.items() if key not in excluded}
    require(all(edge["kind"].startswith("mapped-") or key == transfer
                for key, edge in known_edges.items()), "An unbounded inferred edge survived exclusion")
    return manifest, spec, known_edges, bundles


def cost_variants(spec):
    costs = spec["projectCostCents"]
    nominal_budgets = spec["budgetCents"]
    yield "nominal", costs, nominal_budgets
    for index, name in enumerate(["all"] + spec["projectIds"], start=-1):
        for percent in spec["sensitivity"]["costMultipliersPercent"]:
            scaled = [(cents * percent + 50) // 100 if index in (-1, i) else cents
                      for i, cents in enumerate(costs)]
            yield "{}-{}".format(name, percent), scaled, nominal_budgets[1:-1]


def allowed_edges(spec, edges, bundles, scenario, selected):
    if not scenario["otherConditionsAssumedResolved"]:
        return {}
    result = {}
    for key, edge in edges.items():
        if key == spec["conditionalTransferEdgeId"] and not scenario["verticalTransferAssumed"]:
            continue
        if key in bundles and (not scenario["historicalMappingAssumed"]
                               or not set(bundles[key]).issubset(selected)):
            continue
        result[key] = (edge["from"], edge["to"])
    return result


def shortest_hops(origin, connections):
    adjacency = {}
    for left, right in connections.values():
        adjacency.setdefault(left, []).append(right)
        adjacency.setdefault(right, []).append(left)
    hops = {origin: 0}
    pending = deque([origin])
    while pending:
        node = pending.popleft()
        for neighbor in adjacency.get(node, []):
            if neighbor not in hops:
                hops[neighbor] = hops[node] + 1
                pending.append(neighbor)
    return hops


def scenario_subsets(spec, edges, bundles, scenario):
    project_count = len(spec["projectIds"])
    results = {}
    for count in range(project_count + 1):
        for selected in combinations(range(project_count), count):
            mask = sum(1 << i for i in selected)
            connections = allowed_edges(spec, edges, bundles, scenario, selected)
            hops = shortest_hops(spec["originNodeId"], connections)
            destinations = [d for d in spec["destinationNodeIds"] if d in hops]
            results[mask] = (selected, connections, hops, destinations)
    return results


def verify_witnesses(witnesses, destinations, hops, connections, origin, location):
    array(witnesses, len(destinations), location)
    seen = set()
    for index, witness in enumerate(witnesses):
        at = "{}[{}]".format(location, index)
        fields(witness, ("destinationId", "nodeIds", "edgeIds"), at)
        destination = witness["destinationId"]
        require(isinstance(destination, str) and destination in destinations and destination not in seen,
                at + ".destinationId: unexpected or repeated destination")
        seen.add(destination)
        node_ids = witness["nodeIds"]
        edge_ids = witness["edgeIds"]
        array(node_ids, hops[destination] + 1, at + ".nodeIds")
        array(edge_ids, hops[destination], at + ".edgeIds")
        require(all(isinstance(node, str) for node in node_ids) and len(set(node_ids)) == len(node_ids),
                at + ".nodeIds: invalid or repeated node")
        equal(node_ids[0], origin, at + ".nodeIds origin")
        equal(node_ids[-1], destination, at + ".nodeIds destination")
        for hop, edge_id in enumerate(edge_ids):
            hop_at = "{}.edgeIds[{}]".format(at, hop)
            require(isinstance(edge_id, str) and edge_id in connections,
                    hop_at + ": excluded, unknown, or unavailable")
            require(set(connections[edge_id]) == {node_ids[hop], node_ids[hop + 1]},
                    hop_at + ": does not connect the listed nodes")


def compare_summary(actual, expected, location):
    for field in SUMMARY_FIELDS:
        equal(actual[field], expected[field], location + "." + field)


def gains(row):
    return len(row["newDestinationIds"])


def rank_exact(row):
    ids = row["selectedRepairIds"]
    return (-gains(row), row["spendCents"], len(ids), tuple(ids))


def purchase_mask(indices):
    return sum(1 << i for i in indices)


def cheapest_purchase(costs, ids, budget):
    selected = []
    remaining = budget
    for i in sorted(range(len(ids)), key=lambda i: (costs[i], ids[i])):
        if costs[i] <= remaining:
            selected.append(i)
            remaining -= costs[i]
    return selected


def marginal_purchase(units, costs, ids, budget, subsets):
    selected = []
    spent = 0
    remaining_units = list(units)
    while remaining_units:
        current_gain = gains(subsets[purchase_mask(selected)])
        choices = []
        for unit in remaining_units:
            cost = sum(costs[i] for i in unit)
            if spent + cost <= budget:
                with_unit = purchase_mask(selected + list(unit))
                added = gains(subsets[with_unit]) - current_gain
                ordered_ids = tuple(ids[i] for i in unit)
                choices.append((-Fraction(added, cost), -added, cost, ordered_ids, unit))
        if not choices:
            break
        _, _, cost, _, chosen = min(choices)
        selected.extend(chosen)
        spent += cost
        remaining_units.remove(chosen)
    return selected


def frontier(subsets):
    # Scan by increasing spend. A higher (or equal) gain already seen dominates
    # any later row. Sort equal spends by gain and the canonical tie order.
    order = sorted(subsets, key=lambda mask: (subsets[mask]["spendCents"], rank_exact(subsets[mask])))
    result = []
    best_gain = -1
    for mask in order:
        gain = gains(subsets[mask])
        if gain > best_gain:
            result.append(mask)
            best_gain = gain
    return result


def verify_strategy(actual, indices, ids, subsets, counts, location):
    fields(actual, SUMMARY_FIELDS + ("subsetMask", "withoutRepair"), location)
    mask = purchase_mask(indices)
    expected = dict(subsets[mask])
    expected["selectedRepairIds"] = [ids[i] for i in indices]
    compare_summary(actual, expected, location)
    equal(actual["subsetMask"], mask, location + ".subsetMask")
    omissions = [{"removedRepairId": ids[i], "subsetMask": mask ^ (1 << i)} for i in indices]
    equal(actual["withoutRepair"], omissions, location + ".withoutRepair")
    for omission in omissions:
        require(omission["subsetMask"] in subsets, location + ": missing omission result")
    counts["selectionOmissions"] += len(omissions)
    counts["strategyResults"] += 1


def verify_variant(variant, variant_id, costs, budgets, spec, topology_results, bundles, counts, location):
    fields(variant, ("id", "projectCostCents", "baselineDestinationIds", "subsets",
                     "singletons", "fullSetOmissions", "paretoFrontier", "budgets"), location)
    equal(variant["id"], variant_id, location + ".id")
    equal(variant["projectCostCents"], costs, location + ".projectCostCents")
    baseline = topology_results[0][3]
    equal(variant["baselineDestinationIds"], baseline, location + ".baselineDestinationIds")
    ids = spec["projectIds"]
    subset_count = len(topology_results)
    array(variant["subsets"], subset_count, location + ".subsets")
    computed = {}
    for mask, subset in enumerate(variant["subsets"]):
        at = "{}.subsets[{}]".format(location, mask)
        fields(subset, SUMMARY_FIELDS + ("mask", "witnesses"), at)
        selected, connections, hops, destinations = topology_results[mask]
        row = {
            "selectedRepairIds": [ids[i] for i in selected],
            "spendCents": sum(costs[i] for i in selected),
            "reachableDestinationIds": destinations,
            "newDestinationIds": [d for d in destinations if d not in baseline],
        }
        computed[mask] = row
        equal(subset["mask"], mask, at + ".mask")
        compare_summary(subset, row, at)
        verify_witnesses(subset["witnesses"], destinations, hops, connections,
                         spec["originNodeId"], at + ".witnesses")
        counts["subsets"] += 1
        counts["witnesses"] += len(destinations)

    equal(variant["singletons"],
          [{"repairId": project, "subsetMask": 1 << i} for i, project in enumerate(ids)],
          location + ".singletons")
    equal(variant["fullSetOmissions"],
          [{"removedRepairId": project, "subsetMask": (subset_count - 1) ^ (1 << i)}
           for i, project in enumerate(ids)], location + ".fullSetOmissions")
    counts["singletonProjections"] += len(ids)
    counts["fullSetOmissions"] += len(ids)
    equal(variant["paretoFrontier"], frontier(computed), location + ".paretoFrontier")
    counts["frontiers"] += 1

    units = [(i,) for i in range(len(ids))]
    grouped = [tuple(sorted(group, key=lambda i: ids[i])) for group in bundles.values()]
    array(variant["budgets"], len(budgets), location + ".budgets")
    comparisons = {name: Counter(wins=0, ties=0, losses=0) for name in BASELINES}
    for index, budget in enumerate(budgets):
        record = variant["budgets"][index]
        at = "{}.budgets[{}]".format(location, index)
        fields(record, ("budgetCents", "enumeratedSubsetCount", "feasibleSubsetCount", "strategies"), at)
        equal(record["budgetCents"], budget, at + ".budgetCents")
        equal(record["enumeratedSubsetCount"], subset_count, at + ".enumeratedSubsetCount")
        feasible = [mask for mask, row in computed.items() if row["spendCents"] <= budget]
        equal(record["feasibleSubsetCount"], len(feasible), at + ".feasibleSubsetCount")
        best_mask = min(feasible, key=lambda mask: rank_exact(computed[mask]))
        picks = {
            "exact": list(topology_results[best_mask][0]),
            "cheapest": cheapest_purchase(costs, ids, budget),
            "greedy": marginal_purchase(units, costs, ids, budget, computed),
            "bundleGreedy": marginal_purchase(grouped, costs, ids, budget, computed),
        }
        fields(record["strategies"], STRATEGIES, at + ".strategies")
        for name in STRATEGIES:
            verify_strategy(record["strategies"][name], picks[name], ids, computed,
                            counts, at + ".strategies." + name)
        for name in BASELINES:
            delta = gains(computed[best_mask]) - gains(computed[purchase_mask(picks[name])])
            comparisons[name]["wins" if delta > 0 else "ties" if delta == 0 else "losses"] += 1
        counts["budgetCases"] += 1
    counts["scenarioCostVariants"] += 1
    return comparisons


def verify_results(report, manifest, spec, edges, bundles):
    fields(report, ("schemaVersion", "studyId", "disposition", "inputHashes", "originNodeId",
                    "destinationNodeIds", "projectIds", "freezeCommit", "kernelCommit", "scenarios"), "results")
    equal(report["freezeCommit"], FROZEN_COMMIT, "results.freezeCommit")
    equal(report["kernelCommit"], spec["baseCommit"], "results.kernelCommit")
    for field in ("schemaVersion", "studyId", "disposition", "originNodeId", "destinationNodeIds", "projectIds"):
        equal(report[field], spec[field], "results." + field)
    equal(report["inputHashes"], manifest["inputs"], "results.inputHashes")
    variants = list(cost_variants(spec))
    counts = Counter(scenarios=len(spec["scenarios"]), distinctCostVariants=len(variants))
    nominal_comparisons = {}
    array(report["scenarios"], len(spec["scenarios"]), "results.scenarios")
    for actual, scenario in zip(report["scenarios"], spec["scenarios"]):
        scenario_fields = ("id", "otherConditionsAssumedResolved",
                           "historicalMappingAssumed", "verticalTransferAssumed")
        location = "scenarios." + scenario["id"]
        fields(actual, scenario_fields + ("variants",), location)
        for field in scenario_fields:
            equal(actual[field], scenario[field], location + "." + field)
        subsets = scenario_subsets(spec, edges, bundles, scenario)
        array(actual["variants"], len(variants), location + ".variants")
        for actual_variant, (variant_id, costs, budgets) in zip(actual["variants"], variants):
            comparison = verify_variant(actual_variant, variant_id, costs, budgets, spec, subsets,
                                        bundles, counts, location + ".variants." + variant_id)
            if variant_id == "nominal":
                nominal_comparisons[scenario["id"]] = comparison
    return counts, nominal_comparisons


def verify_csv(raw, report):
    reader = csv.reader(io.StringIO(raw.decode("utf-8"), newline=""), strict=True)
    header = ["scenarioId", "variantId", "budgetCents", "strategy", "spendCents",
              "selectedRepairIds", "baselineDestinationIds", "newDestinationIds",
              "reachableDestinationIds", "newDestinationCount", "subsetMask",
              "enumeratedSubsetCount", "feasibleSubsetCount"]
    equal(next(reader, None), header, "results.csv header")
    row_count = 0
    for scenario in report["scenarios"]:
        for variant in scenario["variants"]:
            for budget in variant["budgets"]:
                for strategy in STRATEGIES:
                    selection = budget["strategies"][strategy]
                    cells = [scenario["id"], variant["id"], str(budget["budgetCents"]), strategy,
                             str(selection["spendCents"])]
                    cells.extend(json.dumps(values, separators=(",", ":")) for values in (
                        selection["selectedRepairIds"], variant["baselineDestinationIds"],
                        selection["newDestinationIds"], selection["reachableDestinationIds"],
                    ))
                    cells.extend(str(value) for value in (
                        len(selection["newDestinationIds"]), selection["subsetMask"],
                        budget["enumeratedSubsetCount"], budget["feasibleSubsetCount"],
                    ))
                    row_count += 1
                    equal(next(reader, None), cells, "results.csv row " + str(row_count + 1))
    equal(next(reader, None), None, "results.csv trailing rows")
    return row_count


def prove_rejection(report, manifest, spec, edges, bundles):
    altered_spend = deepcopy(report)
    altered_spend["scenarios"][0]["variants"][0]["budgets"][0]["strategies"]["exact"]["spendCents"] += 1
    altered_witness = deepcopy(report)
    witness = next(w for scenario in altered_witness["scenarios"] for variant in scenario["variants"]
                   for subset in variant["subsets"] for w in subset["witnesses"] if w["edgeIds"])
    witness["edgeIds"][0] = spec["excludedEdgeIds"][0]
    rejected = {}
    for name, invalid, location in (
        ("changedStrategySpend", altered_spend, ".strategies.exact.spendCents"),
        ("excludedWitnessEdge", altered_witness, ".edgeIds[0]"),
    ):
        try:
            verify_results(invalid, manifest, spec, edges, bundles)
        except VerificationError as error:
            require(location in str(error), "Wrong rejection reason: " + str(error))
            rejected[name] = str(error)
        else:
            raise VerificationError("Failed to reject deliberate tampering: " + name)
    return rejected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Compare against the existing deterministic receipt without writing.")
    options = parser.parse_args()
    try:
        manifest, spec, edges, bundles = read_inputs()
        result_path = ROOT / spec["artifacts"]["results"]
        raw_report = result_path.read_bytes()
        report = load_json(raw_report)
        counts, comparisons = verify_results(report, manifest, spec, edges, bundles)
        csv_bytes = result_path.with_name("results.csv").read_bytes()
        counts["csvRows"] = verify_csv(csv_bytes, report)
        receipt = {
            "schemaVersion": 1,
            "studyId": spec["studyId"],
            "status": "passed",
            "scope": "Independent BFS and exhaustive-subset verification of the frozen conditional model.",
            "frozenCommit": FROZEN_COMMIT,
            "kernelCommit": spec["baseCommit"],
            "inputManifestSha256": MANIFEST_HASH,
            "inputHashes": manifest["inputs"],
            "resultsSha256Lf": digest(raw_report),
            "resultsCsvSha256Lf": digest(csv_bytes),
            "checks": dict(counts),
            "nominalExactVersusBaselines": comparisons,
            "tamperRejection": prove_rejection(report, manifest, spec, edges, bundles),
        }
        serialized = (json.dumps(receipt, indent=2, sort_keys=True) + "\n").encode("utf-8")
        output = ROOT / spec["artifacts"]["verification"]
        if options.check:
            equal(normalized(output.read_bytes()), serialized, "deterministic verification receipt")
        else:
            output.write_bytes(serialized)
        print("Verified {subsets} subsets, {budgetCases} budget cases, {strategyResults} strategy "
              "results and {witnesses} witnesses; rejected both deliberate corruptions.".format(**counts))
        return 0
    except (OSError, ValueError, KeyError, TypeError, csv.Error) as error:
        print("Verification failed: {}".format(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
