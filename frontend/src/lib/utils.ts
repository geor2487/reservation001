export function validatePhone(phone: string): boolean {
  return /^0\d{9,10}$/.test(phone);
}

export function generateTimeOptions(endHour = 22): string[] {
  const options: string[] = [];
  for (let h = 17; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m < 30) continue;
      if (h === endHour && m > 0) break;
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return options;
}
