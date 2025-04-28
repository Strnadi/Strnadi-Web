import { reactive } from "vue";

export const registerStore = reactive({
  stage: 0,
  name: "",
  surname: "",
  nickname: "",
  email: "",
  password: "",
  postCode: 0,
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

  setStage(stage: number) {
    this.stage = stage;
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
  
  setPostalCode(postalCode: number) {
    this.postCode = postalCode;
  },
  
  setCity(city: string) {
    this.city = city;
  },

  reset() {
    this.stage = 0;
    this.name = "";
    this.surname = "";
    this.nickname = "";
    this.email = "";
    this.password = "";
    this.postCode = 0;
    this.city = "";
  }

});
