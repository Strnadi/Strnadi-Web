import useAxios from "@/hooks/useAxios";
import { useAccount, useRegisterState } from "@/store";
import axios from "axios";
import http_status from "http-status";
import { Suspense, useState } from "react";
import { useNavigate } from "react-router";
import { useEffectOnce } from "react-use";

const env = import.meta.env;

export default function Register1() {

  const navigate = useNavigate();
  const registerInfo = useRegisterState();
  const resetStage = useRegisterState(state => state.resetStage);
  const setSession = useAccount(state => state.login);

  let isLoading, error, data: string | null;

  const register = () => (
    { loading: isLoading, error, data } = useAxios<string>(
      'post',
      `${env.VITE_API_URL}/auth/sign-up`,
      {
        email: registerInfo.email,
        password: registerInfo.password,
        nickname: registerInfo.nickname,
        firstName: registerInfo.name,
        lastName: registerInfo.surname,
        // todo: city, postal code
      }
    )
  )

  useEffectOnce(() => {
    register();
  })

  const onClick = () => {
    navigate("/");
    setSession(data);
    resetStage();      
  }

  if (isLoading) {
    return <p>Vytváření účtu...</p>;
  }

  if (error) {
    return (
      <div>
        <h1>Chyba</h1>
        <p>{error}</p>
        <button onClick={register}>Zkusit znovu</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Úspěch</h1>
      <h2>Váš účet byl založen.</h2>
      <button onClick={onClick}>Pokračovat</button>
    </div>
  );
}
