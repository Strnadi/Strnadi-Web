import { postRegister } from "@/api/account";
import { useAccount, useRegisterState } from "@/state/store";
import { SignUpRequest } from "@/types/api/auth";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffectOnce } from "react-use";

export default function Register1() {
  const navigate = useNavigate();
  const registerInfo = useRegisterState();
  const resetStage = useRegisterState(state => state.resetStage);
  const setSession = useAccount(state => state.login);

  const mutation = useMutation({
    mutationFn: (registerInfo: SignUpRequest) => postRegister(registerInfo)
  })

  const register = () => mutation.mutate(registerInfo);

  useEffectOnce(() => {
    register();
  })

  const onClick = () => {
    navigate("/");
    resetStage();
    setSession(mutation.data!);
  }

  if (mutation.isPending) {
    return <p>Vytváření účtu...</p>;
  }

  if (mutation.error) {
    return (
      <div>
        <h1>Chyba</h1>
        <p>{mutation.error.message}</p>
        <button onClick={() => register}>Zkusit znovu</button>
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
