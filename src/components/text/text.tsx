import React, { Suspense } from "react";
import Loading from "@/components/loading";
import LeftLayout from "../../layouts/layout-left";

export default function Text({ component }: { component: string }) {

  const Component = React.lazy(() => import(`../../screens/texts/${component}.mdx`));

  return (
    <LeftLayout>
      <div className="flex flex-col gap-y-2 [&_li]:text-gray-500 [&_ol]:list-decimal [&_ol]:list-inside [&_li]:marker:text-2xl">
        <Suspense fallback={<Loading />}><Component /></Suspense>
      </div>
    </LeftLayout>
  );
}
