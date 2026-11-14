"""Independent runtime oracle for the bounded R1 synthetic graph; no product edits."""
import itertools
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get('CURB_VERIFY_URL', 'http://127.0.0.1:3000')
OUT = Path('/workspace/scratch/curb-r1-verification')
OUT.mkdir(exist_ok=True)

def call(path, data=None):
    request = urllib.request.Request(
        BASE + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={} if data is None else {'Content-Type': 'application/json'},
    )
    try:
        response = urllib.request.urlopen(request, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, {key.lower(): value for key, value in response.headers.items()}, json.loads(response.read())

status, headers, envelope = call('/api/curb/trip-scenario')
assert status == 200 and envelope['ok'] is True
assert headers.get('cache-control', '').lower() == 'no-store'
context = envelope['data']
scenario = context['scenario']
edges = {edge['id']: edge for edge in scenario['edges']}
assessments = {item['edgeId']: item for item in context['edgeAssessments']}
destinations = {item['id']: item['nodeId'] for item in scenario['destinations']}
repairs = {item['id']: item['barrierId'] for item in context['repairs']}
outgoing = {node['id']: [] for node in scenario['nodes']}
for edge in edges.values():
    outgoing[edge['fromNodeId']].append((edge['id'], edge['toNodeId']))
    if edge['bidirectional']:
        outgoing[edge['toNodeId']].append((edge['id'], edge['fromNodeId']))

def paths(origin, target):
    def visit(node, node_path, edge_path, distance):
        if node == target:
            yield node_path, edge_path, distance
            return
        for edge_id, next_node in outgoing[node]:
            if next_node not in node_path:
                yield from visit(next_node, node_path + [next_node], edge_path + [edge_id], distance + edges[edge_id]['lengthMeters'])
    return list(visit(origin, [origin], [], 0))

def classify(origin, target, repair_id):
    all_paths = paths(origin, target)
    cleared = repairs.get(repair_id)
    def edge_state(edge_id):
        assessment = assessments[edge_id]
        remaining = [item for item in assessment['blockingBarrierIds'] if item != cleared]
        if remaining:
            return 'blocked'
        return 'unknown' if assessment['status'] == 'unknown' else 'pass'
    passing = [path for path in all_paths if all(edge_state(edge) == 'pass' for edge in path[1])]
    if passing:
        return 'reachable', min(path[2] for path in passing)
    if any(all(edge_state(edge) != 'blocked' for edge in path[1]) for path in all_paths):
        return 'unknown', None
    return ('blocked' if all_paths else 'disconnected'), None

rows = []
for origin, destination, repair in itertools.product(outgoing, destinations, [None, *repairs]):
    request = {
        'contractVersion': 'curb-r1', 'scenarioId': scenario['id'],
        'revision': scenario['revision'], 'profileId': context['profile']['id'],
        'originNodeId': origin, 'destinationId': destination, 'repairId': repair,
    }
    status, headers, body = call('/api/curb/trip', request)
    assert status == 200 and body['ok'] is True, (request, status, body)
    assert headers.get('cache-control', '').lower() == 'no-store'
    result = body['data']
    assert all(result[key] == value for key, value in request.items())
    for phase, applied in [('before', None), ('after', repair)]:
        expected_status, distance = classify(origin, destinations[destination], applied)
        actual = result[phase]
        assert actual['status'] == expected_status, (request, phase, actual, expected_status)
        if expected_status == 'reachable':
            assert abs(actual['distanceMeters'] - distance) < 1e-8, (request, phase, actual, distance)
            assert actual['nodeIds'][0] == origin and actual['nodeIds'][-1] == destinations[destination]
            assert len(actual['nodeIds']) == len(actual['edgeIds']) + 1
            computed_length = 0
            for start, end, edge_id in zip(actual['nodeIds'], actual['nodeIds'][1:], actual['edgeIds']):
                edge = edges[edge_id]
                assert (start, end) == (edge['fromNodeId'], edge['toNodeId']) or (edge['bidirectional'] and (end, start) == (edge['fromNodeId'], edge['toNodeId']))
                assessment = assessments[edge_id]
                assert assessment['status'] != 'unknown'
                assert all(blocker == repairs.get(applied) for blocker in assessment['blockingBarrierIds'])
                computed_length += edge['lengthMeters']
            assert abs(computed_length - distance) < 1e-8
        else:
            assert not any(key in actual for key in ('nodeIds', 'edgeIds', 'distanceMeters'))
    rows.append({'origin': origin, 'destination': destination, 'repair': repair, 'before': result['before']['status'], 'after': result['after']['status']})

request = {
    'contractVersion': 'curb-r1', 'scenarioId': scenario['id'],
    'revision': scenario['revision'], 'profileId': context['profile']['id'],
    **context['defaults'], 'repairId': None,
}
for change, expected_status, expected_code in [
    ({'revision': scenario['revision'] + 1}, 409, 'STALE_SCENARIO'),
    ({'scenarioId': 'not-a-scenario'}, 404, 'SCENARIO_NOT_FOUND'),
    ({'originNodeId': 'not-a-node'}, 400, 'INVALID_REQUEST'),
    ({'destinationId': 'not-a-destination'}, 400, 'INVALID_REQUEST'),
    ({'repairId': 'not-a-repair'}, 400, 'INVALID_REQUEST'),
    ({'profileId': 'not-a-profile'}, 400, 'INVALID_REQUEST'),
]:
    status, _, body = call('/api/curb/trip', {**request, **change})
    assert status == expected_status and body['error']['code'] == expected_code, (change, status, body)
assert call('/api/curb/trip-scenario')[2] == envelope, 'Evaluation mutated the original context'
assert call('/api/curb/scenario?dataset=sample')[2]['data']['counts'] == {'nodes': 9, 'edges': 12, 'destinations': 3, 'barriers': 4, 'evidence': 5}
(OUT / 'api-oracle.json').write_text(json.dumps({'baseUrl': BASE, 'scenarioId': scenario['id'], 'requests': len(rows), 'comparisons': rows, 'badRequests': 'passed', 'immutability': 'passed', 'foundation': 'passed'}, indent=2))
print(f'PASS {len(rows)} actual API comparisons against independent exhaustive simple-path oracle; invalid requests, no-store, immutability and foundation counts')
