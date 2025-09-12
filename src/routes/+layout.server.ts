import locales from "$lib/locales";
import type { LayoutServerLoad } from "./$types";
import { PUBLIC_MAINTENANCE_MODE, PUBLIC_MAINTENANCE_START, PUBLIC_MAINTENANCE_END, PUBLIC_MAINTENANCE_AUTO, PUBLIC_MAINTENANCE_MESSAGE } from '$env/static/public';

export const load: LayoutServerLoad = async () => {
  // In SvelteKit, PUBLIC_ env vars are available on both client and server
  
  const maintenanceMode = PUBLIC_MAINTENANCE_MODE === 'true';
  const maintenanceStart = PUBLIC_MAINTENANCE_START || '';
  const maintenanceEnd = PUBLIC_MAINTENANCE_END || '';
  const maintenanceAuto = PUBLIC_MAINTENANCE_AUTO === 'true';
  const maintenanceMessage = PUBLIC_MAINTENANCE_MESSAGE || '';
  
  // Determine final maintenance status
  let finalMaintenanceMode = maintenanceMode;
  
  // Check if we have start/end dates configured
  if (maintenanceStart && maintenanceEnd) {
    const now = new Date();
    const startTime = new Date(maintenanceStart);
    const endTime = new Date(maintenanceEnd);
    const hasStarted = now >= startTime;
    const hasEnded = now >= endTime;

    // If the entire maintenance window is already in the past, ignore dates entirely
    if (hasStarted && hasEnded) {
      // Treat as if no window exists – rely solely on manual toggle
      finalMaintenanceMode = maintenanceMode;
    } else if (maintenanceAuto) {
      // AUTO=true: Automatically start AND end based on dates
      finalMaintenanceMode = hasStarted && !hasEnded;
    } else {
      // AUTO=false: Start based on dates, but don't auto-end (manual control to end)
      if (hasStarted) {
        // Once started, stay in maintenance mode regardless of end time
        // Only manual intervention can end it
        finalMaintenanceMode = true;
      } else {
        // Before start time – use manual setting
        finalMaintenanceMode = maintenanceMode;
      }
    }
  }
  // If no dates configured, use manual MAINTENANCE_MODE setting
  
  // Load default English locale
  return {
    locale: "en",
    strings: locales.en,
    maintenanceMode: finalMaintenanceMode,
    maintenanceStart,
    maintenanceEnd,
    maintenanceAuto,
    maintenanceMessage
  };
};
