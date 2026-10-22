import {contactChannels} from '../content/contact-channels.mjs';

export function clientConfigScript({bookingMode='local', analyticsEnabled=false, messengers=contactChannels}={}) {
  const config = {bookingMode, analytics:{enabled:analyticsEnabled,metrikaId:95513342}, messengers};
  return '// Generated public configuration; messenger URLs come from content/contact-channels.mjs.\n'
    + `window.PREMIER_CONFIG = Object.freeze(${JSON.stringify(config)});\n`;
}
