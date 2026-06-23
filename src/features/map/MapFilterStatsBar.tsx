type MapFilterStatsBarProps = {
  propertyCount: number;
  complexCount: number;
  fullScreen?: boolean;
};

export function MapFilterStatsBar({ propertyCount, complexCount, fullScreen = false }: MapFilterStatsBarProps) {
  return (
    <div
      className={
        fullScreen
          ? "property-map-stats-bar pointer-events-none absolute left-1/2 z-[2] -translate-x-1/2"
          : "property-map-stats-bar pointer-events-none mx-auto mt-2 w-fit"
      }
      style={
        fullScreen
          ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }
          : undefined
      }
    >
      <div className="property-map-stats-bar-inner pointer-events-auto">
        <p className="property-map-stats-item">
          <span className="property-map-stats-label">매물</span>
          <span className="property-map-stats-value">{propertyCount.toLocaleString("ko-KR")}</span>
        </p>
        <span className="property-map-stats-divider" aria-hidden="true" />
        <p className="property-map-stats-item">
          <span className="property-map-stats-label">단지</span>
          <span className="property-map-stats-value">{complexCount.toLocaleString("ko-KR")}</span>
        </p>
      </div>
    </div>
  );
}
