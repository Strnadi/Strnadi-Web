import { useRegisterState } from "@/store";
import { useNavigate } from "react-router";

export default function Register1() {

  const nextStage = useRegisterState(state => state.nextStage);
  const setPostalCode = useRegisterState(state => state.setPostalCode);
  const setCity = useRegisterState(state => state.setCity);

  const handleRegister = (formData: FormData) => {
    const postalCode = formData.get("postalCode");
    const city = formData.get("city");

    setPostalCode(postalCode as string);
    setCity(city as string);

    nextStage();
  };

  return (
    <div>
      <h1>Kde se nacházíte?</h1>
      <form className="flex flex-col" action={handleRegister}>
        <input name="postalCode" type="number" placeholder="PSČ" />
        <input name="city" type="text" placeholder="Město" />
        <button type="submit">Pokračovat</button>
      </form>
    </div>
  );
}
