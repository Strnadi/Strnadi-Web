import { useRegisterState } from "@/state/store";

export default function Register1() {

  const setName = useRegisterState(state => state.setName);
  const setSurname = useRegisterState(state => state.setSurname);
  const setNickname = useRegisterState(state => state.setNickname);
  const nextStage = useRegisterState(state => state.nextStage);

  const handleRegister = (formData: FormData) => {
    const name = formData.get("name");
    const surname = formData.get("surname");
    const nickname = formData.get("nickname");

    setName(name as string);
    setSurname(surname as string);
    setNickname(nickname as string);
    nextStage();
  };

  return (
    <div>
      <form className="flex flex-col" action={handleRegister}>
        <input name="name" type="text" placeholder="Jméno" />
        <input name="surname" type="text" placeholder="Příjmení" />
        <input name="nickname" type="text" placeholder="Přezdívka" />
        <button type="submit">Pokračovat</button>
      </form>
    </div>
  );
}
