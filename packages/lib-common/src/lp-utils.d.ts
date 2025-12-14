import { VestingSchedule } from './shared';
/**
 * Calculates the total vested amount (principal) accessible based on time elapsed.
 *
 * @param totalContribution - Initial USDC contribution
 * @param unlockSchedule - Array of vesting milestones
 * @param contributionDate - Date when contribution was made
 * @param now - Current date (defaults to new Date())
 * @returns Amount of USDC that has vested
 */
export declare function calculateVestedAmount(totalContribution: number, unlockSchedule: VestingSchedule[], contributionDate: Date | number, now?: Date): number;
//# sourceMappingURL=lp-utils.d.ts.map