import {contactChannels} from '../content/contact-channels.mjs';

// messengerPlaceholders: preview builds show Telegram/MAX buttons without a link until the clinic supplies one.
export function clientConfigScript({bookingMode='local', analyticsEnabled=false, messengers=contactChannels, messengerPlaceholders=true}={}) {
  const config = {bookingMode, analytics:{enabled:analyticsEnabled,metrikaId:95513342}, messengers, messengerPlaceholders};
  return '// Generated public configuration; messenger URLs come from content/contact-channels.mjs.\n'
    + `window.PREMIER_CONFIG = Object.freeze(${JSON.stringify(config)});\n`;
}
