import useAxios from "@/hooks/useAxios";
import { useAccount, useRegisterState } from "@/store";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

const env = import.meta.env;

export default function Register1() {
  const navigate = useNavigate();
  const registerInfo = useRegisterState();
  const resetStage = useRegisterState(state => state.resetStage);
  const setSession = useAccount(state => state.login);
  const [shouldFetch, setShouldFetch] = useState(true);

  // Force re-fetch when shouldFetch changes
  const key = shouldFetch ? 'fetch' : 'idle';
  
  const { data, loading: isLoading, error } = useAxios<string>(
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
  );

  const onClick = () => {
    navigate("/");
    if (data) {
      setSession(data);
    }
    resetStage();      
  }

  const retryRegistration = () => {
    // Toggle to trigger a re-fetch
    setShouldFetch(prev => !prev);
  }

  if (isLoading) {
    return <p>Vytváření účtu...</p>;
  }

  if (error) {
    return (
      <div>
        <h1>Chyba</h1>
        <p>{error}</p>
        <button onClick={retryRegistration}>Zkusit znovu</button>
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
