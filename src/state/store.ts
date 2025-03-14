import { create } from "zustand";
import * as jose from "jose";

import { combine } from "zustand/middleware";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/api/types/auth";
import { getUser } from "@/api/account";
import { record } from "zod";

const env = import.meta.env;

type LatLng = {
  lat: number;
  lng: number;
};

const useAccount = create(
  persist(
    combine(
      {
        token_string: null as string | null,
        token: null as string | null,
        user: null as User | null,
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
            user: user,
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
      recordings: null as { recording: File; content: ArrayBuffer }[] | null,
      photos: null as File[] | null,
      location: null as LatLng | null,
      note: "" as string | null,
      title: "" as string | null,
      device: "" as string | null,
      birdCount: 1,
    },
    (set) => ({
      resetStage: () => set(() => ({ stage: 1 })),
      nextStage: () => set(({ stage }) => ({ stage: stage + 1 })),
      setPhotos: (photos: File[]) => set(() => ({ photos })),
      setBirdCount: (count: number) => set(() => ({ birdCount: count })),
      setLocation: (location: LatLng) => set(() => ({ location })),
      setNote: (note: string) => set(() => ({ note })),
      setTitle: (title: string) => set(() => ({ title })),
      setDevice: (device: string) => set(() => ({ device })),
      setRecordings: async (recordings: File[]) => {
        const recordingsWithContent = await Promise.all(
          recordings.map(async (recording) => {
            const content = await recording.arrayBuffer();
            return { recording, content };
          })
        );

        set(() => ({ recordings: recordingsWithContent }));
      },
    })
  )
);

const useMapState = create(
  combine(
    {
      selectedLocation: null as LatLng | null,
      mode: "outdoor" as "aerial" | "basic" | "outdoor",
    },
    (set) => ({
      setSelectedLocation: (selectedLocation: LatLng) =>
        set(() => ({ selectedLocation })),

      setMode: (mode: "aerial" | "basic" | "outdoor") => 
        set(() => ({ mode })),
    })
  )
);

export { useAccount, useRegisterState, useRecordingState, useMapState };
