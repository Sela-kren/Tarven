/**
 * Runs before every test file: the nights' guest lists are swapped for the fixed ones the tests were written
 * against (fixtures/nights.ts), so pacing the real nights doesn't break the tests. Everything else about the
 * nights (parties, last calls) stays the real thing.
 */
import { crowdDice, grabDice, NIGHTS } from "../src/game/tavern";
import { TEST_GUESTS } from "./fixtures/nights";

NIGHTS.forEach((night, index) => {
  if (TEST_GUESTS[index]) night.guests = TEST_GUESTS[index].map((arrival) => ({ ...arrival }));
});

// ...and as written: nobody stays home or walks in on top, unless a test rolls the crowd itself.
crowdDice.roll = null;
// Nobody grabs her at the table either, unless a test rolls for it (tests/grab.test.ts).
grabDice.roll = null;
