import campus from '../../../../src/data/curb/princeton-campus/campus.json';
import sectionIndex from '../../../../src/data/curb/princeton-campus/campus-index.json';
import provenance from '../../../../src/data/curb/princeton-campus/provenance.json';

export const dynamic = 'force-static';

export function GET() {
  return Response.json({ campus, sectionIndex, provenance }, {
    headers: {
      'cache-control': 'public, max-age=0, must-revalidate',
      'content-disposition': 'attachment; filename="princeton-campus-osm.json"',
      link: '<https://opendatacommons.org/licenses/odbl/1-0/>; rel="license"',
    },
  });
}
