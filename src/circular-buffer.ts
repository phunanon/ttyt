export class CircularBuffer<T> {
  readonly size: number;
  readonly buffer: T[];
  readonly set: Set<T>;
  index: number;
  constructor(size: number) {
    this.size = size;
    this.buffer = new Array<T>(size);
    this.set = new Set();
    this.index = 0;
  }

  add(value: T) {
    const oldValue = this.buffer[this.index]!;
    this.set.delete(oldValue);

    this.buffer[this.index] = value;
    this.set.add(value);

    this.index = (this.index + 1) % this.size;
  }

  has(value: T) {
    return this.set.has(value);
  }
}
