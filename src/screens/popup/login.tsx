import { useAccount } from "@/store";
import { useState } from "react";
import { useNavigate } from "react-router";
import http_status from "http-status";
import axios from "axios";
import PopupLayout from "@/layouts/layout-popup"

const env = import.meta.env;

export default function Login() {

  const navigate = useNavigate();
  const login = useAccount(state => state.login);

  const [error, setError] = useState("");


  const handleLogin = (formData: FormData) => {
    const email = formData.get("mail");
    const password = formData.get("pass");

    axios
      .post(`${env.VITE_API_URL}/auth/login`, { email, password })
      .then((res) => {
        login(res.data);
        navigate('/');
      })
      .catch((error) => {
        if (error.response) {
          setError(http_status[error.response.status]);
        } else {
          setError(error.code);
        }
      });
  }

  return (
    <PopupLayout>
      <h1>Login</h1>

      <div className="flex flex-col items-center gap-y-4 w-full">
      { error && <div>Chyba: {error}</div> }
      <form className="flex flex-col  w-full" action={handleLogin}>
        <div className="flex flex-col gap-x-2 w-full">
          <input name="mail" type="email" placeholder="E-Mail" />
          <input name="pass" type="password" placeholder="Heslo" />
        </div>
        <button type="submit">Přihlásit</button>
      </form>
      <button onClick={() => navigate("/auth/register")}>
        Nemáte ještě účet? Zaregistrujte se.
      </button>
    </div>
    </PopupLayout>
  );
}
