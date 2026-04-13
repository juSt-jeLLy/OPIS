export class TimedCache<T> {
  private readonly cache = new Map<string, { value: T; expiresAt: number }>();

  public get(key: string): T | undefined {
    const hit = this.cache.get(key);
    if (!hit || hit.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return hit.value;
  }

  public set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
