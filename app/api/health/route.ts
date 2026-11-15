export function GET() {
  // Direct CLI uploads can have an empty Git integration variable. Fall back
  // to the explicitly supplied source revision instead of returning "".
  const revision = process.env.VERCEL_GIT_COMMIT_SHA?.trim()
    || process.env.APP_REVISION?.trim()
    || (process.env.VERCEL === '1' ? 'unknown' : 'local');
  return Response.json(
    {
      status: 'alive',
      service: 'web',
      revision,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
