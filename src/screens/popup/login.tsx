import { useAccount } from "@/state/store";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PopupLayout from "@/layouts/layout-popup";
import { LoginRequest, Token } from "@/types/api/auth";
import { useMutation } from "@tanstack/react-query";
import { postLogin } from "@/api/account";
import { useEffectOnce } from "react-use";

const env = import.meta.env;

export default function Login() {
  const navigate = useNavigate();
  const login = useAccount(state => state.login);

  const [loginParams, setLoginParams] = useState<LoginRequest | null>(null);

  const mutation = useMutation({
    mutationFn: (loginInfo: LoginRequest) => postLogin(loginInfo),
    onSuccess: (data: Token) => {
      login(data);
      navigate('/');
    }
  })

  const handleLogin = (formData: FormData) => {
    const email = formData.get("mail") as string;
    const password = formData.get("pass") as string;
    mutation.mutate({ email, password })
  };

  return (
    <PopupLayout>
      <h1>Login</h1>

      <div className="flex flex-col items-center gap-y-4 w-full">
        {mutation.isPending && <div>Načítání...</div>}
        {mutation.error && <div>Chyba: {mutation.error.message}</div>}
        <form className="flex flex-col w-full" action={handleLogin}>
          <div className="flex flex-col gap-x-2 w-full">
            <input name="mail" type="email" placeholder="E-Mail" />
            <input name="pass" type="password" placeholder="Heslo" />
          </div>
          <button type="submit" disabled={mutation.isPending}>Přihlásit</button>
        </form>
        <button onClick={() => navigate("/auth/register")}>
          Nemáte ještě účet? Zaregistrujte se.
        </button>
      </div>
    </PopupLayout>
  );
}
