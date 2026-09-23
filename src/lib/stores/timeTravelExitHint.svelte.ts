/**
 * UI hint state: when true, the time-travel pill in the header should pulse
 * a ring around itself to draw the user's eye. Set by the URL-banner's hover
 * handler so users who don't know how to exit time travel can find the
 * close affordance.
 */
export const timeTravelExitHint = $state({ active: false });
