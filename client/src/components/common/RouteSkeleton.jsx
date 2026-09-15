import "./RouteSkeleton.css";

const RouteSkeleton = () => {
  return (
    <div className="route-skeleton-page" role="status" aria-live="polite">
      <div className="route-skeleton-shell">
        <div className="route-skeleton-header">
          <div className="route-skeleton-logo route-skeleton-pulse" />
          <div className="route-skeleton-title">
            <div className="route-skeleton-line route-skeleton-line-wide route-skeleton-pulse" />
            <div className="route-skeleton-line route-skeleton-line-small route-skeleton-pulse" />
          </div>
        </div>

        <div className="route-skeleton-content">
          <div className="route-skeleton-card route-skeleton-pulse" />
          <div className="route-skeleton-card route-skeleton-pulse" />
          <div className="route-skeleton-card route-skeleton-pulse" />
        </div>

        <div className="route-skeleton-panel">
          <div className="route-skeleton-line route-skeleton-line-wide route-skeleton-pulse" />
          <div className="route-skeleton-line route-skeleton-line-medium route-skeleton-pulse" />
          <div className="route-skeleton-block route-skeleton-pulse" />
        </div>
      </div>
      <span className="route-skeleton-sr-only">Loading page…</span>
    </div>
  );
};

export default RouteSkeleton;
