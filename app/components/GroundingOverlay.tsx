import type { GroundingRegion } from '../types';

export function GroundingOverlay({
  src,
  regions,
  blocked,
  analyzed,
  alt,
}: {
  src: string;
  regions: GroundingRegion[];
  blocked: boolean;
  analyzed: boolean;
  alt: string;
}) {
  return (
    <div className={`photo-frame${blocked ? ' is-blocked' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
      {regions.map((region, index) => {
        const [ymin, xmin, ymax, xmax] = region.box_2d;
        return (
          <div
            key={`${region.label}-${index}`}
            className={`ground-box severity-${region.severity}`}
            style={{
              top: `${ymin / 10}%`,
              left: `${xmin / 10}%`,
              width: `${(xmax - xmin) / 10}%`,
              height: `${(ymax - ymin) / 10}%`,
            }}
            title={`${region.label} (${region.severity} severity)`}
          >
            <span>{region.label}</span>
          </div>
        );
      })}
      {analyzed && regions.length === 0 && <span className="no-marker">No validated marker</span>}
    </div>
  );
}
