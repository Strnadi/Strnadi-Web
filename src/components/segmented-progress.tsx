const SegmentedProgressBar = ({ progress = 1.0, totalSegments = 4 }) => {
  // progress: number of “filled” steps (can be fractional, e.g., 1.5)
  // totalSegments: total number of segments (default 4)

  // Build an array [0, 1, 2, ... totalSegments-1] for each segment
  const segments = Array.from({ length: totalSegments }, (_, i) => i);

  return (
    <div className="segmented-progress-bar">
      {segments.map((segmentIndex) => {
        // Each segment covers the "range" [segmentIndex, segmentIndex + 1)
        // We'll calculate how much of that segment should be filled.

        // If progress is less than this segment's start, fill = 0
        // If progress is beyond this segment's end, fill = 1 (fully filled)
        // Otherwise, fill = (progress - segmentIndex) for partial fill

        let fillAmount = 0;
        if (progress <= segmentIndex) {
          fillAmount = 0;
        } else if (progress >= segmentIndex + 1) {
          fillAmount = 1;
        } else {
          fillAmount = progress - segmentIndex;
        }

        return (
          <div key={segmentIndex} className="segment">
            <div
              className="segment-fill"
              style={{ width: `${fillAmount * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default SegmentedProgressBar;
