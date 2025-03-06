import { useRegisterState } from "@/state/store";
import { useNavigate } from "react-router";

export default function Register1() {

  const nextStage = useRegisterState(state => state.nextStage);
  const setEmail = useRegisterState(state => state.setEmail);

  const navigate = useNavigate();

  const handleRegister = (formData: FormData) => {
    const email = formData.get("email");
    setEmail(email as string);
    nextStage();
  };

  return (
    <div>
      <form className="flex flex-col" action={handleRegister}>
        <input name="email" type="email" placeholder="E-Mail" />
        <button type="submit">Pokračovat</button>
      </form>

      <button onClick={() => navigate("/auth/login")}>
        Máte již účet? Přihlašte se.
      </button>
    </div>
  );
}
