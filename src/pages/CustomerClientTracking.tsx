 
import { useParams } from "react-router-dom";
 
export default function CustomerClientTracking() {
  const { deliveryId } = useParams<{ deliveryId: string }>();


  return ( 
    <div></div>
  );
}
