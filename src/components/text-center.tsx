import React, { Suspense } from "react";
import Loading from "@/components/loading";
import CenterLayout from "@/layouts/layout-center";

export default function CenterText({ component }: { component: string }) {

  const Component = React.lazy(() => import(`../screens/texts/${component}.mdx`));

  return (
    <CenterLayout>
      <div className="flex flex-col gap-y-2">
        <Suspense fallback={<Loading />}><Component /></Suspense>
      </div>
    </CenterLayout>
  );
}
