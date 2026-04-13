export const nowInSeconds = (): number => {
  return Math.floor(Date.now() / 1000);
};

export const hoursAgo = (hours: number): number => {
  return nowInSeconds() - Math.floor(hours * 3600);
};

export const minutesAgo = (minutes: number): number => {
  return nowInSeconds() - Math.floor(minutes * 60);
};

export const toUnixSeconds = (value: unknown): number => {
  if (typeof value === "number") {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const asNumber = Number.parseFloat(value);
    if (Number.isFinite(asNumber)) {
      return toUnixSeconds(asNumber);
    }

    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate)) {
      return Math.floor(asDate / 1000);
    }
  }

  return 0;
};
