import {useState} from "react";
import http_status from "http-status";
import axios from "axios";
import type { Axios } from "axios";

export default function useAxios<T>(method: keyof Axios, ...params: any[]) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState<T | null>(null);

  axios[method](...params).then((res) => {
    setData(res.data);
    setLoading(false);
  }).catch((error) => {

    if (error.response) {
      setError(http_status[error.response.status]);
    } else {
      setError(error.code);
    }

    setLoading(false);
  });

  return { data, loading, error };
}
