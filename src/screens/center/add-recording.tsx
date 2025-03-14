import Loading from "@/components/loading";
import SegmentedProgressBar from "@/components/segmented-progress";
import CenterLayout from "@/layouts/layout-center";
import { useRecordingState } from "@/state/store";
import React, { Suspense } from "react";

const componentFiles: Record<number, string> = {
  1: 'upload-file',
  2: 'photos',
  3: 'add-location',
  4: 'add-dialect',
  5: 'add-info',
  6: 'final-confirm',
  7: 'upload'
};

export default function AddRecording() {

  const stage = useRecordingState(state => state.stage);
  const resetRecordingState = useRecordingState(state => state.resetStage);

  const Component = React.lazy(() => import(`./add-recording/${componentFiles[stage]}.tsx`));
  const total = React.useMemo(() => Object.keys(componentFiles).length, []);

  return (
    <CenterLayout onClose={resetRecordingState}>
      <div className="flex flex-col items-center">
        <Suspense fallback={<Loading />}>
          <Component />
        </Suspense>
        <SegmentedProgressBar progress={stage} totalSegments={total} />
      </div>
    </CenterLayout>
  );

};
