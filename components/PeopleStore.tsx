"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import type { NewPersonInput, Person } from "@/lib/people";

type PersonRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

function fromRow(row: PersonRow): Person {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export type EnsurePeopleResult = {
  /** Lowercased name -> Person ID, for every requested name. */
  idsByName: Record<string, string>;
  /** Names that didn't already exist and were just created. */
  createdNames: string[];
};

type PeopleStore = {
  people: Person[];
  hydrated: boolean;
  addPerson: (input: NewPersonInput) => void;
  deletePerson: (id: string) => void;
  /** Resolves each name to a Person ID, matching existing people
   *  case-insensitively and creating any that don't exist yet. Used by the
   *  Obsidian sync to link notes to people by name. */
  ensurePeopleByName: (names: string[]) => Promise<EnsurePeopleResult>;
};

const PeopleContext = createContext<PeopleStore | null>(null);

function makeId() {
  return `person_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function PeopleStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const peopleRef = useRef(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  // Load this user's people from Supabase, then subscribe to row changes so
  // edits made on another device or tab show up here too.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPeople([]);
      setHydrated(false);
      return;
    }

    let active = true;
    setHydrated(false);

    supabase
      .from("people")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Failed to load people", error);
        } else if (data) {
          setPeople((data as PersonRow[]).map(fromRow));
        }
        setHydrated(true);
      });

    const channel = supabase
      .channel(`people:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "people",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setPeople((prev) => prev.filter((p) => p.id !== oldId));
            return;
          }
          const next = fromRow(payload.new as PersonRow);
          setPeople((prev) => {
            const idx = prev.findIndex((p) => p.id === next.id);
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addPerson = useCallback(
    (input: NewPersonInput) => {
      const person: Person = {
        id: makeId(),
        name: input.name.trim(),
        createdAt: new Date().toISOString(),
      };
      setPeople((prev) => [...prev, person]);
      if (user) {
        supabase
          .from("people")
          .insert({
            id: person.id,
            user_id: user.id,
            name: person.name,
            created_at: person.createdAt,
          })
          .then(({ error }) => {
            if (error) console.error("Failed to save person", error);
          });
      }
    },
    [user],
  );

  const deletePerson = useCallback(
    (id: string) => {
      setPeople((prev) => prev.filter((p) => p.id !== id));
      if (!user) return;
      supabase
        .from("people")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to delete person", error);
        });
    },
    [user],
  );

  const ensurePeopleByName = useCallback(
    async (names: string[]): Promise<EnsurePeopleResult> => {
      const idsByName: Record<string, string> = {};
      for (const person of peopleRef.current) {
        idsByName[person.name.toLowerCase()] = person.id;
      }

      const toCreate = Array.from(
        new Set(
          names
            .map((n) => n.trim())
            .filter((n) => n.length > 0 && !idsByName[n.toLowerCase()]),
        ),
      );
      if (toCreate.length === 0) return { idsByName, createdNames: [] };

      const created: Person[] = toCreate.map((name) => ({
        id: makeId(),
        name,
        createdAt: new Date().toISOString(),
      }));
      for (const person of created) {
        idsByName[person.name.toLowerCase()] = person.id;
      }

      setPeople((prev) => [...prev, ...created]);
      if (user) {
        const { error } = await supabase.from("people").insert(
          created.map((p) => ({
            id: p.id,
            user_id: user.id,
            name: p.name,
            created_at: p.createdAt,
          })),
        );
        if (error) console.error("Failed to save new people", error);
      }
      return { idsByName, createdNames: toCreate };
    },
    [user],
  );

  return (
    <PeopleContext.Provider
      value={{ people, hydrated, addPerson, deletePerson, ensurePeopleByName }}
    >
      {children}
    </PeopleContext.Provider>
  );
}

export function usePeople() {
  const ctx = useContext(PeopleContext);
  if (!ctx) {
    throw new Error("usePeople must be used within a PeopleStoreProvider");
  }
  return ctx;
}
