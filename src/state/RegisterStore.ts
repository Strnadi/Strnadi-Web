import { reactive } from "vue";

export const registerStore = reactive({
  stage: 0,
  name: "",
  surname: "",
  nickname: "",
  email: "",
  password: "",
  postalCode: "",
  city: "",

  nextStage() {
    this.stage++;
  },

  prevStage() {
    if (this.stage > 0) {
      this.stage--;
    }
  },

  resetStage() {
    this.stage = 0;
  },

  setEmail(email: string) {
    this.email = email;
  },
  
  setName(name: string) {
    this.name = name;
  },
  
  setSurname(surname: string) {
    this.surname = surname;
  },
  
  setNickname(nickname: string) {
    this.nickname = nickname;
  },
  
  setPassword(password: string) {
    this.password = password;
  },
  
  setPostalCode(postalCode: string) {
    this.postalCode = postalCode;
  },
  
  setCity(city: string) {
    this.city = city;
  }

});
