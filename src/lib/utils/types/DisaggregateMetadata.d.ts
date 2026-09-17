// A generative AI model wrote or edited portions of this file with the supervision of a human developer and careful human review.

type DisaggregateItem = {
  value: string;
  /** shown both as the chart row label and in the population panel — one form for both */
  label: string;
};

export type DisaggregateMetadata = {
  prefix: number;
  category_name: string;
  fields: Array<DisaggregateItem>;
};
