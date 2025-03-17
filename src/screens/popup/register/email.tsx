import { useRegisterState } from "@/state/store";
import { useNavigate } from "react-router";


import "@/styling/popups.css"

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
    <>
    <h1 className='text-2xl font-bold'>Zadejte váš e-mail</h1>
    <div className=" flex flex-col items-center gap-y-5 w-full">
      <form className="flex flex-col w-full gap-y-2" action={handleRegister}>
        <input name="email" type="email" placeholder="E-Mail" />
        <button className="primary p-2 m-2" type="submit">Pokračovat</button>
      </form>

      <button onClick={() => navigate("/auth/login")}>
        Máte již účet? Přihlašte se.
      </button>
    </div>
    </>

  );
}
