/** Matching result. */
export interface Match {
  /** Matched string. */
  term: string;
  /** Cosine similarity. */
  ratio: number;
}
/** Fuzzy string matcher. */
export class Matcher<A extends number> {
  /** Strings to match against. */
  terms: string[] = [];
  /** Magnitude of each string's n-grams. */
  private sizes: number[] = [];
  /** N-gram frequency in (bits 0-11) and index of (bits 12-31) its vectors. */
  private map = new Map<string, number[]>();
  /** Null byte prefix/suffix to favor a term's start/end. */
  private pad;
  /** Creates an empty set for a specific n-gram size. */
  constructor(private width: A, terms: string[]) {
    this.pad = "\0".repeat(width - 1);
    for (let z = 0; z < terms.length; ++z) this.add(terms[z]);
  }
  /** Creates a map of n-grams to their frequency (up to 4095). */
  private split($: string): Map<string, number> {
    const map = new Map(), pad = `${this.pad}${$}${this.pad}`;
    for (let z = this.width; z <= pad.length; ++z) {
      const gram = pad.slice(z - this.width, z);
      map.set(gram, Math.min((map.get(gram) ?? 0) + 1, 0xfff));
    }
    return map;
  }
  /** Adds a term to the set. */
  add($: string): this {
    if (this.terms.includes($)) return this;
    const index = this.terms.length << 12;
    let magnitude = 0;
    for (const [ngram, count] of this.split($)) {
      this.map.get(ngram)?.push(count | index) ??
        this.map.set(ngram, [count | index]);
      magnitude += count ** 2;
    }
    return this.terms.push($), this.sizes.push(magnitude ** 0.5), this;
  }
  /** Queries all terms with matching n-grams, sorted by cosine similarity. */
  get($: string): Match[] {
    const has = new Map<number, number>();
    let magnitude = 0, vectors, term, z;
    for (const [ngram, count] of this.split($)) {
      if (vectors = this.map.get(ngram)) {
        z = vectors.length;
        do has.set(
          term = vectors[--z] >>> 12,
          (has.get(term) ?? 0) + count * (vectors[z] & 0xfff),
        ); while (z);
      }
      magnitude += count ** 2;
    }
    magnitude **= 0.5;
    return Array.from(has, ([source, product]) => ({
      term: this.terms[source],
      ratio: product / magnitude / this.sizes[source],
    })).sort((one, two) => two.ratio - one.ratio);
  }
}
