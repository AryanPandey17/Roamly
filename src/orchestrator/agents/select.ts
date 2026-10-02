import type { FlightOption, HotelOption, PlaceOption, TripStateType } from "../state";

export const selectedFlight = (state: TripStateType): FlightOption | null =>
  state.flights.candidates.find((f) => f.id === state.flights.selectedId) ?? null;

export const selectedHotel = (state: TripStateType): HotelOption | null =>
  state.stay.candidates.find((h) => h.id === state.stay.selectedId) ?? null;

export const selectedActivities = (state: TripStateType): PlaceOption[] =>
  state.activities.selectedIds
    .map((id) => state.activities.candidates.find((p) => p.id === id))
    .filter((p): p is PlaceOption => Boolean(p));

/** The parsed request. Nodes after parse_request can rely on it. */
export function requestOf(state: TripStateType) {
  if (!state.request) throw new Error("request is not parsed yet");
  return state.request;
}

/** Keep earlier candidates and add new ones, newest version of an id winning. */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}
