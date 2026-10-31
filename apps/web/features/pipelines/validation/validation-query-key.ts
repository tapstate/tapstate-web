/** Auth-scoped clients receive distinct query identities; functions are not serialized into query keys. */
const identities = new WeakMap<object, number>()
let sequence = 0
export function validationClientKey(client: object): number {
  let value = identities.get(client)
  if (value === undefined) {
    value = ++sequence
    identities.set(client, value)
  }
  return value
}
