export function GET() {
  return Response.json(
    { status: 'ready', mode: 'local', dependencies: [] },
    { headers: { 'cache-control': 'no-store' } },
  );
}
