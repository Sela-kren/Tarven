/**
 * The guest lists the tests were written against: who comes in each night, and when. The real nights (NIGHTS in
 * tavern.ts) are tuning, and change as the game is balanced; the tests check how things work (parties, drinking,
 * washing, brawls, touches), so they run on this fixed copy instead and don't break when the real nights are paced.
 */
import type { NightPlan } from "../../src/game/tavern";

type Arrival = NightPlan["guests"][number];
const arrive = (at: number, kind: Arrival["kind"], order: Arrival["order"], rumor = false, party?: number): Arrival => ({
  at,
  kind,
  order,
  rumor,
  party,
});

export const TEST_GUESTS: Arrival[][] = [
  [
    arrive(3, "farmer", "ale"),
    arrive(10, "soldier", "ale"),
    arrive(17, "farmer", "bread", false, 0),
    arrive(17, "farmer", "ale", false, 0),
    arrive(25, "smuggler", "ale", true),
    arrive(33, "fugitive", "bread"),
    arrive(42, "soldier", "bread"),
  ],
  [
    arrive(2, "farmer", "stew"),
    arrive(7, "soldier", "ale"),
    arrive(12, "smuggler", "stew"),
    arrive(17, "farmer", "bread"),
    arrive(23, "fugitive", "stew", true, 0),
    arrive(23, "smuggler", "ale", false, 0),
    arrive(29, "soldier", "ale", false, 1),
    arrive(29, "soldier", "bread", false, 1),
    arrive(35, "farmer", "ale"),
    arrive(41, "smuggler", "bread"),
    arrive(45, "adventurer", "ale", false, 2),
    arrive(45, "adventurer", "stew", false, 2),
    arrive(45, "adventurer", "bread", false, 2),
    arrive(45, "adventurer", "ale", false, 2),
    arrive(48, "soldier", "stew"),
  ],
  [
    arrive(2, "soldier", "ale"),
    arrive(6, "farmer", "stew"),
    arrive(10, "smuggler", "ale"),
    arrive(15, "farmer", "bread", true, 0),
    arrive(15, "farmer", "ale", false, 0),
    arrive(15, "smuggler", "stew", false, 0),
    arrive(20, "soldier", "stew"),
    arrive(24, "fugitive", "ale"),
    arrive(29, "smuggler", "stew"),
    arrive(31, "bandit", "ale", false, 2),
    arrive(31, "bandit", "ale", false, 2),
    arrive(34, "farmer", "ale"),
    arrive(38, "soldier", "bread", false, 1),
    arrive(38, "soldier", "ale", false, 1),
    arrive(43, "fugitive", "stew"),
    arrive(48, "farmer", "bread"),
    arrive(50, "noble", "stew", false, 3),
    arrive(50, "noble", "bread", false, 3),
    arrive(54, "smuggler", "ale"),
  ],
];
