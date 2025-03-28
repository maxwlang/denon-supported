import { Logger } from 'pino'
import { AsyncDeviceDiscovery, Sonos } from 'sonos'
import { SonosConfig } from './types'

export const getSonosDevice = async (
    sonosConfig: SonosConfig,
    logger: Logger
): Promise<Sonos | undefined> => {
    const discoveryService = new AsyncDeviceDiscovery()
    const sonosDevices = await discoveryService.discoverMultiple({
        timeout: sonosConfig.searchTimeout
    })

    const names = await Promise.all(
        sonosDevices.map(device => device.getName())
    )

    logger.debug(
        `Found ${sonosDevices.length} Sonos devices: ${names.join(', ')}`
    )

    for (const device of sonosDevices) {
        const deviceName = await device.getName()
        if (
            (sonosConfig.ip && device.host === sonosConfig.ip) ||
            (sonosConfig.name && deviceName === sonosConfig.name)
        ) {
            logger.info(`Found device: ${deviceName} (${device.host})`)
            return device
        }
    }
}

export const waitForSonosDevice = async (
    sonosConfig: SonosConfig,
    logger: Logger
): Promise<Sonos> => {
    let sonosDevice: Sonos | undefined
    logger.info(`Looking for Sonos device with name: ${sonosConfig.name}`)
    while (!sonosDevice) {
        sonosDevice = await getSonosDevice(sonosConfig, logger)
        if (!sonosDevice) {
            logger.warn('Sonos device not found, retrying...')
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    return sonosDevice
}
