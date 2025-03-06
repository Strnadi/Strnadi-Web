import { useAccount } from "@/store";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import PopupLayout from "@/layouts/layout-popup";
import useAxios from "@/hooks/useAxios";

const env = import.meta.env;

export default function Login() {
  const navigate = useNavigate();
  const login = useAccount(state => state.login);

  const [loginParams, setLoginParams] = useState<{ email: string; password: string } | null>(null);

  const { data, loading, error } = useAxios<string>(
    loginParams ? 'post' : null,
    `${env.VITE_API_URL}/auth/login`,
    loginParams
  );

  useEffect(() => {
    if (data) {
      login(data);
      navigate('/');
    }
  }, [data]);

  const handleLogin = (formData: FormData) => {
    const email = formData.get("mail") as string;
    const password = formData.get("pass") as string;
    setLoginParams({ email, password });
  };

  return (
    <PopupLayout>
      <h1>Login</h1>

      <div className="flex flex-col items-center gap-y-4 w-full">
        {loading && <div>Načítání...</div>}
        {error && <div>Chyba: {error}</div>}
        <form className="flex flex-col w-full" action={handleLogin}>
          <div className="flex flex-col gap-x-2 w-full">
            <input name="mail" type="email" placeholder="E-Mail" />
            <input name="pass" type="password" placeholder="Heslo" />
          </div>
          <button type="submit" disabled={loading}>Přihlásit</button>
        </form>
        <button onClick={() => navigate("/auth/register")} disabled={loading}>
          Nemáte ještě účet? Zaregistrujte se.
        </button>
      </div>
    </PopupLayout>
  );
}
