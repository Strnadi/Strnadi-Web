import React, { Suspense } from "react";
import Loading from "@/components/loading";
import PopupLayout from "@/layouts/layout-popup";

export default function PopupText({ component }: { component: string }) {

  const Component = React.lazy(() => import(`../screens/texts/${component}.mdx`));

  return (
    <PopupLayout>
      <div className="flex flex-col gap-y-2">
        <Suspense fallback={<Loading />}><Component /></Suspense>
      </div>
    </PopupLayout>
  );
}
