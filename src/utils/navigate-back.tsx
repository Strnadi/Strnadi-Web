import { NavigateFunction } from "react-router";

export default function navigateBack(navigate: NavigateFunction) {

  if ((window.history?.length && window.history.length > 1) || window.history.state?.idx) {
    navigate(-1);
  } else {
    navigate('/', { replace: true });
  }

}
