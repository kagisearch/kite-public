import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
    PUBLIC_MAINTENANCE_START, 
    PUBLIC_MAINTENANCE_END, 
    PUBLIC_MAINTENANCE_AUTO,
    PUBLIC_MAINTENANCE_MODE 
} from '$env/static/public';

export const GET: RequestHandler = async () => {
    const now = new Date();
    const startTime = new Date(PUBLIC_MAINTENANCE_START || '2025-07-20T00:00:00Z');
    const endTime = new Date(PUBLIC_MAINTENANCE_END || '2025-07-20T14:00:00Z');
    
    let isActive = false;
    let progress = 0;
    let timeRemaining = '';
    let status = 'inactive';
    
    if (PUBLIC_MAINTENANCE_MODE === 'true') {
        if (now < startTime) {
            status = 'scheduled';
            progress = 0;
            timeRemaining = 'Starting soon...';
        } else if (now > endTime) {
            status = 'completed';
            progress = 100;
            timeRemaining = 'Finishing...';
        } else {
            status = 'active';
            isActive = true;
            const totalDuration = endTime.getTime() - startTime.getTime();
            const elapsed = now.getTime() - startTime.getTime();
            progress = Math.round((elapsed / totalDuration) * 100);
            
            const remaining = endTime.getTime() - now.getTime();
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                timeRemaining = `${hours}h ${minutes}m remaining`;
            } else if (minutes > 0) {
                timeRemaining = `${minutes}m remaining`;
            } else {
                timeRemaining = 'Completing...';
            }
        }
    }
    
    return json({
        currentTime: now.toISOString(),
        isActive,
        status,
        progress,
        timeRemaining,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        autoReload: PUBLIC_MAINTENANCE_AUTO === 'true'
    });
};


