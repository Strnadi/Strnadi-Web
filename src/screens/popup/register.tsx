import Loading from "@/components/loading";
import PopupLayout from "@/layouts/layout-popup";
import { useRegisterState } from "@/state/store";
import React, { Suspense } from "react";

const componentFiles: Record<number, string> = {
  1: 'email',
  2: 'emailVerify',
  3: 'personalInfo',
  4: 'password',
  5: 'location',
  6: 'finalConfirm'
};

export default function Register() {

  const stage = useRegisterState(state => state.stage);

  const Component = React.lazy(() => import(`./register/${componentFiles[stage]}.tsx`));

  return (
    <PopupLayout>
      <h1 className='text-2xl font-bold'>Registrace</h1>
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </PopupLayout>
  );

};
