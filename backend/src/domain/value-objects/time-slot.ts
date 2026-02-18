export class TimeSlot {
  private constructor(
    public readonly startTime: string,
    public readonly endTime: string
  ) {}

  static create(startTime: string, endTime?: string): TimeSlot {
    const resolvedEndTime = endTime || TimeSlot.calculateEndTime(startTime);
    return new TimeSlot(startTime, resolvedEndTime);
  }

  private static calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endHours = hours + 2;
    return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
}
