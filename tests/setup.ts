/**
 * Runs before every test file: the nights' guest lists are swapped for the fixed ones the tests were written
 * against (fixtures/nights.ts), so pacing the real nights doesn't break the tests. Everything else about the
 * nights (parties, last calls) stays the real thing.
 */
import { lanternDice } from "../src/game/lantern";
import { adultDice, crowdDice, grabDice, NIGHTS, showDice, storyRules, tableService } from "../src/game/tavern";
import { TEST_GUESTS } from "./fixtures/nights";

NIGHTS.forEach((night, index) => {
  if (TEST_GUESTS[index]) night.guests = TEST_GUESTS[index].map((arrival) => ({ ...arrival }));
});

// ...and as written: nobody stays home or walks in on top, unless a test rolls the crowd itself.
crowdDice.roll = null;
// Nobody grabs her at the table either, unless a test rolls for it (tests/grab.test.ts).
grabDice.roll = null;
// ...and guests say what they want as they sit, without waiting for her to take their order (tests/orders.test.ts).
tableService.takeOrders = false;
// Nor asks her for a look (tests/show.test.ts).
showDice.roll = null;
// Nor goes for adult play, unless a test rolls for it (tests/invite.test.ts).
adultDice.roll = null;
// ...and the nights go by number, as written, rather than by fans (tests/ledger.test.ts covers the story).
storyRules.beats = false;
// Nor asks for company on a lit Lantern night (tests/lantern.test.ts).
lanternDice.roll = null;
