import { create } from "zustand";
import * as jose from "jose";

import { combine } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import { LatLng } from "leaflet";

const env = import.meta.env;

const useAccount = create(
  persist(
    combine(
      {
        token: null as string | null,
        user: null as {
          id: number,
          email: string,
          firstName: string,
          lastName: string,
          nickname: string,
          creationDate: string,
          consent: boolean,
          isEmailVerified: boolean,
          password: string,
          role: "user" | "admin",
          profilePicture: URL | null
        } | null
      },
      (set) => ({
        logout: () => set(() => ({ token: null })),
        login: async (jwt: string) => {
          if (!jwt) {
            return;
          }

          try {
            const response = await axios.get(`${env.VITE_API_URL}/users`, {
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            });

            set(() => ({ token: jose.decodeJwt(jwt) }));
            set(() => ({ user: response.data }));
  
          } catch (error) {
            console.log("Cannot fetch user info: ", error);
            return;
          }
        },
      })
    ),
    {
      name: "account-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

const useRegisterState = create(
  combine(
    {
      stage: 1,
      name: "",
      surname: "",
      nickname: "",
      email: "",
      password: "",
      postalCode: "",
      city: "",
    },
    (set) => ({
      resetStage: () => set(() => ({ stage: 1 })),
      nextStage: () => set(({ stage }) => ({ stage: stage + 1 })),
      setEmail: (email: string) => set(() => ({ email })),
      setName: (name: string) => set(() => ({ name })),
      setSurname: (surname: string) => set(() => ({ surname })),
      setNickname: (nickname: string) => set(() => ({ nickname })),
      setPassword: (password: string) => set(() => ({ password })),
      setPostalCode: (postalCode: string) => set(() => ({ postalCode })),
      setCity: (city: string) => set(() => ({ city })),
    })
  )
);

const useRecordingState = create(
  combine(
    {
      stage: 1,
      recordings: null as File[] | null,
      photos: null as File[] | null,
    },
    (set) => ({
      resetStage: () => set(() => ({ stage: 1 })),
      nextStage: () => set(({ stage }) => ({ stage: stage + 1 })),
      setRecordings: (recordings: File[]) => set(() => ({ recordings })),
      setPhotos: (photos: File[]) => set(() => ({ photos })),
    })
  )
);

const useMapState = create(
  combine(
    {
      selectedLocation: null as { lat: number, lng: number } | null
    },
    (set) => ({
      setSelectedLocation: (selectedLocation: LatLng) => set(() => ({ selectedLocation }))
    })
  )
)

export { useAccount, useRegisterState, useRecordingState, useMapState };
