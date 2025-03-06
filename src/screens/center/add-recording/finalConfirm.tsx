import useAxios from "@/hooks/useAxios";
import { useAccount, useRecordingState, useRegisterState } from "@/state/store";
import http_status from "http-status";
import { Suspense, useState } from "react";
import { useNavigate } from "react-router";
import { useEffectOnce } from "react-use";

const env = import.meta.env;

export default function Register1() {

  const navigate = useNavigate();
  const resetStage = useRecordingState(state => state.resetStage);

  let isLoading, error, data: string | null;

  const submit = () => (
    { loading: isLoading, error, data } = useAxios<string>(
      'post',
      `${env.VITE_API_URL}/`,
      {
      }
    )
  )

  useEffectOnce(() => { submit() });

  const onClick = () => {
    navigate("/");
    resetStage();
  }

  if (isLoading) {
    return <p>Nahrávání vaší nahrávky...</p>;
  }

  if (error) {
    return (
      <div>
        <h1>Chyba</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Úspěch</h1>
      <h2>Vaše nahrávka byla uložena.</h2>
      <button onClick={onClick}>Pokračovat zpět</button>
    </div>
  );
}
