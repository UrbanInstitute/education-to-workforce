export function getOffset(dataIndex, dataLength, stateOnly) {
  // handle state cases
  if (stateOnly) {
    return 0;
  }
  // if there is an even number, it means we have two locations that share the same state
  // so the order goes geoid1, geoid2, state, national
  if (dataLength % 2 === 0) {
    return dataIndex % 3 > 0 ? -10 : 0;
  }
  // otherwise it goes geoid1, state1, geoid2, state2, national
  // or geoid1, state1, national
  return dataIndex % 2 === 0 ? 0 : -10;
}
