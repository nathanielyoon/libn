import { bench } from "@libn/lib";
import { de_csv } from "./mod.ts";
import { inferSchema, initParser } from "udsv";
import parse from "csv-simple-parser";
import Papa from "papaparse";
import vectors from "./test/vectors.json" with { type: "json" };

const csv = vectors.mod.earthquakes;
bench({ group: "parse" }, {
  libn: () => de_csv(csv, { empty: { value: "" } }),
  udsv: () =>
    initParser(inferSchema(csv, { header: () => [] })).stringArrs(csv),
  simple: () => parse(csv),
  papa: () => Papa.parse(csv).data,
});
