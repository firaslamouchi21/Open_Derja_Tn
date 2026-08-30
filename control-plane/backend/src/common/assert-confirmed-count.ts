import { BadRequestException } from '@nestjs/common';

export function assertConfirmedCount(actual: number, confirmed: number | undefined): void {
  if (confirmed === undefined || confirmed !== actual) {
    throw new BadRequestException(
      `This operation affects ${actual} row(s). Re-send with confirmCount set to exactly ${actual} to proceed.`,
    );
  }
}
