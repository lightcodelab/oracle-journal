/**
 * Single place to configure the Home Screen migration window.
 *
 * During this window every signed-in member (who is not already running the
 * installed app from the new address) sees the gold "THE TEMPLE has a new home"
 * banner. After it passes, only the quiet "Keep THE TEMPLE close" install
 * prompt remains for eligible phones/tablets.
 */

/** End of the 6-week migration window (UTC ISO instant). */
export const MIGRATION_END_ISO = "2026-10-22T14:00:00.000Z";

/** True while the migration banner should still be shown. */
export function isWithinMigrationWindow(now: Date = new Date()): boolean {
  return now.getTime() < new Date(MIGRATION_END_ISO).getTime();
}
