type DisaggregateItem = {
  value: string,
  label: string
}

export type DisaggregateMetadata = {
  prefix: number,
  category_name: string,
  fields: Array<DisaggregateItem>
}
