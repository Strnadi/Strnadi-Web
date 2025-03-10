import { useRegisterState } from "@/state/store";

export default function Register1() {

  const nextStage = useRegisterState(state => state.nextStage);
  const setPassword = useRegisterState(state => state.setPassword);

  const handleRegister = (formData: FormData) => {
    const password = formData.get("password");
    const passwordAgain = formData.get("passwordAgain");

    if (password !== passwordAgain) {
      alert("Hesla se neshodují.");
      return;
    }

    setPassword(password as string);
    nextStage();
  };

  return (
    <div>
      <h1>Nastavte si heslo</h1>
      <form className="flex flex-col" action={handleRegister}>
        <input name="password" type="password" placeholder="Heslo" />
        <input name="passwordAgain" type="password" placeholder="Heslo znovu" />
        <button className="primary p-2 m-2" type="submit">Pokračovat</button>
      </form>
    </div>
  );
}
