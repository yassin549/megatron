import { PricingParams, VestingSchedule, DEFAULT_CONFIG } from './shared';

/**
 * Calculates the total vested amount (principal) accessible based on time elapsed.
 * 
 * @param totalContribution - Initial USDC contribution
 * @param unlockSchedule - Array of vesting milestones
 * @param contributionDate - Date when contribution was made
 * @param now - Current date (defaults to new Date())
 * @returns Amount of USDC that has vested
 */
export function calculateVestedAmount(
    totalContribution: number,
    unlockSchedule: VestingSchedule[],
    contributionDate: Date | number,
    now: Date = new Date()
): number {
    const start = new Date(contributionDate).getTime();
    const currentTime = now.getTime();

    // Find highest unlocked percentage
    let maxUnlockedPct = 0;

    // Schedule is typically defined in days from start
    // We iterate to find all milestones that have passed
    for (const milestone of unlockSchedule) {
        const milestoneTime = start + (milestone.days * 24 * 60 * 60 * 1000);

        if (currentTime >= milestoneTime) {
            maxUnlockedPct = Math.max(maxUnlockedPct, milestone.percentage);
        }
    }

    return totalContribution * (maxUnlockedPct / 100);
}
