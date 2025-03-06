import Loading from "@/components/loading";
import CenterLayout from "@/layouts/layout-center";
import PopupLayout from "@/layouts/layout-popup";
import { useRecordingState, useRegisterState } from "@/store";
import React, { Suspense } from "react";

const componentFiles: Record<number, string> = {
  1: 'upload-file',
  2: 'add-dialect',
  3: 'add-location',
  4: 'add-info',
  5: 'add-photos',
  6: 'finalConfirm'
};

export default function AddRecording() {

  const stage = useRecordingState(state => state.stage);

  const Component = React.lazy(() => import(`./add-recording/${componentFiles[stage]}.tsx`));

  return (
    <CenterLayout>
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </CenterLayout>
  );

};
