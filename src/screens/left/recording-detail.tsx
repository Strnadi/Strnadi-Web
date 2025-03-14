import LeftLayout from "@/layouts/layout-left";
import { useParams } from "react-router";

export default function RecordingDetail() {

  const params = useParams();

  return (
    <LeftLayout>
      <div>
        { params.id }
      </div>
    </LeftLayout>
  );

}
