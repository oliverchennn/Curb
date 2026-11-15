import { campusIndex } from '../../../data/curb/princeton-campus/adapter';

export const OSM_COPYRIGHT = campusIndex.source.copyrightUrl;

/** Visible OpenStreetMap attribution, shown wherever OSM geometry is drawn (map corner and footer). */
export function OsmCredit({ offerDownload = false }: { offerDownload?: boolean }) {
  return <>
    <span>Map data <a href={OSM_COPYRIGHT} target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · ODbL</span>
    {offerDownload && <a href="/curb/explore/campus-data" download>Download OSM campus data (JSON)</a>}
  </>;
}
