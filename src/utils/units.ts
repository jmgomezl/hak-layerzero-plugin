import Long from "long";

export const toUint256 = (value: string | number): Long =>
  typeof value === "string" ? Long.fromString(value) : Long.fromNumber(value);
