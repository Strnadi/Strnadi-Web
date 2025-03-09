import { create } from "zustand";
import * as jose from "jose";

import { combine } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import { LatLng } from "leaflet";
import { User } from "@/types/user";
import { getUser } from "@/api/account";

const env = import.meta.env;

const useAccount = create(
  persist(
    combine(
      {
        token_string: null as string | null,
        token: null as string | null,
        user: null as User | null
      },
      (set) => ({
        logout: () => set(() => ({ token: null })),
        login: async (jwt: string) => {
          if (!jwt) {
            return;
          }

          const user = await getUser(jwt);

          set(() => ({
            token: jose.decodeJwt(jwt),
            token_string: jwt,
            user: user
          }));
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
      location: null as LatLng | null,
      description: "",
      title: "",
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
