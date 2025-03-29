import { Config } from './types'

const config: Config = {
    denon: {
        name: process.env['DENON_NAME'],
        sonosInterfaceSource:
            process.env['DENON_SONOS_INPUT_SOURCE']?.toUpperCase() || 'CD',
        ip: process.env['DENON_IP'],
        searchTimeout: parseInt(
            process.env['DENON_SEARCH_TIMEOUT'] || '100000'
        ),
        volumeMultiplier: parseFloat(
            process.env['DENON_VOLUME_MULTIPLIER'] || '1'
        )
    },
    sonos: {
        name: process.env['SONOS_NAME'],
        ip: process.env['SONOS_IP'],
        searchTimeout: process.env['SONOS_SEARCH_TIMEOUT']
            ? parseInt(process.env['SONOS_SEARCH_TIMEOUT'])
            : 5000,
        volumeMultiplier: parseFloat(
            process.env['SONOS_VOLUME_MULTIPLIER'] || '1'
        )
    },
    logger: {
        level: process.env['LOG_LEVEL'] || 'info'
    }
}

export default config
