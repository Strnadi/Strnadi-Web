import Loading from "@/components/loading";
import SegmentedProgressBar from "@/components/segmented-progress";
import PopupLayout from "@/layouts/layout-popup";
import { useRegisterState } from "@/state/store";
import React, { Suspense } from "react";

import '@/styling/buttons.css'

const componentFiles: Record<number, string> = {
  1: 'email',
  2: 'emailVerify',
  3: 'personalInfo',
  4: 'password',
  5: 'location',
  6: 'agree',
  7: 'finalConfirm'
};

export default function Register() {

  const stage = useRegisterState(state => state.stage);
  const resetRegisterState = useRegisterState(state => state.resetStage);

  const Component = React.lazy(() => import(`./register/${componentFiles[stage]}.tsx`));

  const totalSegments = React.useMemo(() => Object.keys(componentFiles).length, []);

  return (
    <PopupLayout onClose={resetRegisterState}>
      <Suspense fallback={<Loading />}>
        <Component />
        <SegmentedProgressBar totalSegments={totalSegments} progress={stage} />
      </Suspense>
    </PopupLayout>
  );

};
